use anyhow::{Result, anyhow};
use async_trait::async_trait;
use crate::models::AudioQuality;
use super::AudioProvider;
use reqwest::Client;
use serde_json::Value;
use std::fs::File;
use std::io::Write;
use regex::Regex;

use crate::progress::{ProgressManager, ProgressReporter};
use std::sync::Arc;

pub struct AmazonProvider {
    client: Client,
}

impl AmazonProvider {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(120))
                .build()
                .unwrap(),
        }
    }

    fn extract_asin(url: &str) -> Option<String> {
        let re = Regex::new(r"(B[0-9A-Z]{9})").unwrap();
        re.find(url).map(|m| m.as_str().to_string())
    }
}

#[async_trait]
impl AudioProvider for AmazonProvider {
    fn name(&self) -> &str { "Amazon" }

    async fn get_download_url(&self, amazon_link: &str, _quality: AudioQuality) -> Result<String> {
        let asin = Self::extract_asin(amazon_link)
            .ok_or_else(|| anyhow!("Could not extract ASIN from Amazon URL: {}", amazon_link))?;

        let api_url = format!("https://amzn.afkarxyz.qzz.io/api/track/{}", asin);
        let resp = self.client.get(&api_url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36")
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Amazon Mirror API Error: {}", resp.status()));
        }

        let body: Value = resp.json().await?;
        let stream_url = body.get("streamUrl").and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("No streamUrl found for Amazon track"))?;
        
        let key = body.get("decryptionKey").and_then(|v| v.as_str()).unwrap_or("");

        if !key.is_empty() {
             Ok(format!("DECRYPT:{}:::{}", stream_url, key))
        } else {
             Ok(stream_url.to_string())
        }
    }

    async fn download_track(&self, encoded_url: &str, path: &str, progress: Arc<ProgressManager>, item_id: &str) -> Result<()> {
        let mut reporter = ProgressReporter::new(progress, item_id.to_string());
        
        let (url, _key) = if encoded_url.starts_with("DECRYPT:") {
            let parts: Vec<&str> = encoded_url[8..].split(":::").collect();
            (parts[0], Some(parts[1]))
        } else {
            (encoded_url, None)
        };

        let mut resp = self.client.get(url).send().await?;
        let mut file = File::create(path)?;
        while let Some(chunk) = resp.chunk().await? {
            reporter.update(chunk.len() as u64);
            file.write_all(&chunk)?;
        }
        
        // Note: Decryption is done in the orchestration phase using FFmpeg::decrypt_and_convert
        Ok(())
    }
}
