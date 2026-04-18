use tauri::{AppHandle, State, Emitter};
use spotiflac_core_rs::engine::SpotiFLACEngine;
use spotiflac_core_rs::models::{AppConfig, TrackMetadata};
use spotiflac_core_rs::progress::{ProgressHandler, ProgressUpdate, DownloadStatus};
use std::path::PathBuf;

pub struct AppState {
    pub engine: SpotiFLACEngine,
}

pub struct TauriProgressHandler {
    app_handle: AppHandle,
}

impl TauriProgressHandler {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
}

impl ProgressHandler for TauriProgressHandler {
    fn on_progress(&self, update: ProgressUpdate) {
        let _ = self.app_handle.emit("download-progress", update);
    }

    fn on_status_change(&self, item_id: &str, status: DownloadStatus) {
        #[derive(serde::Serialize, Clone)]
        struct StatusUpdate {
            item_id: String,
            status: DownloadStatus,
        }
        let _ = self.app_handle.emit("download-status", StatusUpdate {
            item_id: item_id.to_string(),
            status,
        });
    }
}

// ======================================
// DOWNLOAD ENDPOINTS
// ======================================

#[tauri::command]
pub async fn download_track(
    url: String,
    config: AppConfig,
    tidal_id_override: Option<String>,
    state: State<'_, AppState>,
) -> Result<PathBuf, String> {
    state.engine.download_track(&url, &config, tidal_id_override).await.map_err(|e| e.to_string())
}

// ======================================
// METADATA ENDPOINTS
// ======================================

#[tauri::command]
pub async fn get_spotify_metadata(url: String) -> Result<TrackMetadata, String> {
    let client = spotiflac_core_rs::metadata::spotify::SpotifyMetadataClient::new();
    match client.fetch_track_info_enriched(&url).await {
        Ok((metadata, _)) => Ok(metadata),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn check_track_availability(_url: String) -> Result<String, String> {
    Ok("{}".to_string())
}

#[tauri::command]
pub async fn check_api_status(_api_type: String, _api_url: String) -> Result<bool, String> {
    Ok(true) // Stub
}

#[tauri::command]
pub async fn fetch_unified_api_status(_force_refresh: bool) -> Result<String, String> {
    Ok(serde_json::json!({
        "tidal": "up",
        "qobuz_a": "up",
        "qobuz_b": "up",
        "qobuz_c": "up",
        "amazon": "up",
        "lrclib": "up"
    }).to_string()) // Stub matching Wails behavior
}

#[tauri::command]
pub async fn get_preview_url(_track_id: String) -> Result<String, String> {
    Ok("".to_string()) // Stub
}

#[tauri::command]
pub async fn get_track_isrc(_spotify_id: String) -> Result<String, String> {
    Ok("".to_string()) // Stub
}

#[tauri::command]
pub async fn search_spotify_by_type(_query: String, _search_type: String, _limit: i32, _offset: i32) -> Result<Vec<serde_json::Value>, String> {
    Ok(vec![]) // Stub
}

#[tauri::command]
pub async fn add_fetch_history(_history_item: serde_json::Value) -> Result<(), String> {
    Ok(()) // Stub
}

#[tauri::command]
pub async fn get_current_ip_info() -> Result<String, String> {
    Ok("{}".to_string()) // Stub for IP info parity
}

#[tauri::command]
pub async fn check_files_existence(_output_dir: String, _root_dir: String, _tracks: Vec<serde_json::Value>) -> Result<Vec<serde_json::Value>, String> {
    Ok(vec![]) // Stub
}

#[tauri::command]
pub async fn skip_download_item(_item_id: String, _file_path: String) -> Result<(), String> {
    Ok(()) // Stub
}

#[tauri::command]
pub async fn get_streaming_urls(_spotify_id: String, _region: String) -> Result<String, String> {
    Ok("{}".to_string()) // Stub
}

#[tauri::command]
pub async fn add_to_download_queue(_id: String, _track_name: String, _artist_name: String, _album_name: String) -> Result<String, String> {
    Ok("stub-item-id".to_string()) // Stub
}

#[tauri::command]
pub async fn mark_download_item_failed(_item_id: String, _error: String) -> Result<(), String> {
    Ok(()) // Stub
}

#[tauri::command]
pub async fn cancel_all_queued_items() -> Result<(), String> {
    Ok(()) // Stub
}

#[tauri::command]
pub async fn create_m3u8_file(_playlist_name: String, _output_dir: String, _file_paths: Vec<String>) -> Result<(), String> {
    Ok(()) // Stub
}

#[tauri::command]
pub async fn read_file_as_base64(_path: String) -> Result<String, String> {
    Ok("".to_string()) // Stub
}

#[tauri::command]
pub async fn decode_audio_for_analysis(_path: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "pcm_base64": "",
        "sample_rate": 0,
        "channels": 0,
        "bits_per_sample": 0,
        "duration": 0
    })) // Stub
}

#[tauri::command]
pub async fn download_lyrics(_request: serde_json::Value) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "success": true })) // Stub
}

#[tauri::command]
pub async fn download_cover(_request: serde_json::Value) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "success": true })) // Stub
}

#[tauri::command]
pub async fn download_header(_request: serde_json::Value) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "success": true })) // Stub
}

#[tauri::command]
pub async fn download_gallery_image(_request: serde_json::Value) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "success": true })) // Stub
}

#[tauri::command]
pub async fn download_avatar(_request: serde_json::Value) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "success": true })) // Stub
}

// ======================================
// DOWNLOAD QUEUE MANAGEMENT
// ======================================

#[tauri::command]
pub async fn get_download_queue() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "is_downloading": false,
        "queue": [],
        "current_speed": 0.0,
        "total_downloaded": 0.0,
        "session_start_time": 0,
        "queued_count": 0,
        "completed_count": 0,
        "failed_count": 0,
        "skipped_count": 0
    })) // Stub — real impl delegates to SpotiFLACEngine's ProgressManager
}

#[tauri::command]
pub async fn clear_completed_downloads() -> Result<(), String> {
    Ok(()) // Stub
}

#[tauri::command]
pub async fn clear_all_downloads() -> Result<(), String> {
    Ok(()) // Stub
}

#[tauri::command]
pub async fn export_failed_downloads() -> Result<String, String> {
    Ok("No failed downloads to export".to_string()) // Stub
}
