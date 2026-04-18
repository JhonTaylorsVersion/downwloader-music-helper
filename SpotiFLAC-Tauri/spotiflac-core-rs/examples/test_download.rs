use spotiflac_core_rs::engine::SpotiFLACEngine;
use spotiflac_core_rs::models::{AppConfig, AudioQuality};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Configuración de prueba
    let config = AppConfig {
        output_dir: "./downloads_test".to_string(),
        download_quality: AudioQuality::Lossless,
        filename_format: "{artist} - {title}".to_string(),
        embed_metadata: true,
        embed_cover: true,
        embed_genre: true,
        use_single_genre: true,
        redownload_with_suffix: true,
        download_artist_images: true,
        embed_lyrics: true,
        save_lrc_file: true,
    };

    // Crear carpeta si no existe
    std::fs::create_dir_all(&config.output_dir)?;

    // 2. Inicializar el motor con base de datos de historial
    let db_path = std::path::PathBuf::from("./test_history.db");
    let engine = SpotiFLACEngine::new(Some(db_path));

    // 3. URL de prueba (Proporcionada por el usuario)
    let test_url =
        "https://open.spotify.com/intl-es/track/7jk7gqyEonmVVYahZN5zhW?si=2f6febb132c5468f";

    // Forzamos el ID de Tidal para este test específico (Mägo de Oz - Molinos de Viento)
    // Esto nos permite saltar el fallo de la API de SongLink y validar el resto del motor.
    let force_tidal_id: Option<String> = None;

    println!("===============================================");
    println!("🔥 SpotiFLAC-RS: INICIANDO TEST DE DESCARGA");
    println!("===============================================");
    println!("🔗 URL: {}", test_url);
    let result = engine
        .download_track(test_url, &config, force_tidal_id)
        .await;
    match result {
        Ok(path) => {
            println!("\n✅ ÉXITO TOTAL");
            println!("🎵 Archivo generado: {:?}", path);
            println!("📂 Puedes encontrarlo en la carpeta: {}", config.output_dir);
        }
        Err(e) => {
            println!("\n❌ ERROR DURANTE LA DESCARGA");
            println!("⚠️  Motivo: {}", e);
            println!("\nNota: Asegúrate de que las APIs de los mirrors estén activas.");
        }
    }

    println!("===============================================");

    Ok(())
}
