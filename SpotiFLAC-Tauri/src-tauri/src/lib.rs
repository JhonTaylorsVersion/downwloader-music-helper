mod commands;
use commands::{AppState, TauriProgressHandler, download_track, get_spotify_metadata, check_track_availability};
use spotiflac_core_rs::engine::SpotiFLACEngine;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Initialize the backend engine
      let engine = SpotiFLACEngine::new(None);
      
      // Register Progress Handler to emit to Vue
      let progress_handler = Box::new(TauriProgressHandler::new(app.handle().clone()));
      engine.progress.set_handler(progress_handler);

      app.manage(AppState { engine });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        commands::download_track,
        commands::get_spotify_metadata,
        commands::check_track_availability,
        commands::check_api_status,
        commands::fetch_unified_api_status,
        commands::get_preview_url,
        commands::get_track_isrc,
        commands::search_spotify_by_type,
        commands::add_fetch_history,
        commands::get_current_ip_info,
        commands::check_files_existence,
        commands::skip_download_item,
        commands::get_streaming_urls,
        commands::add_to_download_queue,
        commands::mark_download_item_failed,
        commands::cancel_all_queued_items,
        commands::create_m3u8_file,
        commands::read_file_as_base64,
        commands::decode_audio_for_analysis,
        commands::download_lyrics,
        commands::download_cover,
        commands::download_header,
        commands::download_gallery_image,
        commands::download_avatar,
        commands::get_download_queue,
        commands::clear_completed_downloads,
        commands::clear_all_downloads,
        commands::export_failed_downloads
    ])
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
