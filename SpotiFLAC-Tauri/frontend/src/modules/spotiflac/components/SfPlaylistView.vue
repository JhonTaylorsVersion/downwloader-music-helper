<template>
  <!-- Mirrors PlaylistInfo.tsx 1:1 -->
  <div class="sf-playlist-view">
    <div class="sf-card sf-relative">
      <button v-if="onBack" class="sf-back-btn" @click="$emit('back')">
        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </button>

      <div class="sf-card-content">
        <div class="sf-playlist-meta">
          <!-- Playlist cover -->
          <div v-if="playlistInfo.cover" class="sf-cover-wrap">
            <img :src="playlistInfo.cover" :alt="playlistName" class="sf-cover" />
            <div class="sf-cover-overlay">
              <button class="sf-cover-dl-btn" :disabled="downloadingPlaylistCover" @click="handleDownloadPlaylistCover" title="Download Separate Playlist Cover">
                <span v-if="downloadingPlaylistCover" class="sf-spinner" />
                <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="sf-playlist-info">
            <div class="sf-playlist-header">
              <p class="sf-label-sm">Playlist</p>
              <h2 class="sf-playlist-name">{{ playlistName }}</h2>
              <p v-if="playlistInfo.description" class="sf-description">{{ playlistInfo.description }}</p>
              <div class="sf-playlist-sub">
                <div class="sf-owner">
                  <img v-if="playlistInfo.owner.images" :src="playlistInfo.owner.images" :alt="playlistInfo.owner.display_name" class="sf-owner-img" />
                  <span class="sf-owner-name">{{ playlistInfo.owner.display_name }}</span>
                </div>
                <span>•</span>
                <span>{{ trackCountLabel }}</span>
                <span>•</span>
                <span>{{ playlistInfo.followers.total.toLocaleString() }} {{ playlistInfo.followers.total === 1 ? 'follower' : 'followers' }}</span>
              </div>
            </div>

            <div class="sf-playlist-actions">
              <button class="sf-btn-primary" :disabled="isDownloading" @click="$emit('downloadAll')">
                <span v-if="isDownloading && bulkDownloadType === 'all'" class="sf-spinner" />
                <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download All
              </button>
              <button v-if="selectedTracks.length > 0" class="sf-btn-secondary" :disabled="isDownloading" @click="$emit('downloadSelected')">
                <span v-if="isDownloading && bulkDownloadType === 'selected'" class="sf-spinner" />
                <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Selected ({{ selectedTracks.length.toLocaleString() }})
              </button>
              <button v-if="onDownloadAllLyrics" class="sf-btn-icon-outline" title="Download All Lyrics" :disabled="isBulkDownloadingLyrics" @click="$emit('downloadAllLyrics')">
                <span v-if="isBulkDownloadingLyrics" class="sf-spinner" />
                <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </button>
              <button v-if="onDownloadAllCovers" class="sf-btn-icon-outline" title="Download All Separate Covers" :disabled="isBulkDownloadingCovers" @click="$emit('downloadAllCovers')">
                <span v-if="isBulkDownloadingCovers" class="sf-spinner" />
                <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
              <button v-if="downloadedTracks.size > 0" class="sf-btn-icon-outline" title="Open Folder" @click="$emit('openFolder')">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>

            <SfDownloadProgress v-if="isDownloading" :progress="downloadProgress" :current-track="currentDownloadInfo" @stop="$emit('stopDownload')" />
          </div>
        </div>
      </div>
    </div>

    <div class="sf-tracklist-section">
      <SfSearchAndSort :search-query="searchQuery" :sort-by="sortBy" @search-change="$emit('searchChange', $event)" @sort-change="$emit('sortChange', $event)" />
      <SfTrackList
        :tracks="trackList"
        :search-query="searchQuery"
        :sort-by="sortBy"
        :selected-tracks="selectedTracks"
        :downloaded-tracks="downloadedTracks"
        :failed-tracks="failedTracks"
        :skipped-tracks="skippedTracks"
        :downloading-track="downloadingTrack"
        :is-downloading="isDownloading"
        :current-page="currentPage"
        :items-per-page="itemsPerPage"
        :show-checkboxes="true"
        :hide-album-column="false"
        :folder-name="playlistFolderName"
        :downloaded-lyrics="downloadedLyrics"
        :failed-lyrics="failedLyrics"
        :skipped-lyrics="skippedLyrics"
        :downloading-lyrics-track="downloadingLyricsTrack"
        :downloaded-covers="downloadedCovers"
        :failed-covers="failedCovers"
        :skipped-covers="skippedCovers"
        :downloading-cover-track="downloadingCoverTrack"
        :on-download-lyrics="onDownloadAllLyrics"
        :on-download-cover="onDownloadAllCovers"
        :on-artist-click="(a: any) => $emit('artistClick', a)"
        :on-album-click="(a: any) => $emit('albumClick', a)"
        :on-track-click="(t: any) => $emit('trackClick', t)"
        @toggle-track="$emit('toggleTrack', $event)"
        @toggle-select-all="$emit('toggleSelectAll', $event)"
        @download-track="(...args) => $emit('downloadTrack', ...args)"
        @download-lyrics="(...args) => $emit('downloadLyrics', ...args)"
        @download-cover="(...args) => $emit('downloadCover', ...args)"
        @page-change="$emit('pageChange', $event)"
        @artist-click="$emit('artistClick', $event)"
        @album-click="$emit('albumClick', $event)"
        @track-click="$emit('trackClick', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import SfSearchAndSort from './SfSearchAndSort.vue';
import SfTrackList from './SfTrackList.vue';
import SfDownloadProgress from './SfDownloadProgress.vue';
import { buildPlaylistFolderName } from '../utils/playlist';
import { downloadCover } from '../utils/api';
import { useSettingsStore } from '../stores/useSettingsStore';
import { joinPath, sanitizePath } from '../utils/utils';
import { parseTemplate, type TemplateData } from '../utils/settings';
import { toastWithSound as toast } from '../utils/toast-with-sound';
import type { TrackMetadata, TrackAvailability } from '../types/api';

interface PlaylistOwner { name: string; display_name: string; images: string; }
interface PlaylistInfoData {
  owner: PlaylistOwner;
  tracks: { total: number };
  followers: { total: number };
  cover?: string;
  description?: string;
}

const props = defineProps<{
  playlistInfo: PlaylistInfoData;
  trackList: TrackMetadata[];
  searchQuery: string;
  sortBy: string;
  selectedTracks: string[];
  downloadedTracks: Set<string>;
  failedTracks: Set<string>;
  skippedTracks: Set<string>;
  downloadingTrack: string | null;
  isDownloading: boolean;
  bulkDownloadType: 'all' | 'selected' | null;
  downloadProgress: number;
  currentDownloadInfo: { name: string; artists: string } | null;
  currentPage: number;
  itemsPerPage: number;
  downloadedLyrics?: Set<string>;
  failedLyrics?: Set<string>;
  skippedLyrics?: Set<string>;
  downloadingLyricsTrack?: string | null;
  downloadedCovers?: Set<string>;
  failedCovers?: Set<string>;
  skippedCovers?: Set<string>;
  downloadingCoverTrack?: string | null;
  isBulkDownloadingCovers?: boolean;
  isBulkDownloadingLyrics?: boolean;
  isMetadataLoading?: boolean;
  onDownloadAllLyrics?: (spotifyId: string, name: string, artists: string, albumName: string, folderName?: string, isArtistDiscography?: boolean, position?: number, albumArtist?: string, releaseDate?: string, discNumber?: number) => void;
  onDownloadAllCovers?: (coverUrl: string, trackName: string, artistName: string, albumName: string, folderName?: string, isArtistDiscography?: boolean, position?: number, trackId?: string, albumArtist?: string, releaseDate?: string, discNumber?: number) => void;
  onBack?: boolean;
}>();

defineEmits([
  'searchChange','sortChange','toggleTrack','toggleSelectAll','downloadTrack','downloadLyrics','downloadCover',
  'downloadAll','downloadSelected','downloadAllLyrics','downloadAllCovers','stopDownload','openFolder',
  'pageChange','artistClick','albumClick','trackClick','back',
]);

const settingsStore = useSettingsStore();
const downloadingPlaylistCover = ref(false);

const playlistName = computed(() => props.playlistInfo.owner.name);
const playlistFolderName = computed(() =>
  buildPlaylistFolderName(playlistName.value, props.playlistInfo.owner.display_name, settingsStore.settings.playlistOwnerFolderName),
);

const fetchedTrackCount = computed(() => props.trackList.length);
const totalTrackCount = computed(() => props.playlistInfo.tracks.total);
const showStreamingProgress = computed(() =>
  (props.isMetadataLoading ?? false) && totalTrackCount.value > 0 && fetchedTrackCount.value < totalTrackCount.value,
);
const trackCountLabel = computed(() => {
  if (showStreamingProgress.value) return `${fetchedTrackCount.value.toLocaleString()} / ${totalTrackCount.value.toLocaleString()} tracks`;
  const n = Math.max(totalTrackCount.value, fetchedTrackCount.value);
  return `${n.toLocaleString()} ${n === 1 ? 'track' : 'tracks'}`;
});

async function handleDownloadPlaylistCover() {
  if (!props.playlistInfo.cover) return;
  downloadingPlaylistCover.value = true;
  try {
    const s = settingsStore.settings;
    const os = s.operatingSystem;
    const placeholder = '__SLASH_PLACEHOLDER__';
    let outputDir = s.downloadPath;
    const pfn = playlistFolderName.value;
    const templateData: TemplateData = {
      artist: '', album: '', album_artist: '',
      title: playlistName.value.replace(/\//g, placeholder),
      playlist: pfn.replace(/\//g, placeholder),
    };
    if (s.createPlaylistFolder && pfn) {
      outputDir = joinPath(os, outputDir, sanitizePath(pfn.replace(/\//g, ' '), os));
    }
    if (s.folderTemplate) {
      const folderPath = parseTemplate(s.folderTemplate, templateData);
      if (folderPath) {
        const parts = folderPath.split('/').filter((p: string) => p.trim());
        for (const part of parts) {
          outputDir = joinPath(os, outputDir, sanitizePath(part.replace(new RegExp(placeholder, 'g'), ' '), os));
        }
      }
    }
    const response = await downloadCover({
      cover_url: props.playlistInfo.cover!, track_name: playlistName.value,
      artist_name: '', album_name: '', album_artist: '', release_date: '',
      output_dir: outputDir, filename_format: 'title', track_number: false, position: 0, disc_number: 0,
    });
    if (response.success) {
      if (response.already_exists) toast.info('Cover already exists');
      else toast.success('Separate playlist cover downloaded');
    } else {
      toast.error(response.error || 'Failed to download cover');
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to download cover');
  } finally {
    downloadingPlaylistCover.value = false;
  }
}
</script>

<style scoped>
.sf-playlist-view { display: flex; flex-direction: column; gap: 1.5rem; }
.sf-card { border: 1px solid hsl(var(--border)); border-radius: 0.5rem; background: hsl(var(--card)); }
.sf-relative { position: relative; }
.sf-back-btn { position: absolute; top: 1rem; right: 1rem; z-index: 10; background: none; border: none; cursor: pointer; color: hsl(var(--foreground)); padding: 0.25rem; }
.sf-card-content { padding: 1.5rem; }
.sf-playlist-meta { display: flex; gap: 1.5rem; align-items: flex-start; }
.sf-cover-wrap { position: relative; flex-shrink: 0; width: 12rem; height: 12rem; }
.sf-cover { width: 12rem; height: 12rem; border-radius: 0.375rem; box-shadow: 0 4px 16px rgba(0,0,0,0.2); object-fit: cover; }
.sf-cover-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); border-radius: 0.375rem; opacity: 0; transition: opacity 0.15s; }
.sf-cover-wrap:hover .sf-cover-overlay { opacity: 1; }
.sf-cover-dl-btn { display: flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border-radius: 0.375rem; border: none; background: hsl(var(--secondary)); cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.sf-playlist-info { flex: 1; display: flex; flex-direction: column; gap: 1rem; }
.sf-playlist-header { display: flex; flex-direction: column; gap: 0.5rem; }
.sf-label-sm { font-size: 0.875rem; font-weight: 500; }
.sf-playlist-name { font-size: 2.25rem; font-weight: 700; }
.sf-description { font-size: 0.875rem; color: hsl(var(--muted-foreground)); }
.sf-playlist-sub { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
.sf-owner { display: flex; align-items: center; gap: 0.5rem; }
.sf-owner-img { width: 1.25rem; height: 1.25rem; border-radius: 9999px; object-fit: cover; }
.sf-owner-name { font-weight: 500; }
.sf-playlist-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
.sf-btn-primary { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border-radius: 6px; border: none; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); cursor: pointer; font-size: 0.875rem; font-weight: 500; }
.sf-btn-primary:hover:not(:disabled) { opacity: 0.9; }
.sf-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.sf-btn-secondary { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border-radius: 6px; border: none; background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); cursor: pointer; font-size: 0.875rem; font-weight: 500; }
.sf-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.sf-btn-icon-outline { display: flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border-radius: 6px; border: 1px solid hsl(var(--border)); background: transparent; cursor: pointer; color: hsl(var(--foreground)); transition: background 0.15s; }
.sf-btn-icon-outline:hover:not(:disabled) { background: hsl(var(--muted)); }
.sf-btn-icon-outline:disabled { opacity: 0.5; cursor: not-allowed; }
.sf-tracklist-section { display: flex; flex-direction: column; gap: 1rem; }
.sf-spinner { width: 1rem; height: 1rem; border-radius: 9999px; border: 2px solid currentColor; border-top-color: transparent; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
