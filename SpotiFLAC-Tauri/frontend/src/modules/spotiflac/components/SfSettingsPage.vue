<template>
  <!-- Mirrors SettingsPage.tsx 1:1 -->
  <div class="sf-settings-page">
    <!-- Header -->
    <div class="sf-settings-header">
      <h1 class="sf-title">Settings</h1>
      <div class="sf-header-actions">
        <button class="sf-btn-outline" @click="handleOpenConfigFolder">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Open Config Folder
        </button>
        <button class="sf-btn-outline" @click="showResetConfirm = true">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
          Reset to Default
        </button>
        <button class="sf-btn-primary" @click="handleSave">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Changes
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="sf-tabs-bar">
      <button class="sf-tab" :class="{ 'sf-tab--active': activeTab === 'general' }" @click="activeTab = 'general'">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        General
      </button>
      <button class="sf-tab" :class="{ 'sf-tab--active': activeTab === 'files' }" @click="activeTab = 'files'">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        File Management
      </button>
      <button class="sf-tab" :class="{ 'sf-tab--active': activeTab === 'api' }" @click="activeTab = 'api'">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Status
      </button>
    </div>

    <!-- Tab bodies -->
    <div class="sf-tab-body">
      <!-- General Tab -->
      <div v-if="activeTab === 'general'" class="sf-grid-2">
        <div class="sf-section">
          <!-- Download Path -->
          <div class="sf-field">
            <label class="sf-label" for="download-path">Download Path</label>
            <div class="sf-input-row">
              <input id="download-path" class="sf-input" :value="tempSettings.downloadPath" @input="update('downloadPath', ($event.target as HTMLInputElement).value)" placeholder="C:\Users\YourUsername\Music" />
              <button class="sf-btn-primary" @click="handleBrowseFolder">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                Browse
              </button>
            </div>
          </div>

          <!-- Theme Mode -->
          <div class="sf-field">
            <label class="sf-label" for="theme-mode">Mode</label>
            <select id="theme-mode" class="sf-select" :value="tempSettings.themeMode" @change="update('themeMode', ($event.target as HTMLSelectElement).value as any)">
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <!-- Accent Theme -->
          <div class="sf-field">
            <label class="sf-label" for="theme">Accent</label>
            <select id="theme" class="sf-select" :value="tempSettings.theme" @change="update('theme', ($event.target as HTMLSelectElement).value)">
              <option v-for="t in themes" :key="t.name" :value="t.name">{{ t.label }}</option>
            </select>
          </div>

          <!-- Font -->
          <div class="sf-field">
            <label class="sf-label" for="font">Font</label>
            <select id="font" class="sf-select" :value="tempSettings.fontFamily" @change="update('fontFamily', ($event.target as HTMLSelectElement).value as any)">
              <option v-for="font in FONT_OPTIONS" :key="font.value" :value="font.value">{{ font.label }}</option>
            </select>
          </div>

          <!-- Sound Effects toggle -->
          <div class="sf-toggle-row">
            <input id="sfx-enabled" type="checkbox" class="sf-toggle" :checked="tempSettings.sfxEnabled" @change="update('sfxEnabled', ($event.target as HTMLInputElement).checked)" />
            <label for="sfx-enabled" class="sf-toggle-label">Sound Effects</label>
          </div>
        </div>

        <div class="sf-section">
          <!-- Link Resolver -->
          <div class="sf-field">
            <label class="sf-label" for="link-resolver">Link Resolver</label>
            <div class="sf-input-row">
              <select id="link-resolver" class="sf-select sf-select--fit" :value="tempSettings.linkResolver" @change="update('linkResolver', ($event.target as HTMLSelectElement).value as any)">
                <option value="songlink">Songlink</option>
                <option value="songstats">Songstats</option>
              </select>
              <div class="sf-toggle-row">
                <input id="resolver-fallback" type="checkbox" class="sf-toggle" :checked="tempSettings.allowResolverFallback" @change="update('allowResolverFallback', ($event.target as HTMLInputElement).checked)" />
                <label for="resolver-fallback" class="sf-toggle-label">Allow Fallback</label>
              </div>
            </div>
          </div>

          <!-- Source -->
          <div class="sf-field">
            <label class="sf-label" for="downloader">Source</label>
            <div class="sf-input-row sf-wrap">
              <select id="downloader" class="sf-select sf-select--fit" :value="tempSettings.downloader" @change="update('downloader', ($event.target as HTMLSelectElement).value as any)">
                <option value="auto">Auto</option>
                <option value="tidal">Tidal</option>
                <option value="qobuz">Qobuz</option>
                <option value="amazon">Amazon Music</option>
              </select>

              <!-- Auto order + quality -->
              <template v-if="tempSettings.downloader === 'auto'">
                <select class="sf-select sf-select--fit" :value="tempSettings.autoOrder || 'tidal-qobuz-amazon'" @change="update('autoOrder', ($event.target as HTMLSelectElement).value as any)">
                  <option value="tidal-qobuz-amazon">Tidal → Qobuz → Amazon</option>
                  <option value="tidal-amazon-qobuz">Tidal → Amazon → Qobuz</option>
                  <option value="qobuz-tidal-amazon">Qobuz → Tidal → Amazon</option>
                  <option value="qobuz-amazon-tidal">Qobuz → Amazon → Tidal</option>
                  <option value="amazon-tidal-qobuz">Amazon → Tidal → Qobuz</option>
                  <option value="amazon-qobuz-tidal">Amazon → Qobuz → Tidal</option>
                  <option value="tidal-qobuz">Tidal → Qobuz</option>
                  <option value="tidal-amazon">Tidal → Amazon</option>
                  <option value="qobuz-tidal">Qobuz → Tidal</option>
                  <option value="qobuz-amazon">Qobuz → Amazon</option>
                  <option value="amazon-tidal">Amazon → Tidal</option>
                  <option value="amazon-qobuz">Amazon → Qobuz</option>
                </select>
                <select class="sf-select sf-select--fit" :value="tempSettings.autoQuality || '16'" @change="update('autoQuality', ($event.target as HTMLSelectElement).value as any)">
                  <option value="16">16-bit/44.1kHz</option>
                  <option value="24">24-bit/48kHz</option>
                </select>
              </template>

              <!-- Tidal quality -->
              <select v-if="tempSettings.downloader === 'tidal'" class="sf-select sf-select--fit" :value="tempSettings.tidalQuality" @change="update('tidalQuality', ($event.target as HTMLSelectElement).value as any)">
                <option value="LOSSLESS">16-bit/44.1kHz</option>
                <option value="HI_RES_LOSSLESS">24-bit/48kHz</option>
              </select>

              <!-- Qobuz quality -->
              <select v-if="tempSettings.downloader === 'qobuz'" class="sf-select sf-select--fit" :value="tempSettings.qobuzQuality" @change="update('qobuzQuality', ($event.target as HTMLSelectElement).value as any)">
                <option value="6">16-bit/44.1kHz</option>
                <option value="27">24-bit/48kHz - 192kHz</option>
              </select>

              <!-- Amazon label -->
              <span v-if="tempSettings.downloader === 'amazon'" class="sf-quality-label">16-bit - 24-bit/44.1kHz - 192kHz</span>
            </div>

            <!-- Quality fallback toggle -->
            <div v-if="showFallbackOption" class="sf-toggle-row mt-2">
              <input id="allow-fallback" type="checkbox" class="sf-toggle" :checked="tempSettings.allowFallback" @change="update('allowFallback', ($event.target as HTMLInputElement).checked)" />
              <label for="allow-fallback" class="sf-toggle-label">Allow Quality Fallback (16-bit)</label>
            </div>
          </div>

          <div class="sf-divider" />

          <!-- Embed toggles -->
          <div class="sf-toggle-row">
            <input id="embed-lyrics" type="checkbox" class="sf-toggle" :checked="tempSettings.embedLyrics" @change="update('embedLyrics', ($event.target as HTMLInputElement).checked)" />
            <label for="embed-lyrics" class="sf-toggle-label">Embed Lyrics</label>
          </div>
          <div class="sf-toggle-row">
            <input id="embed-cover" type="checkbox" class="sf-toggle" :checked="tempSettings.embedMaxQualityCover" @change="update('embedMaxQualityCover', ($event.target as HTMLInputElement).checked)" />
            <label for="embed-cover" class="sf-toggle-label">Embed Max Quality Cover</label>
          </div>
          <div class="sf-toggle-row">
            <input id="embed-genre" type="checkbox" class="sf-toggle" :checked="tempSettings.embedGenre" @change="update('embedGenre', ($event.target as HTMLInputElement).checked)" />
            <label for="embed-genre" class="sf-toggle-label">Embed Genre</label>
          </div>
          <div v-if="tempSettings.embedGenre" class="sf-toggle-row">
            <input id="use-single-genre" type="checkbox" class="sf-toggle" :checked="tempSettings.useSingleGenre" @change="update('useSingleGenre', ($event.target as HTMLInputElement).checked)" />
            <label for="use-single-genre" class="sf-toggle-label">Use Single Genre</label>
          </div>
        </div>
      </div>

      <!-- File Management Tab -->
      <div v-if="activeTab === 'files'" class="sf-grid-2">
        <div class="sf-section">
          <!-- Folder structure -->
          <div class="sf-field">
            <label class="sf-label">Folder Structure</label>
            <div class="sf-input-row">
              <select class="sf-select sf-select--fit" :value="tempSettings.folderPreset" @change="onFolderPresetChange(($event.target as HTMLSelectElement).value as any)">
                <option v-for="[key, { label }] in Object.entries(FOLDER_PRESETS)" :key="key" :value="key">{{ label }}</option>
              </select>
              <input v-if="tempSettings.folderPreset === 'custom'" class="sf-input" :value="tempSettings.folderTemplate" @input="update('folderTemplate', ($event.target as HTMLInputElement).value)" placeholder="{artist}/{album}" />
            </div>
            <p v-if="tempSettings.folderTemplate" class="sf-preview">Preview: <code>{{ folderPreview }}/</code></p>
          </div>

          <div class="sf-toggle-row">
            <input id="playlist-folder" type="checkbox" class="sf-toggle" :checked="tempSettings.createPlaylistFolder" @change="update('createPlaylistFolder', ($event.target as HTMLInputElement).checked)" />
            <label for="playlist-folder" class="sf-toggle-label">Playlist Folder</label>
          </div>
          <div class="sf-toggle-row">
            <input id="owner-folder" type="checkbox" class="sf-toggle" :checked="tempSettings.playlistOwnerFolderName" @change="update('playlistOwnerFolderName', ($event.target as HTMLInputElement).checked)" />
            <label for="owner-folder" class="sf-toggle-label">Playlist Owner Folder Name</label>
          </div>
          <div class="sf-toggle-row">
            <input id="m3u8" type="checkbox" class="sf-toggle" :checked="tempSettings.createM3u8File" @change="update('createM3u8File', ($event.target as HTMLInputElement).checked)" />
            <label for="m3u8" class="sf-toggle-label">Create M3U8 Playlist File</label>
          </div>
          <div class="sf-toggle-row">
            <input id="first-artist" type="checkbox" class="sf-toggle" :checked="tempSettings.useFirstArtistOnly" @change="update('useFirstArtistOnly', ($event.target as HTMLInputElement).checked)" />
            <label for="first-artist" class="sf-toggle-label">Use First Artist Only</label>
          </div>
          <div class="sf-toggle-row">
            <input id="redownload-suffix" type="checkbox" class="sf-toggle" :checked="tempSettings.redownloadWithSuffix" @change="update('redownloadWithSuffix', ($event.target as HTMLInputElement).checked)" />
            <label for="redownload-suffix" class="sf-toggle-label">Redownload With Suffix</label>
          </div>
        </div>

        <div class="sf-section">
          <!-- Filename Format -->
          <div class="sf-field">
            <label class="sf-label">Filename Format</label>
            <div class="sf-input-row">
              <select class="sf-select sf-select--fit" :value="tempSettings.filenamePreset" @change="onFilenamePresetChange(($event.target as HTMLSelectElement).value as any)">
                <option v-for="[key, { label }] in Object.entries(FILENAME_PRESETS)" :key="key" :value="key">{{ label }}</option>
              </select>
              <input v-if="tempSettings.filenamePreset === 'custom'" class="sf-input" :value="tempSettings.filenameTemplate" @input="update('filenameTemplate', ($event.target as HTMLInputElement).value)" placeholder="{track}. {title}" />
            </div>
          </div>

          <!-- Separator -->
          <div class="sf-field">
            <label class="sf-label">Separator</label>
            <select class="sf-select sf-select--fit" :value="tempSettings.separator" @change="update('separator', ($event.target as HTMLSelectElement).value as any)">
              <option value="comma">Comma (,)</option>
              <option value="semicolon">Semicolon (;)</option>
            </select>
          </div>

          <p v-if="tempSettings.filenameTemplate" class="sf-preview">Preview: <code>{{ filenamePreview }}.flac</code></p>
        </div>
      </div>

      <!-- API Status Tab -->
      <SfApiStatusTab v-if="activeTab === 'api'" />
    </div>

    <!-- Reset Confirmation Dialog -->
    <div v-if="showResetConfirm" class="sf-dialog-backdrop" @click.self="showResetConfirm = false">
      <div class="sf-dialog">
        <h2 class="sf-dialog-title">Reset to Default?</h2>
        <p class="sf-dialog-desc">This will reset all settings to their default values. Your custom configurations will be lost.</p>
        <div class="sf-dialog-footer">
          <button class="sf-btn-outline" @click="showResetConfirm = false">Cancel</button>
          <button class="sf-btn-primary" @click="handleReset">Reset</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import SfApiStatusTab from './SfApiStatusTab.vue';
import { useSettingsStore } from '../stores/useSettingsStore';
import {
  saveSettings, resetToDefaultSettings, getSettingsWithDefaults,
  applyThemeMode, applyFont,
  FONT_OPTIONS, FOLDER_PRESETS, FILENAME_PRESETS,
  type Settings as SettingsType, type FolderPreset, type FilenamePreset,
} from '../utils/settings';
import { applyTheme, themes } from '../utils/themes';
import { toastWithSound as toast } from '../utils/toast-with-sound';
import { invoke } from '@tauri-apps/api/core';

const props = defineProps<{
  onUnsavedChangesChange?: (v: boolean) => void;
  onResetRequest?: (fn: () => void) => void;
}>();

const settingsStore = useSettingsStore();
const activeTab = ref<'general' | 'files' | 'api'>('general');
const showResetConfirm = ref(false);

const savedSettings = ref<SettingsType>(JSON.parse(JSON.stringify(settingsStore.settings)));
const tempSettings = ref<SettingsType>(JSON.parse(JSON.stringify(settingsStore.settings)));

const hasUnsavedChanges = computed(() => JSON.stringify(savedSettings.value) !== JSON.stringify(tempSettings.value));

watch(hasUnsavedChanges, v => props.onUnsavedChangesChange?.(v));

// Live-apply visual settings as temp changes
watch([() => tempSettings.value.themeMode, () => tempSettings.value.theme, () => tempSettings.value.fontFamily], () => {
  applyThemeMode(tempSettings.value.themeMode);
  applyTheme(tempSettings.value.theme);
  applyFont(tempSettings.value.fontFamily);
});

onMounted(async () => {
  props.onResetRequest?.(() => {
    const fresh = JSON.parse(JSON.stringify(settingsStore.settings));
    tempSettings.value = fresh;
    savedSettings.value = fresh;
  });
  if (!savedSettings.value.downloadPath) {
    const defaults = await getSettingsWithDefaults();
    savedSettings.value = defaults;
    tempSettings.value = defaults;
    await saveSettings(defaults);
    settingsStore.loadSettings();
  }
});

function update<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
  tempSettings.value = { ...tempSettings.value, [key]: value };
}

async function handleSave() {
  await saveSettings(tempSettings.value);
  savedSettings.value = JSON.parse(JSON.stringify(tempSettings.value));
  settingsStore.loadSettings();
  toast.success('Settings saved');
  props.onUnsavedChangesChange?.(false);
}

async function handleReset() {
  const defaults = await resetToDefaultSettings();
  tempSettings.value = defaults;
  savedSettings.value = defaults;
  applyThemeMode(defaults.themeMode);
  applyTheme(defaults.theme);
  applyFont(defaults.fontFamily);
  settingsStore.loadSettings();
  showResetConfirm.value = false;
  toast.success('Settings reset to default');
}

async function handleBrowseFolder() {
  try {
    const selectedPath = await invoke<string>('select_folder', { currentPath: tempSettings.value.downloadPath || '' });
    if (selectedPath?.trim()) update('downloadPath', selectedPath);
  } catch (e) {
    toast.error(`Error selecting folder: ${e}`);
  }
}

async function handleOpenConfigFolder() {
  try { await invoke('open_config_folder'); }
  catch (e) { toast.error(`Failed to open config folder: ${e}`); }
}

const showFallbackOption = computed(() =>
  (tempSettings.value.downloader === 'tidal' && tempSettings.value.tidalQuality === 'HI_RES_LOSSLESS') ||
  (tempSettings.value.downloader === 'qobuz' && tempSettings.value.qobuzQuality === '27') ||
  (tempSettings.value.downloader === 'auto' && tempSettings.value.autoQuality === '24'),
);

function onFolderPresetChange(value: FolderPreset) {
  const preset = FOLDER_PRESETS[value];
  tempSettings.value = {
    ...tempSettings.value,
    folderPreset: value,
    folderTemplate: value === 'custom' ? tempSettings.value.folderTemplate || preset.template : preset.template,
  };
}
function onFilenamePresetChange(value: FilenamePreset) {
  const preset = FILENAME_PRESETS[value];
  tempSettings.value = {
    ...tempSettings.value,
    filenamePreset: value,
    filenameTemplate: value === 'custom' ? tempSettings.value.filenameTemplate || preset.template : preset.template,
  };
}

const SEP = computed(() => tempSettings.value.separator === 'comma' ? 'Kendrick Lamar, SZA' : 'Kendrick Lamar; SZA');
function applyPreviewVars(template: string): string {
  return template
    .replace(/\{artist\}/g, SEP.value)
    .replace(/\{album\}/g, 'Black Panther')
    .replace(/\{album_artist\}/g, 'Kendrick Lamar')
    .replace(/\{title\}/g, 'All The Stars')
    .replace(/\{track\}/g, '01')
    .replace(/\{disc\}/g, '1')
    .replace(/\{year\}/g, '2018')
    .replace(/\{date\}/g, '2018-02-09')
    .replace(/\{isrc\}/g, 'USUM71801234');
}
const folderPreview = computed(() => applyPreviewVars(tempSettings.value.folderTemplate || ''));
const filenamePreview = computed(() => applyPreviewVars(tempSettings.value.filenameTemplate || ''));
</script>

<style scoped>
.sf-settings-page { display: flex; flex-direction: column; gap: 1rem; height: 100%; }
.sf-settings-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.sf-title { font-size: 1.5rem; font-weight: 700; }
.sf-header-actions { display: flex; gap: 0.5rem; }
.sf-tabs-bar { display: flex; gap: 0.5rem; border-bottom: 1px solid hsl(var(--border)); flex-shrink: 0; }
.sf-tab { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; font-size: 0.875rem; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer; color: hsl(var(--muted-foreground)); transition: color 0.15s; border-radius: 4px 4px 0 0; }
.sf-tab:hover { color: hsl(var(--foreground)); background: hsl(var(--muted) / 0.3); }
.sf-tab--active { border-bottom-color: hsl(var(--primary)); color: hsl(var(--foreground)); background: hsl(var(--muted) / 0.5); }
.sf-tab-body { flex: 1; overflow-y: auto; padding-top: 1rem; }
.sf-grid-2 { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 768px) { .sf-grid-2 { grid-template-columns: repeat(2, 1fr); } }
.sf-section { display: flex; flex-direction: column; gap: 1rem; }
.sf-field { display: flex; flex-direction: column; gap: 0.375rem; }
.sf-label { font-size: 0.875rem; font-weight: 500; }
.sf-input-row { display: flex; gap: 0.5rem; align-items: center; }
.sf-wrap { flex-wrap: wrap; }
.sf-input { flex: 1; padding: 0.375rem 0.75rem; border: 1px solid hsl(var(--border)); border-radius: 6px; background: hsl(var(--background)); color: hsl(var(--foreground)); font-size: 0.875rem; outline: none; }
.sf-input:focus { border-color: hsl(var(--primary)); }
.sf-select { padding: 0.375rem 0.75rem; border: 1px solid hsl(var(--border)); border-radius: 6px; background: hsl(var(--background)); color: hsl(var(--foreground)); font-size: 0.875rem; cursor: pointer; outline: none; }
.sf-select--fit { width: fit-content; }
.sf-toggle-row { display: flex; align-items: center; gap: 0.75rem; }
.sf-toggle { width: 1rem; height: 1rem; cursor: pointer; accent-color: hsl(var(--primary)); }
.sf-toggle-label { font-size: 0.875rem; cursor: pointer; }
.sf-quality-label { font-size: 0.875rem; padding: 0.375rem 0.75rem; border: 1px solid hsl(var(--border)); border-radius: 6px; background: hsl(var(--muted) / 0.3); color: hsl(var(--muted-foreground)); white-space: nowrap; }
.sf-divider { border-top: 1px solid hsl(var(--border)); margin-top: 1rem; }
.sf-preview { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }
.sf-preview code { font-family: monospace; }
.mt-2 { margin-top: 0.5rem; }
/* Buttons */
.sf-btn-primary { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border-radius: 6px; border: none; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); cursor: pointer; font-size: 0.875rem; font-weight: 500; }
.sf-btn-outline { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid hsl(var(--border)); background: transparent; color: hsl(var(--foreground)); cursor: pointer; font-size: 0.875rem; transition: background 0.15s; }
.sf-btn-outline:hover { background: hsl(var(--muted)); }
/* Dialog */
.sf-dialog-backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
.sf-dialog { background: hsl(var(--background)); border: 1px solid hsl(var(--border)); border-radius: 0.5rem; padding: 1.5rem; max-width: 28rem; width: 100%; display: flex; flex-direction: column; gap: 1rem; }
.sf-dialog-title { font-size: 1.125rem; font-weight: 700; }
.sf-dialog-desc { font-size: 0.875rem; color: hsl(var(--muted-foreground)); }
.sf-dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
