import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'vue-sonner';
import { useSettings } from './useSettings';

export function useDownload() {
    const { settings } = useSettings();
    const isDownloading = ref(false);
    const downloadProgress = ref(0);
    const currentDownloadInfo = ref<{ name: string; id: string; artists: string } | null>(null);
    const downloadedTracks = ref(new Set<string>());
    const failedTracks = ref(new Set<string>());

    const downloadTrack = async (track: any) => {
        if (isDownloading.value) return;
        
        const spotifyUrl = track.spotify_url || `https://open.spotify.com/track/${track.spotify_id || track.id}`;
        
        currentDownloadInfo.value = { 
            name: track.name || track.title || "Unknown Track", 
            id: track.spotify_id || track.id,
            artists: track.artists || "Unknown Artist"
        };
        isDownloading.value = true;
        downloadProgress.value = 0;

        try {
            // Map Vue settings to Rust AppConfig
            const appConfig = {
                output_dir: settings.value.downloadPath,
                download_quality: settings.value.autoQuality === "24" ? "HiRes" : "Lossless",
                filename_format: settings.value.filenameTemplate || "{track}. {title}",
                embed_metadata: true,
                embed_cover: settings.value.embedMaxQualityCover,
                embed_genre: settings.value.embedGenre,
                use_single_genre: settings.value.useSingleGenre,
                redownload_with_suffix: settings.value.redownloadWithSuffix,
                download_artist_images: true,
                embed_lyrics: settings.value.embedLyrics,
                save_lrc_file: true
            };

            await invoke('download_track', { 
                url: spotifyUrl, 
                config: appConfig 
            });

            downloadedTracks.value.add(currentDownloadInfo.value.id);
            toast.success(`Downloaded: ${currentDownloadInfo.value.name}`);
        } catch (err: any) {
            console.error("Download failed:", err);
            failedTracks.value.add(currentDownloadInfo.value!.id);
            toast.error(`Failed to download ${track.name}: ${err}`);
        } finally {
            isDownloading.value = false;
            currentDownloadInfo.value = null;
        }
    };

    const downloadBatch = async (tracks: any[]) => {
        if (isDownloading.value) return;
        
        toast.info(`Starting batch download of ${tracks.length} tracks`);
        
        for (const track of tracks) {
            const trackId = track.spotify_id || track.id;
            if (downloadedTracks.value.has(trackId)) continue;
            
            await downloadTrack(track);
            // Small delay between tracks to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    };

    return {
        isDownloading,
        downloadProgress,
        currentDownloadInfo,
        downloadedTracks,
        failedTracks,
        downloadTrack,
        downloadBatch
    };
}
