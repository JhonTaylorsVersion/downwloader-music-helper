use anyhow::{Result, anyhow};
use crate::models::{TrackMetadata, AudioQuality};
use std::time::Duration;
use serde_json::Value;

pub mod cache;
pub mod resolvers;
pub mod spotify_id;
pub mod totp;

pub use resolvers::songlink::SongLinkResolver;
pub use resolvers::songstats::SongStatsResolver;
pub use resolvers::soundplate::SoundPlateResolver;
pub use cache::ISRCCache;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct ResolvedLinks {
    pub isrc: String,
    pub tidal_id: Option<String>,
    pub tidal_url: Option<String>,
    pub amazon_url: Option<String>,
}

pub struct LinkResolver {
    client: reqwest::Client,
    pub songstats: SongStatsResolver,
    pub soundplate: SoundPlateResolver,
    pub songlink: SongLinkResolver,
    pub cache: Option<Arc<ISRCCache>>,
}

impl LinkResolver {
    pub fn new(cache: Option<Arc<ISRCCache>>) -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap(),
            songstats: SongStatsResolver::new(),
            soundplate: SoundPlateResolver::new(),
            songlink: SongLinkResolver::new(),
            cache,
        }
    }

    /// Resolves a Spotify link to ISRC and other platform IDs via SongLink and secondary resolvers.
    pub async fn resolve_links(&self, spotify_url: &str) -> Result<ResolvedLinks> {
        let clean_url = spotify_url.split('?').next().unwrap_or(spotify_url);
        let (_, spotify_id) = spotify_id::parse_spotify_url(clean_url)?;

        // 0. Check Cache first
        let mut isrc = String::new();
        if let Some(c) = &self.cache {
            if let Ok(Some(cached_isrc)) = c.get(&spotify_id) {
                println!("DEBUG: ISRC encontrado en cache -> {}", cached_isrc);
                isrc = cached_isrc;
            }
        }
        
        // 1. Resolve ISRC if not in cache (Spotify -> SoundPlate fallback)
        if isrc.is_empty() {
             isrc = self.resolve_isrc_spclient(spotify_url).await.unwrap_or_default();
             if isrc.is_empty() {
                  println!("DEBUG: Spotify ISRC failed, trying SoundPlate...");
                  if let Ok(s_isrc) = self.soundplate.resolve_isrc(clean_url).await {
                      isrc = s_isrc;
                  }
             }
        }

        // 2. Resolve Platform Links via SongLink (Tidal, Amazon, Deezer)
        let primary_region = if clean_url.contains("/intl-es/") { "ES" } else { "US" };
        let regions = vec![Some(primary_region), Some("US"), Some("ES"), Some("GB"), None];

        let mut tidal_url = None;
        let mut amazon_url = None;
        let mut deezer_url = None;

        for region in regions {
            if (tidal_url.is_some() || amazon_url.is_some()) && !isrc.is_empty() { break; }

            if let Ok(data) = self.songlink.resolve_from_spotify(clean_url, region).await {
                if isrc.is_empty() { isrc = data.isrc.unwrap_or_default(); }
                if tidal_url.is_none() { tidal_url = data.tidal_url; }
                if amazon_url.is_none() { amazon_url = data.amazon_url; }
                if deezer_url.is_none() { deezer_url = data.deezer_url; }
            }
        }

        // 3. Fallbacks for ISRC (Deezer lookup)
        if isrc.is_empty() && deezer_url.is_some() {
            if let Ok(d_isrc) = self.songlink.get_deezer_isrc(deezer_url.as_ref().unwrap()).await {
                isrc = d_isrc;
            }
        }

        // 4. Save to cache if found
        if !isrc.is_empty() {
            if let Some(c) = &self.cache {
                let _ = c.put(&spotify_id, &isrc);
            }
        }

        // 5. SECONDARY RESOLVERS: If SongLink missed something, use SongStats
        if (tidal_url.is_none() || amazon_url.is_none()) && !isrc.is_empty() {
            println!("DEBUG: Missing links in SongLink, trying SongStats for ISRC {}...", isrc);
            if let Ok(ss_links) = self.songstats.resolve_links(&isrc).await {
                if tidal_url.is_none() { tidal_url = ss_links.tidal_url; }
                if amazon_url.is_none() { amazon_url = ss_links.amazon_url; }
            }
        }

        let mut tidal_id = None;
        if let Some(t_url) = &tidal_url {
            if let Some(idx) = t_url.find("/track/") {
                tidal_id = Some(t_url[idx+7..].split('?').next().unwrap_or(&t_url[idx+7..]).to_string());
            }
        }

        if isrc.is_empty() { isrc = "UNKNOWN".to_string(); }

        Ok(ResolvedLinks { 
            isrc, 
            tidal_id, 
            tidal_url, 
            amazon_url 
        })
    }

    async fn resolve_isrc_spclient(&self, spotify_url: &str) -> Result<String> {
        let (_entity_type, id) = spotify_id::parse_spotify_url(spotify_url)?;
        let gid = spotify_id::spotify_id_to_gid(&id)?;
        let token = self.get_anonymous_token().await?;

        let metadata_url = format!("https://spclient.wg.spotify.com/metadata/4/track/{}", gid);
        
        let response = self.client.get(&metadata_url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Accept", "application/json")
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Internal Spotify API failed"));
        }

        let body: Value = response.json().await?;
        if let Some(external_ids) = body.get("external_id") {
            if let Some(ids_array) = external_ids.as_array() {
                for entry in ids_array {
                    if entry.get("type").and_then(|v| v.as_str()) == Some("isrc") {
                        if let Some(isrc) = entry.get("id").and_then(|v| v.as_str()) {
                            return Ok(isrc.to_string());
                        }
                    }
                }
            }
        }

        Err(anyhow!("ISRC not found in metadata"))
    }

    pub async fn get_anonymous_token(&self) -> Result<String> {
        let (totp_code, version) = totp::generate_spotify_totp()?;
        let token_url = format!("https://open.spotify.com/api/token?reason=init&productType=web-player&totp={}&totpVer={}&totpServer={}", 
            totp_code, version, totp_code);

        let response = self.client.get(&token_url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36")
            .send()
            .await?;

        let data: Value = response.json().await?;
        let token = data.get("accessToken")
            .and_then(|t| t.as_str())
            .ok_or_else(|| anyhow!("Token not found"))?;

        Ok(token.to_string())
    }
}
