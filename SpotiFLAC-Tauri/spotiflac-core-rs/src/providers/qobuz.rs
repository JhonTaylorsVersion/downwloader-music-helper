use anyhow::{Result, anyhow};
use async_trait::async_trait;
use crate::models::AudioQuality;
use super::AudioProvider;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::collections::HashMap;
use md5;
use regex::Regex;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{SystemTime, UNIX_EPOCH, Duration};

use crate::progress::{ProgressManager, ProgressReporter};
use crate::storage::MirrorManager;

const PROBE_URL: &str = "https://open.qobuz.com/track/1";
const DEFAULT_APP_ID: &str = "712109809";
const DEFAULT_APP_SECRET: &str = "589be88e4538daea11f509d29e4a23b1";
const CREDENTIALS_FILE: &str = "qobuz-api-credentials.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct QobuzCredentials {
    pub app_id: String,
    pub app_secret: String,
    pub fetched_at: u64,
}

pub struct QobuzProvider {
    client: Client,
    creds: Arc<RwLock<Option<QobuzCredentials>>>,
    mirrors: Arc<MirrorManager>,
}

impl QobuzProvider {
    pub fn new(mirrors: Arc<MirrorManager>) -> Self {
        let creds = Self::load_cached_credentials();
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(20))
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36")
                .build()
                .unwrap(),
            creds: Arc::new(RwLock::new(creds)),
            mirrors,
        }
    }

    fn get_cache_path() -> std::path::PathBuf {
        dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from(".")).join(".spotiflac").join(CREDENTIALS_FILE)
    }

    fn load_cached_credentials() -> Option<QobuzCredentials> {
        let path = Self::get_cache_path();
        if let Ok(mut file) = File::open(path) {
            let mut content = String::new();
            if file.read_to_string(&mut content).is_ok() {
                if let Ok(creds) = serde_json::from_str::<QobuzCredentials>(&content) {
                    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
                    if now - creds.fetched_at < 86400 { // 24h TTL
                        return Some(creds);
                    }
                }
            }
        }
        None
    }

    fn save_credentials(creds: &QobuzCredentials) {
        let path = Self::get_cache_path();
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(mut file) = File::create(path) {
            if let Ok(content) = serde_json::to_string_pretty(creds) {
                let _ = file.write_all(content.as_bytes());
            }
        }
    }

    async fn get_valid_credentials(&self, force_refresh: bool) -> Result<QobuzCredentials> {
        if !force_refresh {
            let creds_lock = self.creds.read().await;
            if let Some(c) = &*creds_lock {
                return Ok(c.clone());
            }
        }

        // Need to fetch
        println!("🔄 Fetching fresh Qobuz credentials...");
        match self.scrape_credentials().await {
            Ok(c) => {
                let mut creds_lock = self.creds.write().await;
                *creds_lock = Some(c.clone());
                Self::save_credentials(&c);
                Ok(c)
            }
            Err(e) => {
                println!("⚠️ Failed to scrape Qobuz credentials: {}. Using fallback.", e);
                Ok(QobuzCredentials {
                    app_id: DEFAULT_APP_ID.to_string(),
                    app_secret: DEFAULT_APP_SECRET.to_string(),
                    fetched_at: 0,
                })
            }
        }
    }

    async fn scrape_credentials(&self) -> Result<QobuzCredentials> {
        let shell_html = self.client.get(PROBE_URL).send().await?.text().await?;
        
        let bundle_re = Regex::new(r#"<script[^>]+src="([^"]+/js/main\.js|/resources/[^"]+/js/main\.js)""#)?;
        let bundle_path = bundle_re.captures(&shell_html)
            .and_then(|c| c.get(1))
            .ok_or_else(|| anyhow!("Qobuz bundle JS not found"))?
            .as_str();

        let bundle_url = if bundle_path.starts_with('/') {
            format!("https://open.qobuz.com{}", bundle_path)
        } else {
            bundle_path.to_string()
        };

        let bundle_js = self.client.get(&bundle_url).send().await?.text().await?;
        
        let config_re = Regex::new(r#"app_id:"(\d{9})",app_secret:"([a-f0-9]{32})""#)?;
        let caps = config_re.captures(&bundle_js)
            .ok_or_else(|| anyhow!("Qobuz app_id/secret not found in JS bundle"))?;

        Ok(QobuzCredentials {
            app_id: caps.get(1).unwrap().as_str().to_string(),
            app_secret: caps.get(2).unwrap().as_str().to_string(),
            fetched_at: SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs(),
        })
    }

    fn generate_signature(&self, path: &str, params: &HashMap<String, String>, timestamp: &str, secret: &str) -> String {
        let normalized_path = path.trim_matches('/').replace("/", "");
        
        let mut keys: Vec<&String> = params.keys().collect();
        keys.sort();

        let mut sig_payload = normalized_path;
        for key in keys {
            if key == "app_id" || key == "request_ts" || key == "request_sig" {
                continue;
            }
            sig_payload.push_str(key);
            sig_payload.push_str(&params[key]);
        }
        
        sig_payload.push_str(timestamp);
        sig_payload.push_str(secret);

        let digest = md5::compute(sig_payload.as_bytes());
        format!("{:x}", digest)
    }

    async fn search_qobuz_id_from_isrc(&self, isrc: &str, force_refresh_creds: bool) -> Result<i64> {
        let creds = self.get_valid_credentials(force_refresh_creds).await?;
        
        let mut params = HashMap::new();
        params.insert("query".to_string(), isrc.to_string());
        params.insert("limit".to_string(), "1".to_string());
        
        let timestamp = format!("{}", SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs());
        let sig = self.generate_signature("track/search", &params, &timestamp, &creds.app_secret);
        
        let url = "https://www.qobuz.com/api.json/0.2/track/search";
        let resp = self.client.get(url)
            .query(&params)
            .query(&[
                ("app_id", &creds.app_id),
                ("request_ts", &timestamp),
                ("request_sig", &sig),
            ])
            .send()
            .await?;

        if resp.status() == reqwest::StatusCode::UNAUTHORIZED || resp.status() == reqwest::StatusCode::BAD_REQUEST {
            if !force_refresh_creds {
                return Box::pin(self.search_qobuz_id_from_isrc(isrc, true)).await;
            }
        }

        if !resp.status().is_success() {
            return Err(anyhow!("Qobuz API returned {}", resp.status()));
        }

        let body: serde_json::Value = resp.json().await?;
        body.pointer("/tracks/items/0/id")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| anyhow!("Track not found on Qobuz for ISRC: {}", isrc))
    }

    async fn try_standard_apis(&self, track_id: i64, quality: &str) -> Result<String> {
        let apis = vec![
            "https://dab.yeet.su/api/stream?trackId=".to_string(),
            "https://dabmusic.xyz/api/stream?trackId=".to_string(),
            "https://qbz.afkarxyz.qzz.io/api/track/".to_string(),
        ];

        let sorted_apis = self.mirrors.prioritize("qobuz", apis);
        let mut last_err = anyhow!("All Qobuz mirrors failed");

        for api in sorted_apis {
            let url = if api.contains("qbz.afkarxyz.qzz.io") {
                format!("{}{}/?quality={}", api, track_id, quality)
            } else {
                format!("{}{}&quality={}", api, track_id, quality)
            };

            match self.client.get(&url).send().await {
                Ok(resp) if resp.status().is_success() => {
                    let data: serde_json::Value = resp.json().await?;
                    let stream_url = data.get("url").and_then(|v| v.as_str())
                        .or_else(|| data.pointer("/data/url").and_then(|v| v.as_str()));
                    
                    if let Some(u) = stream_url {
                        self.mirrors.record_outcome("qobuz", &api, true);
                        return Ok(u.to_string());
                    }
                    last_err = anyhow!("No stream URL in JSON response from {}", api);
                },
                Ok(resp) => {
                    self.mirrors.record_outcome("qobuz", &api, false);
                    last_err = anyhow!("Mirror {} returned {}", api, resp.status());
                },
                Err(e) => {
                    self.mirrors.record_outcome("qobuz", &api, false);
                    last_err = e.into();
                }
            }
        }

        Err(last_err)
    }
}

#[async_trait]
impl AudioProvider for QobuzProvider {
    fn name(&self) -> &str { "Qobuz" }

    async fn get_download_url(&self, isrc: &str, quality: AudioQuality) -> Result<String> {
        let track_id = self.search_qobuz_id_from_isrc(isrc, false).await?;
        
        let initial_quality = match quality {
            AudioQuality::HiRes => "27",
            AudioQuality::Lossless => "6",
            AudioQuality::Low => "5",
        };

        let fallback_chain = if initial_quality == "27" {
            vec!["27", "7", "6"]
        } else if initial_quality == "7" {
            vec!["7", "6"]
        } else {
            vec![initial_quality]
        };

        for q_code in fallback_chain {
            if let Ok(url) = self.try_standard_apis(track_id, q_code).await {
                return Ok(url);
            }
        }

        Err(anyhow!("No Qobuz mirrors or fallbacks yielded a valid download URL"))
    }

    async fn download_track(&self, url: &str, path: &str, progress: Arc<ProgressManager>, item_id: &str) -> Result<()> {
        let mut reporter = ProgressReporter::new(progress, item_id.to_string());
        let mut resp = self.client.get(url).send().await?;
        
        if !resp.status().is_success() {
             return Err(anyhow!("Qobuz download failed: status {}", resp.status()));
        }

        let mut file = File::create(path)?;
        while let Some(chunk) = resp.chunk().await? {
            reporter.update(chunk.len() as u64);
            file.write_all(&chunk)?;
        }
        Ok(())
    }
}
