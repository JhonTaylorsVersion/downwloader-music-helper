use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackMetadata {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub date: Option<String>,
    pub release_date: Option<String>,
    pub track_number: u32,
    pub total_tracks: Option<u32>,
    pub disc_number: u32,
    pub total_discs: Option<u32>,
    pub isrc: Option<String>,
    pub upc: Option<String>,
    pub cover_url: Option<String>,
    pub spotify_url: Option<String>,
    pub genre: Option<String>,
    pub label: Option<String>,
    pub copyright: Option<String>,
    pub composer: Option<String>,
    pub lyrics_text: Option<String>,
    pub is_explicit: bool,
    pub duration_ms: u32,
    pub artist_avatar_url: Option<String>,
    pub artist_header_url: Option<String>,
    pub artist_gallery_urls: Option<Vec<String>>,
}

impl TrackMetadata {
    pub fn new(title: String, artist: String, album: String) -> Self {
        Self {
            id: String::new(),
            title,
            artist,
            album,
            album_artist: None,
            date: None,
            release_date: None,
            track_number: 0,
            total_tracks: None,
            disc_number: 0,
            total_discs: None,
            isrc: None,
            upc: None,
            cover_url: None,
            spotify_url: None,
            genre: None,
            label: None,
            copyright: None,
            composer: None,
            lyrics_text: None,
            is_explicit: false,
            duration_ms: 0,
            artist_avatar_url: None,
            artist_header_url: None,
            artist_gallery_urls: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistMetadata {
    pub id: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub header_url: Option<String>,
    pub gallery_urls: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AudioQuality {
    Low,      // MP3 320 or similar
    Lossless, // FLAC 16-bit
    HiRes,    // FLAC 24-bit
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub output_dir: String,
    pub download_quality: AudioQuality,
    pub filename_format: String,
    pub embed_metadata: bool,
    pub embed_cover: bool,
    pub embed_genre: bool,
    pub use_single_genre: bool,
    pub redownload_with_suffix: bool,
    pub download_artist_images: bool,
    pub embed_lyrics: bool,
    pub save_lrc_file: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentIPInfo {
    pub ip: String,
    pub country: String,
    pub country_code: String,
    pub source: String,
}
