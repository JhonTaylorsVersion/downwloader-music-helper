<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  SfSearchBar,
  SfAlbumView,
  SfTrackInfo,
  SfPlaylistView,
  SfArtistView,
} from './';
import { useMetadata } from '../composables/useMetadata';
import { useDownload } from '../composables/useDownload';
import { useHistory } from '../composables/useHistory';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft } from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const {
  loading,
  metadata,
  handleFetchMetadata,
  resetMetadata,
  showAlbumDialog,
  setShowAlbumDialog,
  selectedAlbum,
  handleConfirmAlbumFetch,
  showVpnAdviceDialog,
  setShowVpnAdviceDialog,
  handleAlbumClick,
  handleArtistClick,
  loadFromCache,
} = useMetadata();

const {
  isDownloading,
  downloadProgress,
  currentDownloadInfo,
  downloadedTracks,
  downloadTrack,
  downloadBatch,
  getFolderNameForMetadata,
} = useDownload();

const { fetchHistory, deleteFetchHistoryItem } = useHistory();

const url = ref('');
const searchMode = ref(false);
const region = ref('US');
const selectedTracks = ref<string[]>([]);

const handleFetch = () => {
  void handleFetchMetadata(url.value);
};

const handleFetchUrl = (resultUrl: string) => {
  url.value = resultUrl;
  void handleFetchMetadata(resultUrl);
};

const handleBack = () => {
  resetMetadata();
  url.value = '';
  selectedTracks.value = [];
};

const toggleTrack = (id: string) => {
  if (selectedTracks.value.includes(id)) {
    selectedTracks.value = selectedTracks.value.filter((t) => t !== id);
  } else {
    selectedTracks.value.push(id);
  }
};

const toggleSelectAll = () => {
  if (!metadata.value || !metadata.value.track_list) return;

  if (selectedTracks.value.length === metadata.value.track_list.length) {
    selectedTracks.value = [];
  } else {
    selectedTracks.value = metadata.value.track_list.map((t: any) => t.spotify_id || t.id);
  }
};

const handleDownloadBatch = () => {
  if (!metadata.value) return;
  const tracksToDownload = metadata.value.track_list.filter((t: any) =>
    selectedTracks.value.includes(t.spotify_id || t.id),
  );
  void downloadBatch(tracksToDownload, getFolderNameForMetadata(metadata.value));
};

const handleDownloadAll = () => {
  if (!metadata.value) return;
  void downloadBatch(metadata.value.track_list, getFolderNameForMetadata(metadata.value));
};

const handleDownloadSingleTrack = () => {
  if (!metadata.value || !('track' in metadata.value)) return;
  void downloadTrack(metadata.value.track);
};

const handleHistoryRestore = (event: Event) => {
  const cachedData = (event as CustomEvent<string>).detail;
  if (typeof cachedData === 'string' && cachedData) {
    loadFromCache(cachedData);
  }
};

onMounted(() => {
  window.addEventListener('spotiflac:history-select', handleHistoryRestore);
});

onUnmounted(() => {
  window.removeEventListener('spotiflac:history-select', handleHistoryRestore);
});

const currentView = computed(() => {
  if (!metadata.value) return 'history';
  if ('track' in metadata.value) return 'track';
  if ('album_info' in metadata.value) return 'album';
  if ('playlist_info' in metadata.value) return 'playlist';
  if ('artist_info' in metadata.value) return 'artist';
  return 'history';
});

const hasMetadataResult = computed(() => currentView.value !== 'history');
</script>

<template>
  <div class="space-y-6">
    <div class="flex gap-4 items-center">
      <Button
        v-if="!searchMode && currentView !== 'history'"
        variant="ghost"
        size="icon"
        class="h-10 w-10 shrink-0"
        @click="handleBack"
      >
        <ChevronLeft class="h-6 w-6" />
      </Button>

      <SfSearchBar
        v-model:url="url"
        v-model:search-mode="searchMode"
        v-model:region="region"
        :loading="loading"
        :history="fetchHistory"
        :has-result="hasMetadataResult"
        @fetch="handleFetch"
        @fetch-url="handleFetchUrl"
        @history-select="item => handleFetchUrl(item.url)"
        @history-remove="id => deleteFetchHistoryItem(id)"
      />
    </div>

    <div v-if="!searchMode">
      <div v-if="loading && !metadata" class="flex items-center justify-center py-8">
        <Spinner />
        <span class="ml-2 text-muted-foreground">Fetching...</span>
      </div>

      <template v-else>
        <SfTrackInfo
          v-if="currentView === 'track'"
          :track="metadata.track"
          :is-downloading="isDownloading"
          :is-downloaded="downloadedTracks.has(metadata.track.spotify_id)"
          @download="handleDownloadSingleTrack"
          @album-click="handleAlbumClick"
          @artist-click="artist => void handleArtistClick(artist)"
        />

        <SfAlbumView
          v-else-if="currentView === 'album'"
          :album-info="metadata.album_info"
          :track-list="metadata.track_list"
          :show-back="true"
          :is-downloading="isDownloading"
          :download-progress="downloadProgress"
          :current-download-info="currentDownloadInfo"
          :selected-tracks="selectedTracks"
          :downloaded-tracks="downloadedTracks"
          @download-all="handleDownloadAll"
          @download-selected="handleDownloadBatch"
          @toggle-track="toggleTrack"
          @toggle-select-all="toggleSelectAll"
          @artist-click="(artist: { id: string; name: string; external_urls: string }) => void handleArtistClick(artist)"
          @track-click="(track: { external_urls?: string }) => track.external_urls && handleFetchUrl(track.external_urls)"
          @back="handleBack"
        />

        <SfPlaylistView
          v-else-if="currentView === 'playlist'"
          :playlist-info="metadata.playlist_info"
          :track-list="metadata.track_list"
          :is-downloading="isDownloading"
          :download-progress="downloadProgress"
          :current-download-info="currentDownloadInfo"
          :downloaded-tracks="downloadedTracks"
          :selected-tracks="selectedTracks"
          @download-all="handleDownloadAll"
          @download-selected="handleDownloadBatch"
          @toggle-track="toggleTrack"
          @toggle-select-all="toggleSelectAll"
          @artist-click="(artist: { id: string; name: string; external_urls: string }) => void handleArtistClick(artist)"
          @track-click="(track: { external_urls?: string }) => track.external_urls && handleFetchUrl(track.external_urls)"
        />

        <SfArtistView
          v-else-if="currentView === 'artist'"
          :artist-info="metadata.artist_info"
          :album-list="metadata.album_list"
          :track-list="metadata.track_list"
          :is-downloading="isDownloading"
          :download-progress="downloadProgress"
          :current-download-info="currentDownloadInfo"
          :selected-tracks="selectedTracks"
          :downloaded-tracks="downloadedTracks"
          @download-all="handleDownloadAll"
          @toggle-track="toggleTrack"
          @toggle-select-all="toggleSelectAll"
          @album-click="handleAlbumClick"
          @back="handleBack"
        />
      </template>
    </div>

    <Dialog :open="showAlbumDialog" @update:open="setShowAlbumDialog">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fetch Album</DialogTitle>
          <DialogDescription>
            Do you want to fetch metadata for this album?
          </DialogDescription>
        </DialogHeader>
        <div v-if="selectedAlbum" class="py-2">
          <p class="font-medium bg-muted/50 rounded-md px-3 py-2">{{ selectedAlbum.name }}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="setShowAlbumDialog(false)">
            Cancel
          </Button>
          <Button @click="() => void handleConfirmAlbumFetch()">
            Fetch Album
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showVpnAdviceDialog" @update:open="setShowVpnAdviceDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Fetch Failed</DialogTitle>
          <DialogDescription class="space-y-3">
            <span class="block">
              Metadata fetch failed. Try using a high-quality VPN such as
              Surfshark, ExpressVPN, Proton VPN, or a similar service.
            </span>
            <span class="block">
              Choose a location that is not blocked by Spotify or the related
              service, such as the USA, UK, Germany, Netherlands, or Singapore.
            </span>
            <span class="block">
              If you are already using a VPN, try switching to another server
              and fetch again.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button @click="setShowVpnAdviceDialog(false)">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
