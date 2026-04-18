<template>
  <!-- Mirrors ArtistInfo.tsx 1:1 -->
  <div class="sf-artist-view">
    <!-- Header card — with/without banner -->
    <div class="sf-card sf-card--overflow">
      <!-- WITH header image -->
      <template v-if="artistInfo.header">
        <div class="sf-artist-banner" :style="{ backgroundImage: `url(${artistInfo.header})` }">
          <div class="sf-banner-gradient" />
          <button v-if="onBack" class="sf-back-btn sf-back-btn--white" @click="$emit('back')">
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </button>
          <button class="sf-header-dl-btn" :disabled="downloadingHeader" @click="handleDownloadHeader" title="Download Header">
            <span v-if="downloadingHeader" class="sf-spinner" />
            <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </button>
          <div class="sf-banner-content">
            <div class="sf-banner-inner">
              <div v-if="artistInfo.images" class="sf-avatar-wrap group">
                <img :src="artistInfo.images" :alt="artistInfo.name" class="sf-avatar" />
                <div class="sf-avatar-overlay">
                  <button class="sf-avatar-dl-btn" :disabled="downloadingAvatar" @click="handleDownloadAvatar" title="Download Avatar">
                    <span v-if="downloadingAvatar" class="sf-spinner" />
                    <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </button>
                </div>
              </div>
              <div class="sf-artist-header-info">
                <p class="sf-label-white">Artist</p>
                <div class="sf-artist-title-row">
                  <h2 class="sf-artist-name sf-artist-name--white">{{ artistInfo.name }}</h2>
                  <svg v-if="artistInfo.verified" class="h-6 w-6 sf-verified" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <p v-if="artistInfo.biography" class="sf-bio sf-bio--white">{{ artistInfo.biography }}</p>
                <div class="sf-stats sf-stats--white">
                  <template v-if="artistInfo.rank"><span>#{{ artistInfo.rank }} rank</span><span>•</span></template>
                  <span>{{ artistInfo.followers.toLocaleString() }} {{ artistInfo.followers === 1 ? 'follower' : 'followers' }}</span>
                  <template v-if="artistInfo.listeners"><span>•</span><span>{{ artistInfo.listeners.toLocaleString() }} {{ artistInfo.listeners === 1 ? 'listener' : 'listeners' }}</span></template>
                </div>
                <div class="sf-stats sf-stats--white">
                  <span>{{ albumCountLabel }}</span><span>•</span><span>{{ trackCountLabel }}</span>
                  <template v-if="artistInfo.genres.length > 0"><span>•</span><span>{{ artistInfo.genres.join(', ') }}</span></template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- WITHOUT header image -->
      <template v-else>
        <div class="sf-card-content">
          <button v-if="onBack" class="sf-back-btn" @click="$emit('back')">
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </button>
          <div class="sf-artist-plain-meta">
            <div v-if="artistInfo.images" class="sf-avatar-wrap group">
              <img :src="artistInfo.images" :alt="artistInfo.name" class="sf-avatar" />
              <div class="sf-avatar-overlay">
                <button class="sf-avatar-dl-btn" :disabled="downloadingAvatar" @click="handleDownloadAvatar" title="Download Avatar">
                  <span v-if="downloadingAvatar" class="sf-spinner" />
                  <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
              </div>
            </div>
            <div class="sf-artist-header-info">
              <p class="sf-label-sm">Artist</p>
              <div class="sf-artist-title-row">
                <h2 class="sf-artist-name">{{ artistInfo.name }}</h2>
                <svg v-if="artistInfo.verified" class="h-6 w-6 sf-verified" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p v-if="artistInfo.biography" class="sf-bio">{{ artistInfo.biography }}</p>
              <div class="sf-stats">
                <template v-if="artistInfo.rank"><span>#{{ artistInfo.rank }} rank</span><span>•</span></template>
                <span>{{ artistInfo.followers.toLocaleString() }} {{ artistInfo.followers === 1 ? 'follower' : 'followers' }}</span>
                <template v-if="artistInfo.listeners"><span>•</span><span>{{ artistInfo.listeners.toLocaleString() }} {{ artistInfo.listeners === 1 ? 'listener' : 'listeners' }}</span></template>
              </div>
              <div class="sf-stats">
                <span>{{ albumCountLabel }}</span><span>•</span><span>{{ trackCountLabel }}</span>
                <template v-if="artistInfo.genres.length > 0"><span>•</span><span>{{ artistInfo.genres.join(', ') }}</span></template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Tabs: Albums / All Tracks / Gallery -->
    <div class="sf-tabs-border">
      <div class="sf-tabs">
        <button class="sf-tab" :class="{ 'sf-tab--active': activeTab === 'albums' }" @click="activeTab = 'albums'">Albums</button>
        <button class="sf-tab" :class="{ 'sf-tab--active': activeTab === 'tracks' }" @click="activeTab = 'tracks'">All Tracks</button>
        <button v-if="hasGallery" class="sf-tab" :class="{ 'sf-tab--active': activeTab === 'gallery' }" @click="activeTab = 'gallery'">Gallery</button>
      </div>
    </div>

    <!-- Gallery Tab -->
    <div v-if="activeTab === 'gallery' && hasGallery" class="sf-gallery-section">
      <div class="sf-section-header">
        <h3 class="sf-section-title">Gallery ({{ artistInfo.gallery!.length.toLocaleString() }})</h3>
        <button class="sf-btn-icon-outline" :disabled="downloadingAllGallery" @click="handleDownloadAllGallery" title="Download All Gallery">
          <span v-if="downloadingAllGallery" class="sf-spinner" />
          <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
      </div>
      <div class="sf-gallery-grid">
        <div v-for="(imageUrl, idx) in artistInfo.gallery" :key="idx" class="sf-gallery-item group">
          <div class="sf-gallery-thumb">
            <img :src="imageUrl" :alt="`${artistInfo.name} gallery ${idx + 1}`" class="sf-gallery-img" />
            <div class="sf-gallery-overlay">
              <button class="sf-gallery-dl" :disabled="downloadingGalleryIndex === idx" @click="handleDownloadGalleryImage(imageUrl, idx)" :title="`Download Image ${idx + 1}`">
                <span v-if="downloadingGalleryIndex === idx" class="sf-spinner" />
                <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Albums Tab -->
    <div v-if="activeTab === 'albums' && albumList.length > 0" class="sf-albums-section">
      <div class="sf-section-header">
        <h3 class="sf-section-title">Discography</h3>
        <div class="sf-section-actions">
          <button class="sf-btn-primary sf-btn--sm" :disabled="isDownloading" @click="$emit('downloadAll')">
            <span v-if="isDownloading && bulkDownloadType === 'all'" class="sf-spinner" />
            <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Discography
          </button>
          <button v-if="selectedTracks.length > 0" class="sf-btn-secondary sf-btn--sm" :disabled="isDownloading" @click="$emit('downloadSelected')">
            <span v-if="isDownloading && bulkDownloadType === 'selected'" class="sf-spinner" />
            <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Selected ({{ selectedTracks.length }})
          </button>
        </div>
      </div>

      <!-- Album type filters -->
      <div v-if="albumFilters.length > 1" class="sf-album-filters">
        <button v-for="filter in albumFilters" :key="filter"
          class="sf-filter-btn"
          :class="{ 'sf-filter-btn--active': activeAlbumFilter === filter }"
          @click="activeAlbumFilter = filter">
          {{ formatAlbumFilterLabel(filter) }}
        </button>
      </div>

      <div class="sf-discography-grid">
        <div v-for="album in filteredAlbums" :key="album.id" class="sf-album-card group" @click="$emit('albumClick', { id: album.id, name: album.name, external_urls: album.external_urls })">
          <div class="sf-album-thumb-wrap">
            <input type="checkbox"
              v-if="getAlbumTracks(album.name).filter(t => t.spotify_id).length > 0"
              class="sf-album-check"
              :class="{ 'sf-album-check--visible': isAlbumSelected(album.name) }"
              :checked="isAlbumSelected(album.name)"
              @click.stop
              @change="$emit('toggleSelectAll', getAlbumTracks(album.name))" />
            <img v-if="album.images" :src="album.images" :alt="album.name" class="sf-album-thumb" />
            <span class="sf-album-type-badge">{{ album.album_type }}</span>
          </div>
          <h4 class="sf-album-card-name">{{ album.name }}</h4>
          <div class="sf-album-card-sub">
            <span>{{ album.release_date?.split('-')[0] }}</span>
            <template v-if="album.total_tracks"><span>•</span><span>{{ album.total_tracks }} {{ album.total_tracks === 1 ? 'track' : 'tracks' }}</span></template>
          </div>
        </div>
      </div>
      <div v-if="filteredAlbums.length === 0" class="sf-filter-empty">No releases found for the selected discography filter.</div>
    </div>

    <!-- Tracks Tab -->
    <div v-if="activeTab === 'tracks' && trackList.length > 0" class="sf-tracks-section">
      <div class="sf-section-header">
        <h3 class="sf-section-title">All Tracks</h3>
        <div class="sf-section-actions">
          <button class="sf-btn-primary sf-btn--sm" :disabled="isDownloading" @click="$emit('downloadAll')">
            <span v-if="isDownloading && bulkDownloadType === 'all'" class="sf-spinner" />
            <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download All
          </button>
          <button v-if="selectedTracks.length > 0" class="sf-btn-secondary sf-btn--sm" :disabled="isDownloading" @click="$emit('downloadSelected')">
            Download Selected ({{ selectedTracks.length.toLocaleString() }})
          </button>
          <button v-if="isBulkDownloadingLyrics !== undefined" class="sf-btn-icon-outline" title="Download All Lyrics" :disabled="isBulkDownloadingLyrics" @click="$emit('downloadAllLyrics')">
            <span v-if="isBulkDownloadingLyrics" class="sf-spinner" />
            <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </button>
          <button v-if="downloadedTracks.size > 0" class="sf-btn-icon-outline" title="Open Folder" @click="$emit('openFolder')">
            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
      <SfDownloadProgress v-if="isDownloading" :progress="downloadProgress" :current-track="currentDownloadInfo" @stop="$emit('stopDownload')" />
      <SfSearchAndSort :search-query="searchQuery" :sort-by="sortBy" @search-change="$emit('searchChange', $event)" @sort-change="$emit('sortChange', $event)" />
      <SfTrackList
        :tracks="trackList" :search-query="searchQuery" :sort-by="sortBy"
        :selected-tracks="selectedTracks" :downloaded-tracks="downloadedTracks"
        :failed-tracks="failedTracks" :skipped-tracks="skippedTracks"
        :downloading-track="downloadingTrack" :is-downloading="isDownloading"
        :current-page="currentPage" :items-per-page="itemsPerPage"
        :show-checkboxes="true" :hide-album-column="false"
        :folder-name="artistInfo.name" :is-artist-discography="true"
        :downloaded-lyrics="downloadedLyrics" :failed-lyrics="failedLyrics"
        :skipped-lyrics="skippedLyrics" :downloading-lyrics-track="downloadingLyricsTrack"
        :downloaded-covers="downloadedCovers" :failed-covers="failedCovers"
        :skipped-covers="skippedCovers" :downloading-cover-track="downloadingCoverTrack"
        :on-download-lyrics="onDownloadLyrics"
        :on-download-cover="onDownloadCovers"
        :on-artist-click="(a: any) => $emit('artistClick', a)"
        :on-album-click="(a: any) => $emit('albumClick', a)"
        :on-track-click="onTrackClick"
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
import { downloadHeader, downloadGalleryImage, downloadAvatar } from '../utils/api';
import { useSettingsStore } from '../stores/useSettingsStore';
import { toastWithSound as toast } from '../utils/toast-with-sound';
import type { TrackMetadata, TrackAvailability } from '../types/api';

interface AlbumListItem {
  id: string; name: string; images: string; release_date: string;
  album_type: string; external_urls: string; total_tracks?: number;
}
interface ArtistInfoData {
  name: string; images: string; header?: string; gallery?: string[];
  followers: number; total_albums?: number; genres: string[];
  biography?: string; verified?: boolean; listeners?: number; rank?: number;
}

const props = defineProps<{
  artistInfo: ArtistInfoData;
  albumList: AlbumListItem[];
  trackList: TrackMetadata[];
  searchQuery: string; sortBy: string;
  selectedTracks: string[];
  downloadedTracks: Set<string>; failedTracks: Set<string>; skippedTracks: Set<string>;
  downloadingTrack: string | null; isDownloading: boolean;
  bulkDownloadType: 'all' | 'selected' | null;
  downloadProgress: number; currentDownloadInfo: { name: string; artists: string } | null;
  currentPage: number; itemsPerPage: number;
  downloadedLyrics?: Set<string>; failedLyrics?: Set<string>; skippedLyrics?: Set<string>;
  downloadingLyricsTrack?: string | null;
  downloadedCovers?: Set<string>; failedCovers?: Set<string>; skippedCovers?: Set<string>;
  downloadingCoverTrack?: string | null;
  isBulkDownloadingCovers?: boolean; isBulkDownloadingLyrics?: boolean; isMetadataLoading?: boolean;
  onDownloadLyrics?: (spotifyId: string, name: string, artists: string, albumName: string, folderName?: string, isArtistDiscography?: boolean, position?: number, albumArtist?: string, releaseDate?: string, discNumber?: number) => void;
  onDownloadCovers?: (coverUrl: string, trackName: string, artistName: string, albumName: string, folderName?: string, isArtistDiscography?: boolean, position?: number, trackId?: string, albumArtist?: string, releaseDate?: string, discNumber?: number) => void;
  onTrackClick?: (track: TrackMetadata) => void;
  onBack?: boolean;
}>();

defineEmits([
  'searchChange','sortChange','toggleTrack','toggleSelectAll','downloadTrack','downloadLyrics','downloadCover',
  'downloadAll','downloadSelected','downloadAllLyrics','downloadAllCovers','stopDownload','openFolder',
  'pageChange','artistClick','albumClick','trackClick','back',
]);

const settingsStore = useSettingsStore();
const activeTab = ref<'albums' | 'tracks' | 'gallery'>('albums');
const activeAlbumFilter = ref('all');
const downloadingHeader = ref(false);
const downloadingAvatar_ = ref(false);
const downloadingGalleryIndex = ref<number | null>(null);
const downloadingAllGallery = ref(false);

const hasGallery = computed(() => props.artistInfo.gallery && props.artistInfo.gallery.length > 0);

const displayedAlbumCount = computed(() => props.artistInfo.total_albums || props.albumList.length);
const fetchedAlbumCount = computed(() => props.albumList.length);
const totalAlbumCount = computed(() => props.artistInfo.total_albums || fetchedAlbumCount.value);
const totalTrackCount = computed(() => props.albumList.reduce((s, a) => s + (a.total_tracks || 0), 0));
const fetchedTrackCount = computed(() => props.trackList.length);

const albumCountLabel = computed(() => {
  if ((props.isMetadataLoading ?? false) && totalAlbumCount.value > 0 && fetchedAlbumCount.value < totalAlbumCount.value) {
    return `${fetchedAlbumCount.value.toLocaleString()} / ${totalAlbumCount.value.toLocaleString()} albums`;
  }
  const n = displayedAlbumCount.value;
  return `${n.toLocaleString()} ${n === 1 ? 'album' : 'albums'}`;
});
const trackCountLabel = computed(() => {
  const resolved = totalTrackCount.value > 0 ? totalTrackCount.value : fetchedTrackCount.value;
  if ((props.isMetadataLoading ?? false) && totalTrackCount.value > 0 && fetchedTrackCount.value < totalTrackCount.value) {
    return `${fetchedTrackCount.value.toLocaleString()} / ${totalTrackCount.value.toLocaleString()} tracks`;
  }
  return `${resolved.toLocaleString()} ${resolved === 1 ? 'track' : 'tracks'}`;
});

const albumFilterCounts = computed(() => {
  const counts = new Map<string, number>([['all', props.albumList.length]]);
  for (const album of props.albumList) {
    const type = (album.album_type || '').trim().toLowerCase();
    if (!type) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return counts;
});
const albumFilters = computed(() => {
  const unique = Array.from(new Set(props.albumList.map(a => (a.album_type || '').trim().toLowerCase()).filter(Boolean)));
  return ['all', ...unique];
});
const filteredAlbums = computed(() => {
  if (activeAlbumFilter.value === 'all') return props.albumList;
  return props.albumList.filter(a => (a.album_type || '').trim().toLowerCase() === activeAlbumFilter.value);
});

function formatAlbumFilterLabel(value: string): string {
  const count = albumFilterCounts.value.get(value) || 0;
  if (value === 'all') return `All (${count})`;
  const label = value.split(/[_\s]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  return `${label} (${count})`;
}

function getAlbumTracks(albumName: string): TrackMetadata[] {
  return props.trackList.filter(t => t.album_name === albumName);
}
function isAlbumSelected(albumName: string): boolean {
  const tracks = getAlbumTracks(albumName).filter(t => t.spotify_id);
  return tracks.length > 0 && tracks.every(t => props.selectedTracks.includes(t.spotify_id!));
}

async function handleDownloadHeader() {
  if (!props.artistInfo.header) return;
  downloadingHeader.value = true;
  try {
    const response = await downloadHeader({ header_url: props.artistInfo.header, artist_name: props.artistInfo.name, output_dir: settingsStore.settings.downloadPath });
    if (response.success) { if (response.already_exists) toast.info('Header already exists'); else toast.success('Header downloaded successfully'); }
    else toast.error(response.error || 'Failed to download header');
  } catch (e) { toast.error(`Error downloading header: ${e}`); }
  finally { downloadingHeader.value = false; }
}
async function handleDownloadAvatar() {
  if (!props.artistInfo.images) return;
  downloadingAvatar_.value = true;
  try {
    const response = await downloadAvatar({ avatar_url: props.artistInfo.images, artist_name: props.artistInfo.name, output_dir: settingsStore.settings.downloadPath });
    if (response.success) { if (response.already_exists) toast.info('Avatar already exists'); else toast.success('Avatar downloaded successfully'); }
    else toast.error(response.error || 'Failed to download avatar');
  } catch (e) { toast.error(`Error downloading avatar: ${e}`); }
  finally { downloadingAvatar_.value = false; }
}
const downloadingAvatar = computed(() => downloadingAvatar_.value);

async function handleDownloadGalleryImage(imageUrl: string, index: number) {
  downloadingGalleryIndex.value = index;
  try {
    const response = await downloadGalleryImage({ image_url: imageUrl, artist_name: props.artistInfo.name, image_index: index, output_dir: settingsStore.settings.downloadPath });
    if (response.success) { if (response.already_exists) toast.info(`Gallery image ${index + 1} already exists`); else toast.success(`Gallery image ${index + 1} downloaded successfully`); }
    else toast.error(response.error || `Failed to download gallery image ${index + 1}`);
  } catch (e) { toast.error(`Error downloading gallery image ${index + 1}: ${e}`); }
  finally { downloadingGalleryIndex.value = null; }
}

async function handleDownloadAllGallery() {
  if (!props.artistInfo.gallery?.length) return;
  downloadingAllGallery.value = true;
  try {
    let successCount = 0, existsCount = 0, failCount = 0;
    for (let i = 0; i < props.artistInfo.gallery.length; i++) {
      try {
        const response = await downloadGalleryImage({ image_url: props.artistInfo.gallery[i], artist_name: props.artistInfo.name, image_index: i, output_dir: settingsStore.settings.downloadPath });
        if (response.success) { if (response.already_exists) existsCount++; else successCount++; }
        else failCount++;
      } catch { failCount++; }
    }
    if (failCount === 0) {
      if (existsCount > 0 && successCount > 0) toast.success(`${successCount} images downloaded, ${existsCount} already existed`);
      else if (existsCount > 0) toast.info(`All ${existsCount} images already exist`);
      else toast.success(`All ${successCount} gallery images downloaded successfully`);
    } else { toast.error(`${failCount} images failed to download`); }
  } catch (e) { toast.error(`Error downloading gallery images: ${e}`); }
  finally { downloadingAllGallery.value = false; }
}
</script>

<style scoped>
.sf-artist-view { display: flex; flex-direction: column; gap: 1.5rem; }
.sf-card { border: 1px solid hsl(var(--border)); border-radius: 0.5rem; background: hsl(var(--card)); }
.sf-card--overflow { overflow: hidden; }
.sf-back-btn { position: absolute; top: 1rem; right: 1rem; z-index: 10; background: none; border: none; cursor: pointer; color: hsl(var(--foreground)); padding: 0.25rem; }
.sf-back-btn--white { color: white; }
.sf-back-btn--white:hover { background: rgba(255,255,255,0.2); border-radius: 4px; }
.sf-card-content { padding: 1.5rem; position: relative; }
/* Banner */
.sf-artist-banner { position: relative; width: 100%; height: 16rem; background-size: cover; background-position: center; }
.sf-banner-gradient { position: absolute; inset: 0; background: linear-gradient(to top, black 0%, rgba(0,0,0,0.5) 50%, transparent 100%); }
.sf-header-dl-btn { position: absolute; bottom: 1rem; right: 1rem; z-index: 10; display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; cursor: pointer; }
.sf-header-dl-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); }
.sf-banner-content { position: relative; padding: 1.5rem 1.5rem 1.25rem; display: flex; align-items: flex-end; height: 100%; }
.sf-banner-inner { display: flex; gap: 1.5rem; align-items: flex-end; width: 100%; }
/* Avatar */
.sf-avatar-wrap { position: relative; flex-shrink: 0; }
.sf-avatar { width: 12rem; height: 12rem; border-radius: 9999px; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
.sf-avatar-overlay { position: absolute; inset: 0; border-radius: 9999px; background: rgba(0,0,0,0); display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.sf-avatar-wrap:hover .sf-avatar-overlay { background: rgba(0,0,0,0.5); }
.sf-avatar-dl-btn { opacity: 0; display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; cursor: pointer; transition: opacity 0.15s; }
.sf-avatar-wrap:hover .sf-avatar-dl-btn { opacity: 1; }
/* Artist info */
.sf-artist-plain-meta { display: flex; gap: 1.5rem; align-items: flex-start; }
.sf-artist-header-info { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.sf-label-sm { font-size: 0.875rem; font-weight: 500; }
.sf-label-white { font-size: 0.875rem; font-weight: 500; color: rgba(255,255,255,0.8); }
.sf-artist-title-row { display: flex; align-items: center; gap: 0.5rem; }
.sf-artist-name { font-size: 2.25rem; font-weight: 700; }
.sf-artist-name--white { color: white; }
.sf-verified { color: hsl(220 90% 56%); }
.sf-bio { font-size: 0.875rem; color: hsl(var(--muted-foreground)); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }
.sf-bio--white { color: rgba(255,255,255,0.9); }
.sf-stats { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; flex-wrap: wrap; }
.sf-stats--white { color: rgba(255,255,255,0.9); }
/* Tabs */
.sf-tabs-border { border-bottom: 1px solid hsl(var(--border)); }
.sf-tabs { display: flex; gap: 1.5rem; }
.sf-tab { padding-bottom: 0.75rem; font-size: 0.875rem; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -1px; color: hsl(var(--muted-foreground)); background: none; border-left: none; border-right: none; border-top: none; cursor: pointer; transition: color 0.15s; }
.sf-tab:hover { color: hsl(var(--foreground)); }
.sf-tab--active { border-bottom-color: hsl(var(--primary)); color: hsl(var(--foreground)); }
/* Section headers */
.sf-section-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
.sf-section-title { font-size: 1.5rem; font-weight: 700; }
.sf-section-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
/* Gallery */
.sf-gallery-section { display: flex; flex-direction: column; gap: 1rem; }
.sf-gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
@media (min-width: 768px) { .sf-gallery-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .sf-gallery-grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1280px) { .sf-gallery-grid { grid-template-columns: repeat(5, 1fr); } }
.sf-gallery-item { position: relative; }
.sf-gallery-thumb { position: relative; aspect-ratio: 1; border-radius: 0.375rem; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.sf-gallery-img { width: 100%; height: 100%; object-fit: cover; }
.sf-gallery-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0); display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.sf-gallery-thumb:hover .sf-gallery-overlay { background: rgba(0,0,0,0.5); }
.sf-gallery-dl { opacity: 0; display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; cursor: pointer; transition: opacity 0.15s; }
.sf-gallery-thumb:hover .sf-gallery-dl { opacity: 1; }
/* Albums grid */
.sf-albums-section, .sf-tracks-section { display: flex; flex-direction: column; gap: 1rem; }
.sf-album-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.sf-filter-btn { padding: 0.25rem 0.625rem; font-size: 0.8rem; border-radius: 6px; border: 1px solid hsl(var(--border)); background: transparent; cursor: pointer; transition: background 0.15s, color 0.15s; }
.sf-filter-btn:hover { background: hsl(var(--muted)); }
.sf-filter-btn--active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: transparent; }
.sf-discography-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
@media (min-width: 640px) { .sf-discography-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 768px) { .sf-discography-grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1024px) { .sf-discography-grid { grid-template-columns: repeat(5, 1fr); } }
.sf-album-card { cursor: pointer; position: relative; }
.sf-album-thumb-wrap { position: relative; margin-bottom: 0.5rem; }
.sf-album-thumb { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 0.375rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: box-shadow 0.15s; }
.sf-album-card:hover .sf-album-thumb { box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
.sf-album-check { position: absolute; top: 0.5rem; left: 0.5rem; z-index: 20; opacity: 0; transition: opacity 0.15s; width: 1rem; height: 1rem; cursor: pointer; }
.sf-album-check--visible, .sf-album-card:hover .sf-album-check { opacity: 1; }
.sf-album-type-badge { position: absolute; bottom: 0.5rem; right: 0.5rem; font-size: 0.625rem; text-transform: uppercase; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,0.6); color: white; backdrop-filter: blur(2px); }
.sf-album-card-name { font-weight: 600; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sf-album-card-sub { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: hsl(var(--muted-foreground)); margin-top: 2px; }
.sf-filter-empty { border: 1px dashed hsl(var(--border)); border-radius: 0.5rem; padding: 1.5rem; font-size: 0.875rem; color: hsl(var(--muted-foreground)); }
/* Shared buttons */
.sf-btn-primary { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border-radius: 6px; border: none; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); cursor: pointer; font-size: 0.875rem; font-weight: 500; }
.sf-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.sf-btn-secondary { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border-radius: 6px; border: none; background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); cursor: pointer; font-size: 0.875rem; font-weight: 500; }
.sf-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.sf-btn--sm { padding: 0.25rem 0.75rem; font-size: 0.8rem; }
.sf-btn-icon-outline { display: flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border-radius: 6px; border: 1px solid hsl(var(--border)); background: transparent; cursor: pointer; color: hsl(var(--foreground)); }
.sf-btn-icon-outline:hover:not(:disabled) { background: hsl(var(--muted)); }
.sf-btn-icon-outline:disabled { opacity: 0.5; cursor: not-allowed; }
.sf-spinner { width: 1rem; height: 1rem; border-radius: 9999px; border: 2px solid currentColor; border-top-color: transparent; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
