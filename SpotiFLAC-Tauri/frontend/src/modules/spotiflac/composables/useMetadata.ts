import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "vue-sonner";

export type SpotifyMetadataResponse = any;

export function useMetadata() {
  const loading = ref(false);
  const metadata = ref<SpotifyMetadataResponse | null>(null);
  const fetchFailureReason = ref("");

  // Listen for metadata stream events from Rust
  listen("metadata-stream", (event: any) => {
    const data = event.payload;
    if (!data) return;

    if (Array.isArray(data)) {
      if (metadata.value && "track_list" in metadata.value) {
        metadata.value.track_list = [...metadata.value.track_list, ...data];
      }
    } else {
      metadata.value = data;
    }
  });

  const getUrlType = (url: string): string => {
    if (url.includes("/track/")) return "track";
    if (url.includes("/album/")) return "album";
    if (url.includes("/playlist/")) return "playlist";
    if (url.includes("/artist/")) return "artist";
    return "unknown";
  };

  const fetchMetadata = async (url: string) => {
    if (!url.trim()) {
      toast.error("Please enter a Spotify URL");
      return;
    }

    let urlToFetch = url.trim();
    const urlType = getUrlType(urlToFetch);

    if (urlType === "artist" && !urlToFetch.includes("/discography")) {
      urlToFetch = urlToFetch.replace(/\/$/, "") + "/discography/all";
    }

    loading.value = true;
    metadata.value = null;

    try {
      // First call initiates the fetch.
      // Small objects return immediately, large ones (artist/playlist) stream via events.
      const data = await invoke<SpotifyMetadataResponse>(
        "get_spotify_metadata",
        {
          url: urlToFetch,
        },
      );

      if (data) {
        metadata.value = data;
        toast.success("Metadata fetched successfully");

        // Add to history in Rust
        await invoke("add_fetch_history", {
          historyItem: {
            id: crypto.randomUUID(),
            url: urlToFetch,
            type: urlType,
            name:
              data.track?.name ||
              data.album_info?.name ||
              data.artist_info?.name ||
              "Unknown",
            info:
              data.track?.artists || `${data.track_list?.length || 0} tracks`,
            images:
              data.track?.images ||
              data.album_info?.images ||
              data.artist_info?.images ||
              "",
            timestamp: Math.floor(Date.now() / 1000),
          },
        });
      }
    } catch (err: any) {
      console.error("Fetch failed:", err);
      fetchFailureReason.value = err.toString();
      toast.error(err.toString());
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    metadata,
    fetchFailureReason,
    fetchMetadata,
    resetMetadata: () => {
      metadata.value = null;
    },
  };
}
