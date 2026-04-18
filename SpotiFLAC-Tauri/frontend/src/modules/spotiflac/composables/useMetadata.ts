import { ref, watch, onMounted, onUnmounted } from "vue";
import { fetchSpotifyMetadata } from "../utils/api";
import { toastWithSound as toast } from "../utils/toast-with-sound";
import { logger } from "../utils/logger";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { SpotifyMetadataResponse } from "../types/api";

export function useMetadata() {
    const loading = ref(false);
    const metadata = ref<SpotifyMetadataResponse | null>(null);
    const showVpnAdviceDialog = ref(false);
    const fetchFailureReason = ref("");
    const loadingToastId = ref<string | number | null>(null);
    const fetchedCount = ref(0);
    const currentName = ref("");
    
    const showAlbumDialog = ref(false);
    const selectedAlbum = ref<{
        id: string;
        name: string;
        external_urls: string;
    } | null>(null);
    const pendingArtistName = ref<string | null>(null);

    const showFetchFailureAdvice = (errorMsg: string) => {
        fetchFailureReason.value = errorMsg;
        showVpnAdviceDialog.value = true;
    };

    const resolveArtistUrlBySearch = async (artistName: string): Promise<string | null> => {
        const query = artistName.trim();
        if (!query) {
            return null;
        }
        const results: any[] = await invoke("search_spotify_by_type", {
            query,
            searchType: "artist",
            limit: 1,
            offset: 0,
        });
        return results[0]?.external_urls || null;
    };

    watch(loading, (isLoading) => {
        if (isLoading) {
            fetchedCount.value = 0;
            currentName.value = "";
            loadingToastId.value = toast.silentInfo("fetching metadata...", {
                duration: Number.POSITIVE_INFINITY,
                description: "please wait while we retrieve the information"
            });
            return;
        }
        if (loadingToastId.value) {
            toast.dismiss(loadingToastId.value);
            loadingToastId.value = null;
        }
    });

    let unlisten: UnlistenFn | null = null;

    onMounted(async () => {
        unlisten = await listen("metadata-stream", (event) => {
            const data = event.payload as any;
            if (!data) return;

            if (Array.isArray(data)) {
                fetchedCount.value += data.length;
                if (loadingToastId.value && currentName.value) {
                    toast.silentInfo(`fetching tracks for ${currentName.value.toLowerCase()}...`, {
                        id: loadingToastId.value,
                        description: `${fetchedCount.value.toLocaleString()} tracks fetched`
                    });
                }
            } else {
                const baseInfo = data;
                const name = "artist_info" in baseInfo ? baseInfo.artist_info.name :
                    "album_info" in baseInfo ? baseInfo.album_info.name :
                        "playlist_info" in baseInfo ? (baseInfo.playlist_info.name || baseInfo.playlist_info.owner.name) : "";
                if (name) {
                    currentName.value = name;
                    if (loadingToastId.value) {
                        toast.silentInfo(`fetching tracks for ${name.toLowerCase()}...`, {
                            id: loadingToastId.value,
                            description: `${fetchedCount.value.toLocaleString()} tracks fetched`
                        });
                    }
                }
            }

            if (Array.isArray(data)) {
                if (!metadata.value || !("track_list" in metadata.value)) {
                    return;
                }
                const newTrackList = [...(metadata.value.track_list || []), ...data];
                metadata.value = { ...metadata.value, track_list: newTrackList } as SpotifyMetadataResponse;
                return;
            }

            if (metadata.value && "track_list" in metadata.value && metadata.value.track_list?.length > 0) {
                return;
            }

            const baseInfo = data;
            if (!("track_list" in baseInfo)) {
                baseInfo.track_list = [];
            }
            metadata.value = baseInfo as SpotifyMetadataResponse;
        });
    });

    onUnmounted(() => {
        if (unlisten) unlisten();
    });

    const getUrlType = (url: string): string => {
        if (url.includes("/track/")) return "track";
        if (url.includes("/album/")) return "album";
        if (url.includes("/playlist/")) return "playlist";
        if (url.includes("/artist/")) return "artist";
        return "unknown";
    };

    const saveToHistory = async (url: string, data: SpotifyMetadataResponse) => {
        try {
            let name = "";
            let info = "";
            let image = "";
            let type = "unknown";
            
            if ("track" in data) {
                type = "track";
                name = data.track.name;
                info = (data.track as any).artists;
                image = (data.track as any).images && (data.track as any).images.length > 0 ? (data.track as any).images : "";
            } else if ("album_info" in data) {
                type = "album";
                name = data.album_info.name;
                info = `${data.track_list.length} tracks`;
                image = (data.album_info as any).images;
            } else if ("playlist_info" in data) {
                type = "playlist";
                if (data.playlist_info.name) {
                    name = data.playlist_info.name;
                } else if (data.playlist_info.owner.name) {
                    name = data.playlist_info.owner.name;
                }
                info = `${data.playlist_info.tracks.total} tracks`;
                image = (data.playlist_info as any).cover || "";
            } else if ("artist_info" in data) {
                type = "artist";
                name = data.artist_info.name;
                info = `${data.artist_info.total_albums || data.album_list.length} albums`;
                image = (data.artist_info as any).images;
            }

            const jsonStr = JSON.stringify(data);
            await invoke("add_fetch_history", {
                historyItem: {
                    id: crypto.randomUUID(),
                    url: url,
                    type: type,
                    name: name,
                    info: info,
                    image: image,
                    data: jsonStr,
                    timestamp: Math.floor(Date.now() / 1000)
                }
            });
        } catch (err) {
            console.error("Failed to save fetch history:", err);
        }
    };

    const fetchMetadataDirectly = async (url: string) => {
        const urlType = getUrlType(url);
        logger.info(`fetching ${urlType} metadata...`);
        logger.debug(`url: ${url}`);
        
        loading.value = true;
        metadata.value = null;
        
        try {
            const startTime = Date.now();
            const timeout = urlType === "artist" ? 60 : 300;
            const data = await fetchSpotifyMetadata(url, true, 1.0, timeout);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            
            if ("playlist_info" in data) {
                const playlistInfo = data.playlist_info;
                if (!playlistInfo.owner.name && playlistInfo.tracks.total === 0 && data.track_list.length === 0) {
                    logger.warning("playlist appears to be empty or private");
                    toast.error("Playlist not found or may be private");
                    metadata.value = null;
                    return;
                }
            } else if ("album_info" in data) {
                const albumInfo = data.album_info;
                if (!albumInfo.name && albumInfo.total_tracks === 0 && data.track_list.length === 0) {
                    logger.warning("album appears to be empty or not found");
                    toast.error("Album not found or may be private");
                    metadata.value = null;
                    return;
                }
            }
            
            metadata.value = data;
            saveToHistory(url, data);
            
            if ("track" in data) {
                logger.success(`fetched track: ${data.track.name} - ${(data.track as any).artists}`);
                logger.debug(`duration: ${data.track.duration_ms}ms`);
            } else if ("album_info" in data) {
                logger.success(`fetched album: ${data.album_info.name}`);
                logger.debug(`${data.track_list.length} tracks, released: ${(data.album_info as any).release_date}`);
            } else if ("playlist_info" in data) {
                logger.success(`fetched playlist: ${data.track_list.length} tracks`);
                logger.debug(`by ${data.playlist_info.owner.display_name || data.playlist_info.owner.name}`);
            } else if ("artist_info" in data) {
                logger.success(`fetched artist: ${data.artist_info.name}`);
                logger.debug(`${data.album_list.length} albums, ${data.track_list.length} tracks`);
            }
            logger.info(`fetch completed in ${elapsed}s`);
            toast.success("Metadata fetched successfully");
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to fetch metadata";
            logger.error(`fetch failed: ${errorMsg}`);
            toast.error(errorMsg);
            showFetchFailureAdvice(errorMsg);
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

    const handleFetchMetadata = async (url: string) => {
        if (!url.trim()) {
            logger.warning("empty url provided");
            toast.error("Please enter a Spotify URL");
            return;
        }
        let urlToFetch = url.trim();
        const isArtistUrl = urlToFetch.includes("/artist/");
        if (isArtistUrl && !urlToFetch.includes("/discography")) {
            urlToFetch = urlToFetch.replace(/\/$/, "") + "/discography/all";
            logger.debug("converted to discography url");
        }
        if (isArtistUrl) {
            logger.info("artist url detected");
            pendingArtistName.value = null;
            await fetchMetadataDirectly(urlToFetch);
        } else {
            await fetchMetadataDirectly(urlToFetch);
        }
        return urlToFetch;
    };

    const handleAlbumClick = (album: { id: string; name: string; external_urls: string; }) => {
        logger.debug(`album clicked: ${album.name}`);
        selectedAlbum.value = album;
        showAlbumDialog.value = true;
    };

    const handleArtistClick = async (artist: { id: string; name: string; external_urls: string; }) => {
        logger.debug(`artist clicked: ${artist.name}`);
        const resolvedArtistUrl = artist.external_urls.trim() || (await resolveArtistUrlBySearch(artist.name)) || "";
        if (!resolvedArtistUrl) {
            toast.error(`Artist not found: ${artist.name}`);
            return "";
        }
        const artistUrl = resolvedArtistUrl.includes("/discography")
            ? resolvedArtistUrl
            : resolvedArtistUrl.replace(/\/$/, "") + "/discography/all";
        
        pendingArtistName.value = artist.name;
        await fetchMetadataDirectly(artistUrl);
        return resolvedArtistUrl;
    };

    const handleConfirmAlbumFetch = async () => {
        if (!selectedAlbum.value) return;
        
        const albumUrl = selectedAlbum.value.external_urls;
        logger.info(`fetching album: ${selectedAlbum.value.name}...`);
        logger.debug(`url: ${albumUrl}`);
        
        showAlbumDialog.value = false;
        loading.value = true;
        metadata.value = null;
        
        try {
            const startTime = Date.now();
            const data = await fetchSpotifyMetadata(albumUrl);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            
            if ("album_info" in data) {
                const albumInfo = data.album_info;
                if (!albumInfo.name && albumInfo.total_tracks === 0 && data.track_list.length === 0) {
                    logger.warning("album appears to be empty or not found");
                    toast.error("Album not found or may be private");
                    metadata.value = null;
                    selectedAlbum.value = null;
                    return albumUrl;
                }
            }
            
            metadata.value = data;
            saveToHistory(albumUrl, data);
            
            if ("album_info" in data) {
                logger.success(`fetched album: ${data.album_info.name}`);
                logger.debug(`${data.track_list.length} tracks, released: ${(data.album_info as any).release_date}`);
            }
            logger.info(`fetch completed in ${elapsed}s`);
            toast.success("Album metadata fetched successfully");
            return albumUrl;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to fetch album metadata";
            logger.error(`fetch failed: ${errorMsg}`);
            toast.error(errorMsg);
            showFetchFailureAdvice(errorMsg);
        } finally {
            loading.value = false;
            selectedAlbum.value = null;
        }
    };

    return {
        loading,
        metadata,
        showVpnAdviceDialog,
        fetchFailureReason,
        showAlbumDialog,
        selectedAlbum,
        pendingArtistName,
        handleFetchMetadata,
        handleAlbumClick,
        handleConfirmAlbumFetch,
        handleArtistClick,
        loadFromCache,
        resetMetadata: () => { metadata.value = null; },
    };
}
