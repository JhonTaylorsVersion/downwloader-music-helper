mod metadata_compat;
mod commands;
use commands::{
    AppState, TauriProgressHandler,
    download_track, get_spotify_metadata, check_track_availability,
    check_api_status, fetch_unified_api_status, get_preview_url, get_track_isrc,
    search_spotify, search_spotify_by_type, add_fetch_history, get_current_ip_info,
    check_files_existence, skip_download_item, get_streaming_urls,
    add_to_download_queue, mark_download_item_failed, cancel_all_queued_items,
    create_m3u8_file, read_file_as_base64, decode_audio_for_analysis,
    download_lyrics, download_cover, download_header, download_gallery_image, download_avatar,
    get_download_progress, get_download_queue, clear_completed_downloads, clear_all_downloads, export_failed_downloads,
    select_folder, open_config_folder, get_default_download_path, open_folder,
    open_url,
    check_ffmpeg_installed, download_ffmpeg,
    convert_audio_batch, resample_audio_batch,
    list_audio_files, list_directory_items, preview_rename_files,
    rename_files_by_metadata, read_file_metadata, read_text_file,
    rename_file_to, read_image_as_base64,
    get_download_history,
    delete_download_history_item, clear_download_history, get_fetch_history,
    delete_fetch_history_item, clear_fetch_history_by_type,
    load_settings, save_settings,
    get_platform,
};
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
      
      // Initialize the backend engine with persistent DB at app data dir
      let db_path = app.path().app_data_dir()
        .map(|p| p.join("spotiflac.db"))
        .ok();
      
      let engine = SpotiFLACEngine::new(db_path);
      
      // Register Progress Handler to emit events to Vue frontend
      let progress_handler = Box::new(TauriProgressHandler::new(app.handle().clone()));
      engine.progress.set_handler(progress_handler);

      app.manage(AppState { engine });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        // Download
        download_track,
        // Metadata
        get_spotify_metadata,
        check_track_availability,
        check_api_status,
        fetch_unified_api_status,
        get_preview_url,
        get_track_isrc,
        search_spotify,
        search_spotify_by_type,
        get_current_ip_info,
        get_streaming_urls,
        // History
        add_fetch_history,
        get_download_history,
        delete_download_history_item,
        clear_download_history,
        get_fetch_history,
        delete_fetch_history_item,
        clear_fetch_history_by_type,
        // File existence
        check_files_existence,
        // Queue management
        add_to_download_queue,
        skip_download_item,
        mark_download_item_failed,
        cancel_all_queued_items,
        get_download_progress,
        get_download_queue,
        clear_completed_downloads,
        clear_all_downloads,
        export_failed_downloads,
        // Assets
        create_m3u8_file,
        read_file_as_base64,
        decode_audio_for_analysis,
        // Lyrics
        download_lyrics,
        // Covers & artist images
        download_cover,
        download_header,
        download_gallery_image,
        download_avatar,
        // File system / settings
        select_folder,
        open_config_folder,
        get_default_download_path,
        open_folder,
        open_url,
        load_settings,
        save_settings,
        // FFmpeg
        check_ffmpeg_installed,
        download_ffmpeg,
        // Audio processing
        convert_audio_batch,
        resample_audio_batch,
        // File manager
        list_audio_files,
        list_directory_items,
        preview_rename_files,
        rename_files_by_metadata,
        read_file_metadata,
        read_text_file,
        rename_file_to,
        read_image_as_base64,
        get_platform,

    ])
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
