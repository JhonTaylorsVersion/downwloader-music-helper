use anyhow::{anyhow, Result};
use lazy_static::lazy_static;
use reqwest::Client;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const UNIFIED_STATUS_API_URL: &str = "https://api-status.afkarxyz.qzz.io/api/status/spotiflac/";
const CACHE_TTL: Duration = Duration::from_secs(5);

struct StatusCache {
    body: String,
    expiry: Instant,
}

lazy_static! {
    static ref STATUS_CACHE: Mutex<Option<StatusCache>> = Mutex::new(None);
}

pub struct UnifiedStatusResolver;

impl UnifiedStatusResolver {
    pub async fn fetch_status_payload(force_refresh: bool) -> Result<String> {
        if !force_refresh {
            let cache = STATUS_CACHE.lock().unwrap();
            if let Some(c) = &*cache {
                if Instant::now() < c.expiry {
                    return Ok(c.body.clone());
                }
            }
        }

        let client = Client::builder().timeout(Duration::from_secs(10)).build()?;

        let mut last_error = anyhow!("Unknown error");
        for attempt in 1..=3 {
            match Self::perform_fetch(&client).await {
                Ok(payload) => {
                    let mut cache = STATUS_CACHE.lock().unwrap();
                    *cache = Some(StatusCache {
                        body: payload.clone(),
                        expiry: Instant::now() + CACHE_TTL,
                    });
                    return Ok(payload);
                }
                Err(e) => {
                    last_error = e;
                    if attempt < 3 {
                        tokio::time::sleep(Duration::from_secs(1)).await;
                    }
                }
            }
        }

        Err(anyhow!(
            "Unified status API failed after 3 retries: {}",
            last_error
        ))
    }

    async fn perform_fetch(client: &Client) -> Result<String> {
        let resp = client.get(UNIFIED_STATUS_API_URL)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36")
            .header("Accept", "application/json")
            .send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            let preview = if body.len() > 200 {
                &body[..200]
            } else {
                &body
            };
            return Err(anyhow!("returned status {} ({})", status, preview));
        }

        let body = resp.text().await?.trim().to_string();
        if body.is_empty() {
            return Err(anyhow!("empty response body"));
        }

        Ok(body)
    }
}
