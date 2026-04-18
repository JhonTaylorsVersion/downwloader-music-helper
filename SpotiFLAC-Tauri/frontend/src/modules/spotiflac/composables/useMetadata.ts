import { onUnmounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "vue-sonner";
import { logger } from "../utils/logger";

export type SpotifyMetadataResponse = any;

export function useMetadata() {
  const loading = ref(false);
  const metadata = ref<SpotifyMetadataResponse | null>(null);
  const showVpnAdviceDialog = ref(false);
  const fetchFailureReason = ref("");
  const showAlbumDialog = ref(false);
  const selectedAlbum = ref<{
    id: string;
    name: string;
    external_urls: string;
  } | null>(null);
  const pendingArtistName = ref<string | null>(null);
  let unlistenMetadataStream: null | (() => void) = null;

  // Listen for metadata stream events from Rust
  void listen("metadata-stream", (event: any) => {
    const data = event.payload;
    if (!data) return;

    if (Array.isArray(data)) {
      if (metadata.value && "track_list" in metadata.value) {
        metadata.value.track_list = [...metadata.value.track_list, ...data];
      }
    } else {
      metadata.value = data;
    }
  }).then((unlisten) => {
    unlistenMetadataStream = unlisten;
  });

  onUnmounted(() => {
    if (unlistenMetadataStream) {
      unlistenMetadataStream();
      unlistenMetadataStream = null;
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
    logger.info(`fetching metadata... ${url}`);
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
    showVpnAdviceDialog.value = false;
    fetchFailureReason.value = "";

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
              data.playlist_info?.name ||
              data.artist_info?.name ||
              "Unknown",
            info:
              data.track?.artists ||
              (data.playlist_info
                ? `${data.playlist_info?.tracks?.total || data.track_list?.length || 0} tracks`
                : data.artist_info
                  ? `${data.artist_info?.total_albums || data.album_list?.length || 0} albums`
                  : `${data.track_list?.length || 0} tracks`),
            image:
              data.track?.images ||
              data.album_info?.images ||
              data.playlist_info?.cover ||
              data.artist_info?.images ||
              "",
            data: JSON.stringify(data),
            timestamp: Math.floor(Date.now() / 1000),
          },
        });
      }
    } catch (err: any) {
      console.error("Fetch failed:", err);
      fetchFailureReason.value = err.toString();
      toast.error(err.toString());
      showVpnAdviceDialog.value = true;
    } finally {
      loading.value = false;
    }
  };

  const loadFromCache = (cachedData: string) => {
    try {
      const data = JSON.parse(cachedData);
      metadata.value = data;
      toast.success("Loaded from cache");
    } catch (err) {
      console.error("Failed to load from cache:", err);
      toast.error("Failed to load from cache");
    }
  };

  const handleAlbumClick = (album: {
    id: string;
    name: string;
    external_urls: string;
  }) => {
    selectedAlbum.value = album;
    showAlbumDialog.value = true;
  };

  const handleConfirmAlbumFetch = async () => {
    if (!selectedAlbum.value) return;
    const albumUrl = selectedAlbum.value.external_urls;
    showAlbumDialog.value = false;
    await fetchMetadata(albumUrl);
    selectedAlbum.value = null;
    return albumUrl;
  };

  const handleArtistClick = async (artist: {
    id: string;
    name: string;
    external_urls: string;
  }) => {
    const resolvedArtistUrl = artist.external_urls?.trim();
    if (!resolvedArtistUrl) {
      toast.error(`Artist not found: ${artist.name}`);
      return "";
    }
    const artistUrl = resolvedArtistUrl.includes("/discography")
      ? resolvedArtistUrl
      : resolvedArtistUrl.replace(/\/$/, "") + "/discography/all";
    pendingArtistName.value = artist.name;
    await fetchMetadata(artistUrl);
    return resolvedArtistUrl;
  };

  return {
    loading,
    metadata,
    showVpnAdviceDialog,
    setShowVpnAdviceDialog: (value: boolean) => {
      showVpnAdviceDialog.value = value;
    },
    fetchFailureReason,
    showAlbumDialog,
    setShowAlbumDialog: (value: boolean) => {
      showAlbumDialog.value = value;
    },
    selectedAlbum,
    pendingArtistName,
    fetchMetadata,
    handleFetchMetadata: fetchMetadata,
    handleAlbumClick,
    handleConfirmAlbumFetch,
    handleArtistClick,
    loadFromCache,
    resetMetadata: () => {
      metadata.value = null;
    },
  };
}
