use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Completed,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadItem {
    pub id: String,
    pub track_name: String,
    pub artist_name: String,
    pub album_name: String,
    pub spotify_id: String,
    pub status: DownloadStatus,
    pub progress_mb: f64,
    pub total_size_mb: f64,
    pub speed_mbps: f64,
    pub start_time: u64,
    pub end_time: u64,
    pub error_message: Option<String>,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressUpdate {
    pub item_id: String,
    pub status: DownloadStatus,
    pub progress_mb: f64,
    pub speed_mbps: f64,
}

pub trait ProgressHandler: Send + Sync {
    fn on_progress(&self, update: ProgressUpdate);
    fn on_status_change(&self, item_id: &str, status: DownloadStatus);
}

pub struct ProgressManager {
    queue: Arc<RwLock<Vec<DownloadItem>>>,
    handler: Arc<RwLock<Option<Box<dyn ProgressHandler>>>>,
}

impl ProgressManager {
    pub fn new() -> Self {
        Self {
            queue: Arc::new(RwLock::new(Vec::new())),
            handler: Arc::new(RwLock::new(None)),
        }
    }

    pub fn set_handler(&self, handler: Box<dyn ProgressHandler>) {
        let mut h = self.handler.write().unwrap();
        *h = Some(handler);
    }

    pub fn add_to_queue(&self, id: String, track: String, artist: String, album: String, spotify_id: String) {
        let mut queue = self.queue.write().unwrap();
        queue.push(DownloadItem {
            id: id.clone(),
            track_name: track,
            artist_name: artist,
            album_name: album,
            spotify_id,
            status: DownloadStatus::Queued,
            progress_mb: 0.0,
            total_size_mb: 0.0,
            speed_mbps: 0.0,
            start_time: 0,
            end_time: 0,
            error_message: None,
            file_path: None,
        });

        let h_lock = self.handler.read().unwrap();
        if let Some(h) = &*h_lock {
            h.on_status_change(&id, DownloadStatus::Queued);
        }
    }

    pub fn start_item(&self, id: &str) {
        let mut queue = self.queue.write().unwrap();
        if let Some(item) = queue.iter_mut().find(|i| i.id == id) {
            item.status = DownloadStatus::Downloading;
            item.start_time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            
            let h_lock = self.handler.read().unwrap();
            if let Some(h) = &*h_lock {
                h.on_status_change(id, DownloadStatus::Downloading);
            }
        }
    }

    pub fn update_progress(&self, id: &str, progress: f64, speed: f64) {
        let mut queue = self.queue.write().unwrap();
        if let Some(item) = queue.iter_mut().find(|i| i.id == id) {
            item.progress_mb = progress;
            item.speed_mbps = speed;

            let h_lock = self.handler.read().unwrap();
            if let Some(h) = &*h_lock {
                h.on_progress(ProgressUpdate {
                    item_id: id.to_string(),
                    status: item.status.clone(),
                    progress_mb: progress,
                    speed_mbps: speed,
                });
            }
        }
    }

    pub fn complete_item(&self, id: &str, file_path: String, final_size: f64) {
        let mut queue = self.queue.write().unwrap();
        if let Some(item) = queue.iter_mut().find(|i| i.id == id) {
            item.status = DownloadStatus::Completed;
            item.end_time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            item.file_path = Some(file_path);
            item.progress_mb = final_size;
            item.total_size_mb = final_size;
            item.speed_mbps = 0.0;

            let h_lock = self.handler.read().unwrap();
            if let Some(h) = &*h_lock {
                h.on_status_change(id, DownloadStatus::Completed);
            }
        }
    }

    pub fn fail_item(&self, id: &str, error: String) {
        let mut queue = self.queue.write().unwrap();
        if let Some(item) = queue.iter_mut().find(|i| i.id == id) {
            item.status = DownloadStatus::Failed;
            item.end_time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            item.error_message = Some(error);
            item.speed_mbps = 0.0;

            let h_lock = self.handler.read().unwrap();
            if let Some(h) = &*h_lock {
                h.on_status_change(id, DownloadStatus::Failed);
            }
        }
    }
}

pub struct ProgressReporter {
    manager: Arc<ProgressManager>,
    item_id: String,
    total_bytes: u64,
    last_reported_time: Instant,
    bytes_since_last_report: u64,
}

impl ProgressReporter {
    pub fn new(manager: Arc<ProgressManager>, item_id: String) -> Self {
        Self {
            manager,
            item_id,
            total_bytes: 0,
            last_reported_time: Instant::now(),
            bytes_since_last_report: 0,
        }
    }

    pub fn update(&mut self, chunk_size: u64) {
        self.total_bytes += chunk_size;
        self.bytes_since_last_report += chunk_size;

        if self.bytes_since_last_report >= 256 * 1024 {
            let now = Instant::now();
            let duration = now.duration_since(self.last_reported_time).as_secs_f64();
            
            let mb_downloaded = self.total_bytes as f64 / (1024.0 * 1024.0);
            let speed_mbps = if duration > 0.0 {
                (self.bytes_since_last_report as f64 / (1024.0 * 1024.0)) / duration
            } else {
                0.0
            };

            self.manager.update_progress(&self.item_id, mb_downloaded, speed_mbps);

            self.last_reported_time = now;
            self.bytes_since_last_report = 0;
        }
    }
}
