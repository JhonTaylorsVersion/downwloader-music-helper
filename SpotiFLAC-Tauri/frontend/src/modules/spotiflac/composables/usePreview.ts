import { ref, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { SPOTIFY_PREVIEW_VOLUME } from "../utils/preview";
import { toastWithSound } from "../utils/toast-with-sound";
import { toast } from "vue-sonner";

export function usePreview() {
    const loadingPreview = ref<string | null>(null);
    const currentAudio = ref<HTMLAudioElement | null>(null);
    const playingTrack = ref<string | null>(null);

    onUnmounted(() => {
        if (currentAudio.value) {
            currentAudio.value.pause();
            currentAudio.value.currentTime = 0;
        }
    });

    const playPreview = async (trackId: string, trackName: string) => {
        try {
            if (playingTrack.value === trackId && currentAudio.value) {
                currentAudio.value.pause();
                currentAudio.value.currentTime = 0;
                playingTrack.value = null;
                currentAudio.value = null;
                return;
            }
            if (currentAudio.value) {
                currentAudio.value.pause();
                currentAudio.value.currentTime = 0;
                currentAudio.value = null;
                playingTrack.value = null;
            }
            
            loadingPreview.value = trackId;
            const previewURL: string = await invoke("get_preview_url", { trackId });
            
            if (!previewURL) {
                toastWithSound.error("Preview not available", {
                    description: `No preview found for "${trackName}"`,
                });
                loadingPreview.value = null;
                return;
            }
            
            const audio = new Audio(previewURL);
            audio.volume = SPOTIFY_PREVIEW_VOLUME;
            
            audio.addEventListener("loadeddata", () => {
                loadingPreview.value = null;
                playingTrack.value = trackId;
            });
            audio.addEventListener("ended", () => {
                playingTrack.value = null;
                currentAudio.value = null;
            });
            audio.addEventListener("error", () => {
                toastWithSound.error("Failed to play preview", {
                    description: `Could not play preview for "${trackName}"`,
                });
                loadingPreview.value = null;
                playingTrack.value = null;
                currentAudio.value = null;
            });
            
            currentAudio.value = audio;
            await audio.play();
        }
        catch (error: any) {
            console.error("Preview error:", error);
            toastWithSound.error("Preview not available", {
                description: error?.message || `Could not load preview for "${trackName}"`,
            });
            loadingPreview.value = null;
            playingTrack.value = null;
        }
    };

    const stopPreview = () => {
        if (currentAudio.value) {
            currentAudio.value.pause();
            currentAudio.value.currentTime = 0;
            currentAudio.value = null;
            playingTrack.value = null;
        }
    };

    return {
        playPreview,
        stopPreview,
        loadingPreview,
        playingTrack,
    };
}
