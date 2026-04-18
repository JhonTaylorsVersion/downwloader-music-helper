import { defineStore } from 'pinia';
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
    autoOrder: "tidal-qobuz-amazon" | "tidal-amazon-qobuz" | "qobuz-tidal-amazon" | "qobuz-amazon-tidal" | "amazon-tidal-qobuz" | "amazon-qobuz-tidal" | string;
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

function detectOS(): "Windows" | "linux/MacOS" {
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes('win')) {
        return "Windows";
    }
    return "linux/MacOS";
}

export const DEFAULT_SETTINGS: Settings = {
    downloadPath: "",
    downloader: "auto",
    linkResolver: "songlink",
    allowResolverFallback: true,
    theme: "yellow",
    themeMode: "auto",
    fontFamily: "google-sans",
    folderPreset: "none",
    folderTemplate: "",
    filenamePreset: "title-artist",
    filenameTemplate: "{title} - {artist}",
    trackNumber: false,
    sfxEnabled: true,
    embedLyrics: false,
    embedMaxQualityCover: false,
    operatingSystem: detectOS(),
    tidalQuality: "LOSSLESS",
    qobuzQuality: "6",
    amazonQuality: "original",
    autoOrder: "tidal-qobuz-amazon",
    autoQuality: "16",
    allowFallback: true,
    createPlaylistFolder: true,
    playlistOwnerFolderName: false,
    createM3u8File: false,
    useFirstArtistOnly: false,
    useSingleGenre: false,
    embedGenre: false,
    redownloadWithSuffix: false,
    separator: "semicolon"
};

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: { ...DEFAULT_SETTINGS } as Settings,
        isLoaded: false
    }),
    actions: {
        async loadSettings() {
            try {
                const stored = localStorage.getItem('spotiflac-settings');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    this.settings = { ...DEFAULT_SETTINGS, ...parsed };
                } else {
                    // Try to fetch default music path using a Tauri command (needs backend support)
                    // let's simulate or invoke open dialog etc. later
                    this.settings = { ...DEFAULT_SETTINGS };
                }
                this.isLoaded = true;
                this.applyTheme(this.settings.themeMode);
            } catch (e) {
                console.error("Failed to load settings from local storage:", e);
                this.settings = { ...DEFAULT_SETTINGS };
                this.isLoaded = true;
            }
        },
        async updateSettings(partial: Partial<Settings>) {
            this.settings = { ...this.settings, ...partial };
            localStorage.setItem('spotiflac-settings', JSON.stringify(this.settings));
            
            if (partial.themeMode) {
                this.applyTheme(partial.themeMode);
            }
            if (partial.fontFamily) {
                this.applyFont(partial.fontFamily);
            }
        },
        async resetToDefaultSettings() {
            const path = this.settings.downloadPath; // preserve path
            this.settings = { ...DEFAULT_SETTINGS, downloadPath: path };
            localStorage.setItem('spotiflac-settings', JSON.stringify(this.settings));
        },
        applyTheme(mode: "auto" | "light" | "dark") {
            if (mode === "auto") {
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (prefersDark) {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
            } else if (mode === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        },
        applyFont(fontFamily: FontFamily) {
            // Implementation for font change, you might need to import FONT_OPTIONS or maintain a map
        }
    }
});
