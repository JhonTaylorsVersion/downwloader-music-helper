import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'vue-sonner';
import { useSettings } from './useSettings';
import { buildPlaylistFolderName } from '../utils/playlist';

export function useDownload() {
    const { settings } = useSettings();
    const isDownloading = ref(false);
    const downloadProgress = ref(0);
    const currentDownloadInfo = ref<{ name: string; id: string; artists: string } | null>(null);
    const downloadedTracks = ref(new Set<string>());
    const failedTracks = ref(new Set<string>());

    const downloadTrack = async (track: any): Promise<string | null> => {
        if (isDownloading.value) return null;
        
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

            const downloadedPath = await invoke<string>('download_track', { 
                url: spotifyUrl, 
                config: appConfig 
            });

            downloadedTracks.value.add(currentDownloadInfo.value.id);
            toast.success(`Downloaded: ${currentDownloadInfo.value.name}`);
            return downloadedPath;
        } catch (err: any) {
            console.error("Download failed:", err);
            failedTracks.value.add(currentDownloadInfo.value!.id);
            toast.error(`Failed to download ${track.name}: ${err}`);
            return null;
        } finally {
            isDownloading.value = false;
            currentDownloadInfo.value = null;
        }
    };

    const createPlaylistFileIfNeeded = async (folderName: string, filePaths: string[]) => {
        const validPaths = filePaths.filter((path): path is string => typeof path === 'string' && path.trim().length > 0);
        if (!settings.value.createM3u8File || !folderName || validPaths.length === 0) {
            return;
        }

        try {
            await invoke('create_m3u8_file', {
                playlistName: folderName,
                outputDir: settings.value.downloadPath,
                filePaths: validPaths,
            });
            toast.success("M3U8 playlist created");
        } catch (err: any) {
            console.error("Failed to create M3U8 playlist:", err);
            toast.error(`Failed to create M3U8 playlist: ${err}`);
        }
    };

    const downloadBatch = async (tracks: any[], folderName?: string) => {
        if (isDownloading.value) return;
        if (!Array.isArray(tracks) || tracks.length === 0) {
            toast.warning("No tracks available for batch download");
            return;
        }
        
        toast.info(`Starting batch download of ${tracks.length} tracks`);
        const downloadedPaths: string[] = [];
        
        for (const track of tracks) {
            const trackId = track.spotify_id || track.id;
            if (downloadedTracks.value.has(trackId)) continue;
            
            const downloadedPath = await downloadTrack(track);
            if (downloadedPath) {
                downloadedPaths.push(downloadedPath);
            }
            // Small delay between tracks to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (folderName) {
            await createPlaylistFileIfNeeded(folderName, downloadedPaths);
        }
    };

    const getFolderNameForMetadata = (metadata: any): string => {
        if (!metadata) return "";
        if ("album_info" in metadata) {
            return metadata.album_info?.name || "";
        }
        if ("playlist_info" in metadata) {
            return buildPlaylistFolderName(
                metadata.playlist_info?.name,
                metadata.playlist_info?.owner?.display_name,
                settings.value.playlistOwnerFolderName,
            );
        }
        if ("artist_info" in metadata) {
            return metadata.artist_info?.name || "";
        }
        return "";
    };

    return {
        isDownloading,
        downloadProgress,
        currentDownloadInfo,
        downloadedTracks,
        failedTracks,
        downloadTrack,
        downloadBatch,
        getFolderNameForMetadata,
    };
}
