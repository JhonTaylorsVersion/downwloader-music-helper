/**
 * settings.ts — Migrated from @/lib/settings in the original Wails project.
 * All settings utilities, presets, and constants needed by SfSettingsPage and composables.
 */

// Re-export types from the composable so everything is consistent
export type {
  Settings,
  FontFamily,
  FolderPreset,
  FilenamePreset,
} from '../composables/useSettings';

import type { Settings, FontFamily, FolderPreset, FilenamePreset } from '../composables/useSettings';
import { DEFAULT_SETTINGS } from '../composables/useSettings';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FOLDER_PRESETS: Record<FolderPreset, { label: string; template: string }> = {
  "none": { label: "No Subfolder", template: "" },
  "artist": { label: "Artist", template: "{artist}" },
  "album": { label: "Album", template: "{album}" },
  "year-album": { label: "[Year] Album", template: "[{year}] {album}" },
  "year-artist-album": { label: "[Year] Artist - Album", template: "[{year}] {artist} - {album}" },
  "artist-album": { label: "Artist / Album", template: "{artist}/{album}" },
  "artist-year-album": { label: "Artist / [Year] Album", template: "{artist}/[{year}] {album}" },
  "artist-year-nested-album": { label: "Artist / Year / Album", template: "{artist}/{year}/{album}" },
  "album-artist": { label: "Album Artist", template: "{album_artist}" },
  "album-artist-album": { label: "Album Artist / Album", template: "{album_artist}/{album}" },
  "album-artist-year-album": { label: "Album Artist / [Year] Album", template: "{album_artist}/[{year}] {album}" },
  "album-artist-year-nested-album": { label: "Album Artist / Year / Album", template: "{album_artist}/{year}/{album}" },
  "year": { label: "Year", template: "{year}" },
  "year-artist": { label: "Year / Artist", template: "{year}/{artist}" },
  "custom": { label: "Custom...", template: "{artist}/{album}" },
};

export const FILENAME_PRESETS: Record<FilenamePreset, { label: string; template: string }> = {
  "title": { label: "Title", template: "{title}" },
  "title-artist": { label: "Title - Artist", template: "{title} - {artist}" },
  "artist-title": { label: "Artist - Title", template: "{artist} - {title}" },
  "track-title": { label: "Track. Title", template: "{track}. {title}" },
  "track-title-artist": { label: "Track. Title - Artist", template: "{track}. {title} - {artist}" },
  "track-artist-title": { label: "Track. Artist - Title", template: "{track}. {artist} - {title}" },
  "title-album-artist": { label: "Title - Album Artist", template: "{title} - {album_artist}" },
  "track-title-album-artist": { label: "Track. Title - Album Artist", template: "{track}. {title} - {album_artist}" },
  "artist-album-title": { label: "Artist - Album - Title", template: "{artist} - {album} - {title}" },
  "track-dash-title": { label: "Track - Title", template: "{track} - {title}" },
  "disc-track-title": { label: "Disc-Track. Title", template: "{disc}-{track}. {title}" },
  "disc-track-title-artist": { label: "Disc-Track. Title - Artist", template: "{disc}-{track}. {title} - {artist}" },
  "custom": { label: "Custom...", template: "{title} - {artist}" },
};

export const TEMPLATE_VARIABLES = [
  { key: "{title}", description: "Track title", example: "Shake It Off" },
  { key: "{artist}", description: "Track artist", example: "Taylor Swift" },
  { key: "{album}", description: "Album name", example: "1989" },
  { key: "{album_artist}", description: "Album artist", example: "Taylor Swift" },
  { key: "{track}", description: "Track number", example: "01" },
  { key: "{disc}", description: "Disc number", example: "1" },
  { key: "{year}", description: "Release year", example: "2014" },
  { key: "{date}", description: "Release date (YYYY-MM-DD)", example: "2014-10-27" },
  { key: "{isrc}", description: "Track ISRC", example: "USUM71412345" },
];

export const FONT_OPTIONS: { value: FontFamily; label: string; fontFamily: string }[] = [
  { value: "bricolage-grotesque", label: "Bricolage Grotesque", fontFamily: '"Bricolage Grotesque", system-ui, sans-serif' },
  { value: "dm-sans", label: "DM Sans", fontFamily: '"DM Sans", system-ui, sans-serif' },
  { value: "figtree", label: "Figtree", fontFamily: '"Figtree", system-ui, sans-serif' },
  { value: "geist-sans", label: "Geist Sans", fontFamily: '"Geist", system-ui, sans-serif' },
  { value: "google-sans", label: "Google Sans", fontFamily: '"Google Sans", system-ui, sans-serif' },
  { value: "inter", label: "Inter", fontFamily: '"Inter", system-ui, sans-serif' },
  { value: "jetbrains-mono", label: "JetBrains Mono", fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
  { value: "manrope", label: "Manrope", fontFamily: '"Manrope", system-ui, sans-serif' },
  { value: "noto-sans", label: "Noto Sans", fontFamily: '"Noto Sans", system-ui, sans-serif' },
  { value: "nunito-sans", label: "Nunito Sans", fontFamily: '"Nunito Sans", system-ui, sans-serif' },
  { value: "outfit", label: "Outfit", fontFamily: '"Outfit", system-ui, sans-serif' },
  { value: "plus-jakarta-sans", label: "Plus Jakarta Sans", fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { value: "poppins", label: "Poppins", fontFamily: '"Poppins", system-ui, sans-serif' },
  { value: "public-sans", label: "Public Sans", fontFamily: '"Public Sans", system-ui, sans-serif' },
  { value: "raleway", label: "Raleway", fontFamily: '"Raleway", system-ui, sans-serif' },
  { value: "roboto", label: "Roboto", fontFamily: '"Roboto", system-ui, sans-serif' },
  { value: "space-grotesk", label: "Space Grotesk", fontFamily: '"Space Grotesk", system-ui, sans-serif' },
];

import type { TemplateData } from '../types/settings';
export { parseTemplate } from '../types/settings';
export type { TemplateData };

// ---------------------------------------------------------------------------
// Theme / Font helpers (migrated from applyThemeMode / applyFont)
// ---------------------------------------------------------------------------

export function applyThemeMode(mode: 'auto' | 'light' | 'dark'): void {
  if (mode === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }
}

export function applyFont(fontFamily: FontFamily): void {
  const font = FONT_OPTIONS.find(f => f.value === fontFamily);
  if (font) {
    document.documentElement.style.setProperty('--font-sans', font.fontFamily);
    document.body.style.fontFamily = font.fontFamily;
  }
}

// ---------------------------------------------------------------------------
// Settings CRUD (mirrors original lib/settings.ts functions)
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'spotiflac-settings';

export function getSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed, operatingSystem: detectOS() };
    }
  } catch {/* ignore */}
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: Settings): Promise<void> {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function getSettingsWithDefaults(): Promise<Settings> {
  const settings = getSettings();
  if (!settings.downloadPath) {
    // Attempt to get default download path via Tauri
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const defaultPath = await invoke<string>('get_default_download_path');
      if (defaultPath) settings.downloadPath = defaultPath;
    } catch {/* no backend support yet — use empty string */}
  }
  return settings;
}

export async function resetToDefaultSettings(): Promise<Settings> {
  const defaults = { ...DEFAULT_SETTINGS, operatingSystem: detectOS() };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
  return defaults;
}

function detectOS(): 'Windows' | 'linux/MacOS' {
  const platform = window.navigator.platform.toLowerCase();
  return platform.includes('win') ? 'Windows' : 'linux/MacOS';
}
