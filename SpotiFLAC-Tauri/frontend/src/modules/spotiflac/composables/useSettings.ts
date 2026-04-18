import { ref, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export type FontFamily = "google-sans" | "inter" | "poppins" | "roboto" | "dm-sans" | "plus-jakarta-sans" | "manrope" | "space-grotesk" | "noto-sans" | "nunito-sans" | "figtree" | "raleway" | "public-sans" | "outfit" | "jetbrains-mono" | "geist-sans" | "bricolage-grotesque";
export type FolderPreset = "none" | "artist" | "album" | "year-album" | "year-artist-album" | "artist-album" | "artist-year-album" | "artist-year-nested-album" | "album-artist" | "album-artist-album" | "album-artist-year-album" | "album-artist-year-nested-album" | "year" | "year-artist" | "custom";
export type FilenamePreset = "title" | "title-artist" | "artist-title" | "track-title" | "track-title-artist" | "track-artist-title" | "title-album-artist" | "track-title-album-artist" | "artist-album-title" | "track-dash-title" | "disc-track-title" | "disc-track-title-artist" | "custom";

export interface Settings {
    downloadPath: string;
    downloader: "auto" | "tidal" | "qobuz" | "amazon";
    linkResolver: "songstats" | "songlink";
    allowResolverFallback: boolean;
    theme: string;
    themeMode: "auto" | "light" | "dark";
    fontFamily: FontFamily;
    folderPreset: FolderPreset;
    folderTemplate: string;
    filenamePreset: FilenamePreset;
    filenameTemplate: string;
    filenameFormat?: "title-artist" | "artist-title" | "title";
    artistSubfolder?: boolean;
    albumSubfolder?: boolean;
    trackNumber: boolean;
    sfxEnabled: boolean;
    embedLyrics: boolean;
    embedMaxQualityCover: boolean;
    operatingSystem: "Windows" | "linux/MacOS";
    tidalQuality: "LOSSLESS" | "HI_RES_LOSSLESS";
    qobuzQuality: "6" | "7" | "27";
    amazonQuality: "original";
    autoOrder: string;
    autoQuality: "16" | "24";
    allowFallback: boolean;
    createPlaylistFolder: boolean;
    playlistOwnerFolderName: boolean;
    createM3u8File: boolean;
    useFirstArtistOnly: boolean;
    useSingleGenre: boolean;
    embedGenre: boolean;
    redownloadWithSuffix: boolean;
    separator: "comma" | "semicolon";
}

export const DEFAULT_SETTINGS: Settings = {
    downloadPath: "",
    downloader: "auto",
    linkResolver: "songlink",
    allowResolverFallback: true,
    theme: "zinc",
    themeMode: "dark",
    fontFamily: "plus-jakarta-sans",
    folderPreset: "artist-album",
    folderTemplate: "{artist}/{album}",
    filenamePreset: "track-title",
    filenameTemplate: "{track}. {title}",
    trackNumber: true,
    sfxEnabled: true,
    embedLyrics: true,
    embedMaxQualityCover: true,
    operatingSystem: "Windows",
    tidalQuality: "HI_RES_LOSSLESS",
    qobuzQuality: "27",
    amazonQuality: "original",
    autoOrder: "tidal-qobuz-amazon",
    autoQuality: "24",
    allowFallback: true,
    createPlaylistFolder: true,
    playlistOwnerFolderName: false,
    createM3u8File: true,
    useFirstArtistOnly: false,
    useSingleGenre: false,
    embedGenre: true,
    redownloadWithSuffix: false,
    separator: "comma",
};

const settings = ref<Settings>({ ...DEFAULT_SETTINGS });
const initialized = ref(false);

export function useSettings() {
    const load = async () => {
        try {
            const saved = await invoke<Settings | null>('load_settings');
            if (saved) {
                settings.value = { ...DEFAULT_SETTINGS, ...saved };
            } else {
                // If no settings exist yet, try to get default download path from Rust
                const defaultPath = await invoke<string>('get_default_download_path');
                settings.value.downloadPath = defaultPath;
            }
            initialized.value = true;
            applyTheme(settings.value.theme);
            applyThemeMode(settings.value.themeMode);
            applyFont(settings.value.fontFamily);
        } catch (err) {
            console.error("Failed to load settings:", err);
        }
    };

    const save = async (newSettings?: Settings) => {
        if (newSettings) settings.value = { ...newSettings };
        try {
            await invoke('save_settings', { settings: settings.value });
            applyTheme(settings.value.theme);
            applyThemeMode(settings.value.themeMode);
            applyFont(settings.value.fontFamily);
        } catch (err) {
            console.error("Failed to save settings:", err);
        }
    };

    const reset = async () => {
        settings.value = { ...DEFAULT_SETTINGS };
        const defaultPath = await invoke<string>('get_default_download_path');
        settings.value.downloadPath = defaultPath;
        await save();
    };

    onMounted(() => {
        if (!initialized.value) load();
    });

    return {
        settings,
        initialized,
        loadSettings: load,
        save,
        reset,
        applyTheme,
        applyThemeMode,
        applyFont
    };
}

// UI Helpers
export function applyTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
}

export function applyThemeMode(mode: "auto" | "light" | "dark") {
    const isDark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
}

export function applyFont(font: FontFamily) {
    document.body.style.fontFamily = font;
}
