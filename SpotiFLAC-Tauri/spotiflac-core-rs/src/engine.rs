use anyhow::{Result, anyhow};
use crate::models::{AppConfig, TrackMetadata, AudioQuality};
use crate::providers::{AudioProvider, tidal::TidalProvider, qobuz::QobuzProvider, amazon::AmazonProvider};
use crate::metadata::tagger::Tagger;
use crate::metadata::spotify::SpotifyMetadataClient;
use crate::metadata::lyrics::LyricsClient;
use crate::metadata::musicbrainz::MusicBrainzClient;
use crate::isrc::LinkResolver;
use crate::storage::{HistoryManager, HistoryItem, MirrorManager, ProviderPriorityManager};
use crate::utils::ffmpeg::FFmpeg;
use crate::utils::filename::FilenameBuilder;
use crate::progress::ProgressManager;
use std::path::PathBuf;
use std::sync::Arc;

pub struct SpotiFLACEngine {
    spotify: SpotifyMetadataClient,
    resolver: LinkResolver,
    tidal: TidalProvider,
    qobuz: QobuzProvider,
    amazon: AmazonProvider,
    lyrics: LyricsClient,
    mb: MusicBrainzClient,
    history: Option<HistoryManager>,
    pub mirrors: Arc<MirrorManager>,
    pub provider_priority: Arc<ProviderPriorityManager>,
    pub progress: Arc<ProgressManager>,
    pub assets: crate::utils::assets::AssetsDownloader,
}

impl SpotiFLACEngine {
    pub fn new(db_path: Option<PathBuf>) -> Self {
        let history = db_path.clone().and_then(|p| HistoryManager::new(p).ok());
        let mirror_db = db_path.clone().map(|mut p| { p.set_file_name("mirrors.db"); p });
        let mirrors = Arc::new(MirrorManager::new(mirror_db));
        
        let priority_db = db_path.clone().map(|mut p| { p.set_file_name("provider_priority.db"); p });
        let provider_priority = Arc::new(ProviderPriorityManager::new(priority_db.unwrap_or_else(|| PathBuf::from("provider_priority.db"))).expect("Failed to open priority DB"));

        let isrc_db = db_path.map(|mut p| { p.set_file_name("isrc_cache.db"); p });
        let isrc_cache = isrc_db.and_then(|p| crate::isrc::ISRCCache::new(p).ok()).map(Arc::new);
        
        Self {
            spotify: SpotifyMetadataClient::new(),
            resolver: LinkResolver::new(isrc_cache),
            tidal: TidalProvider::new(mirrors.clone()),
            qobuz: QobuzProvider::new(mirrors.clone()),
            amazon: AmazonProvider::new(),
            lyrics: LyricsClient::new(),
            mb: MusicBrainzClient::new(),
            history,
            mirrors,
            provider_priority,
            progress: Arc::new(ProgressManager::new()),
            assets: crate::utils::assets::AssetsDownloader::new(),
        }
    }

    pub async fn download_track(&self, url: &str, config: &AppConfig, tidal_id_override: Option<String>) -> Result<PathBuf> {
        // 0. Ensure FFmpeg binaries
        crate::utils::ffmpeg_downloader::FFmpegDownloader::ensure_binaries().await?;

        // 1. Fetch Basic Metadata from Spotify
        let (mut metadata, _first_artist_id) = self.spotify.fetch_track_info_enriched(url).await?;
        
        // Add to progress queue
        self.progress.add_to_queue(
            metadata.id.clone(),
            metadata.title.clone(),
            metadata.artist.clone(),
            metadata.album.clone(),
            metadata.id.clone()
        );
        
        // 2. Resolve IDs
        let resolved = self.resolver.resolve_links(url).await?;
        metadata.isrc = Some(resolved.isrc.clone());
        let isrc = &resolved.isrc;

        if let Some(h) = &self.history {
             if let Some(path) = h.is_already_downloaded(&metadata.id) {
                 println!("ℹ️ Pista ya descargada anteriormente en: {} (Saltando...)", path);
                 return Ok(std::path::PathBuf::from(path));
             }
        }

        println!("DEBUG: ISRC Resolvido -> {}", isrc);

        // 3. PRIORITIZE PROVIDERS (Tidal, Qobuz, Amazon)
        let providers_to_try = vec!["Tidal".to_string(), "Qobuz".to_string(), "Amazon".to_string()];
        let prioritized = self.provider_priority.prioritize_providers("spotify", providers_to_try);

        let mut last_error = anyhow!("Todos los proveedores fallaron");

        for provider_name in prioritized {
            match provider_name.as_str() {
                "Tidal" => {
                    let query_id = tidal_id_override.clone().or(resolved.tidal_id.clone()).unwrap_or_else(|| isrc.clone());
                    match self.tidal.get_download_url(&query_id, config.download_quality.clone()).await {
                        Ok(dl_info) => {
                            match self.perform_download_sequence(&dl_info, &query_id, &metadata, config, &self.tidal).await {
                                Ok(path) => {
                                    let _ = self.provider_priority.record_outcome("spotify", "Tidal", true);
                                    return Ok(path);
                                },
                                Err(e) => { 
                                    let _ = self.provider_priority.record_outcome("spotify", "Tidal", false);
                                    println!("⚠️ Tidal falló: {}", e); 
                                    last_error = e; 
                                }
                            }
                        },
                        Err(e) => { 
                            let _ = self.provider_priority.record_outcome("spotify", "Tidal", false);
                            println!("⚠️ Tidal (Búsqueda) falló: {}", e); 
                            last_error = e; 
                        }
                    }
                },
                "Qobuz" => {
                    match self.qobuz.get_download_url(isrc, config.download_quality.clone()).await {
                        Ok(dl_info) => {
                            match self.perform_download_sequence(&dl_info, isrc, &metadata, config, &self.qobuz).await {
                                Ok(path) => {
                                    let _ = self.provider_priority.record_outcome("spotify", "Qobuz", true);
                                    return Ok(path);
                                },
                                Err(e) => { 
                                    let _ = self.provider_priority.record_outcome("spotify", "Qobuz", false);
                                    println!("⚠️ Qobuz falló: {}", e); 
                                    last_error = e; 
                                }
                            }
                        },
                        Err(e) => { 
                            let _ = self.provider_priority.record_outcome("spotify", "Qobuz", false);
                            println!("⚠️ Qobuz (Búsqueda) falló: {}", e); 
                            last_error = e; 
                        }
                    }
                },
                "Amazon" => {
                    match self.amazon.get_download_url(isrc, config.download_quality.clone()).await {
                        Ok(dl_info) => {
                            match self.perform_download_sequence(&dl_info, isrc, &metadata, config, &self.amazon).await {
                                Ok(path) => {
                                    let _ = self.provider_priority.record_outcome("spotify", "Amazon", true);
                                    return Ok(path);
                                },
                                Err(e) => { 
                                    let _ = self.provider_priority.record_outcome("spotify", "Amazon", false);
                                    println!("⚠️ Amazon falló: {}", e); 
                                    last_error = e; 
                                }
                            }
                        },
                        Err(e) => { 
                            let _ = self.provider_priority.record_outcome("spotify", "Amazon", false);
                            println!("⚠️ Amazon (Búsqueda) falló: {}", e); 
                            last_error = e; 
                        }
                    }
                },
                _ => {}
            }
        }

        self.progress.fail_item(&metadata.id, last_error.to_string());
        Err(last_error)
    }

    async fn perform_download_sequence(&self, dl_info: &str, file_id: &str, metadata: &TrackMetadata, config: &AppConfig, provider: &dyn AudioProvider) -> Result<PathBuf> {
        let mut final_metadata = metadata.clone();
        
        // --- MUSICBRAINZ ENRICHMENT ---
        if config.embed_genre {
            if let Some(isrc) = &final_metadata.isrc {
                println!("DEBUG: Buscando género en MusicBrainz para ISRC {}...", isrc);
                if let Ok(genre) = self.mb.fetch_genre(isrc, config.use_single_genre).await {
                    println!("DEBUG: Género encontrado: {}", genre);
                    final_metadata.genre = Some(genre);
                }
            }
        }
        
        let filename_base = FilenameBuilder::build(
            &config.filename_format,
            &final_metadata.title,
            &final_metadata.artist,
            &final_metadata.album,
            final_metadata.album_artist.as_deref(),
            final_metadata.date.as_deref(),
            final_metadata.isrc.as_deref(),
            final_metadata.track_number,
            final_metadata.disc_number,
        );

        // --- DUPLICATE CHECK (Enhanced Scan) ---
        let output_dir = PathBuf::from(&config.output_dir);
        if !config.redownload_with_suffix {
            if let Some(existing_file) = crate::utils::scanner::AudioScanner::find_audio_file(&output_dir, &final_metadata.title, &final_metadata.artist) {
                println!("✓ El archivo ya existe (Fuzzy Match): {:?}", existing_file);
                return Ok(existing_file);
            }
        }

        self.progress.start_item(file_id);

        let temp_filename = format!("{}.tmp", file_id);
        let temp_path = output_dir.join(&temp_filename);
        
        if let Some(parent) = temp_path.parent() {
            if !parent.exists() { std::fs::create_dir_all(parent)?; }
        }

        provider.download_track(dl_info, temp_path.to_str().unwrap(), self.progress.clone(), file_id).await?;

        let mut decryption_key = None;
        if dl_info.starts_with("DECRYPT:") {
            let parts: Vec<&str> = dl_info[8..].split(":::").collect();
            if parts.len() > 1 {
                decryption_key = Some(parts[1].to_string());
            }
        }

        // --- CONVERSION ---
        let final_ext = match config.download_quality {
            AudioQuality::Low => "mp3",
            _ => "flac",
        };
        let output_dir = PathBuf::from(&config.output_dir);
        let target_path = output_dir.join(format!("{}.{}", filename_base, final_ext));
        let final_path = FilenameBuilder::resolve_path(&target_path, config.redownload_with_suffix);

        if temp_path.extension().and_then(|s| s.to_str()) == Some(final_ext) && decryption_key.is_none() {
            std::fs::rename(&temp_path, &final_path)?;
        } else if let Some(key) = decryption_key {
            FFmpeg::convert_with_key(temp_path.to_str().unwrap(), final_path.to_str().unwrap(), &key).await?;
        } else {
            FFmpeg::convert(temp_path.to_str().unwrap(), final_path.to_str().unwrap(), config.download_quality.clone()).await?;
        }
        
        // --- VALIDATION ---
        if let Err(e) = crate::utils::validation::DownloadValidator::validate_duration(final_path.to_str().unwrap(), final_metadata.duration_ms) {
            let _ = std::fs::remove_file(&final_path);
            let _ = std::fs::remove_file(temp_path);
            return Err(anyhow!("Validation failed: {}", e));
        }

        let _ = std::fs::remove_file(temp_path);

        // --- ARTIST ASSETS ---
        if config.download_artist_images {
            let _ = self.assets.download_artist_assets(&output_dir, &final_metadata.artist, final_metadata.artist_avatar_url.as_deref(), final_metadata.artist_header_url.as_deref(), final_metadata.artist_gallery_urls.as_deref()).await;
        }

        // --- LYRICS ---
        let mut lyrics_content = None;
        if config.embed_lyrics {
            if let Ok(lyrics_resp) = self.lyrics.fetch_lyrics_all_sources(&final_metadata.title, &final_metadata.artist, Some(&final_metadata.album), Some(final_metadata.duration_ms / 1000)).await {
                let lrc = self.lyrics.convert_to_lrc(&lyrics_resp, &final_metadata.title, &final_metadata.artist);
                
                if config.save_lrc_file {
                    let lrc_path = final_path.with_extension("lrc");
                    let _ = std::fs::write(lrc_path, &lrc);
                }
                lyrics_content = Some(lrc);
            }
        }

        Tagger::embed_metadata(&final_path, &final_metadata, lyrics_content.as_deref())?;
        
        if config.embed_cover {
             if let Some(cover_url) = &final_metadata.cover_url {
                 let client = reqwest::Client::new();
                 if let Ok(resp) = client.get(cover_url).send().await {
                     if let Ok(bytes) = resp.bytes().await {
                         let _ = Tagger::embed_cover(&final_path, bytes.to_vec());
                     }
                 }
             }
        }

        // --- SAVE TO HISTORY ---
        if let Some(h) = &self.history {
            let item = HistoryItem {
                id: String::new(),
                spotify_id: final_metadata.id.clone(),
                title: final_metadata.title.clone(),
                artists: final_metadata.artist.clone(),
                album: final_metadata.album.clone(),
                duration_str: crate::utils::metadata_formatter::MetadataFormatter::format_duration(final_metadata.duration_ms / 1000),
                cover_url: final_metadata.cover_url.clone().unwrap_or_default(),
                quality: format!("{:?}", config.download_quality),
                format: final_path.extension().and_then(|s| s.to_str()).unwrap_or("flac").to_uppercase(),
                path: final_path.to_string_lossy().to_string(),
                source: provider.name().to_string(),
                timestamp: 0,
            };
            let _ = h.add_download_item(item);
        }

        if let Ok(meta) = std::fs::metadata(&final_path) {
            self.progress.complete_item(file_id, final_path.to_string_lossy().to_string(), meta.len() as f64 / (1024.0 * 1024.0));
        }

        Ok(final_path)
    }
}
