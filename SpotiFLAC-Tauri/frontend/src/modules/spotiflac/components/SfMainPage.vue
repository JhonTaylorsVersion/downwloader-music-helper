<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  SfSearchBar, SfAlbumView, SfTrackInfo, SfPlaylistView, 
  SfArtistView, SfFetchHistory 
} from './';
import { useMetadata } from '../composables/useMetadata';
import { useDownload } from '../composables/useDownload';
import { useSettings } from '../composables/useSettings';
import { useHistory } from '../composables/useHistory'; // We'll need this for the fetch history
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, CloudDownload } from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Composables
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
  isDownloading, downloadProgress, currentDownloadInfo, 
  downloadedTracks, downloadTrack, downloadBatch 
} = useDownload();
const { settings } = useSettings();
const { fetchHistory, deleteFetchHistoryItem } = useHistory();

// Local state
const url = ref("");
const searchMode = ref(false);
const region = ref("US");
const selectedTracks = ref<string[]>([]);

// Handlers
const handleFetch = () => {
  void handleFetchMetadata(url.value);
};

const handleFetchUrl = (resultUrl: string) => {
  url.value = resultUrl;
  void handleFetchMetadata(resultUrl);
};

const handleBack = () => {
  resetMetadata();
  url.value = "";
  selectedTracks.value = [];
};

const toggleTrack = (id: string) => {
  if (selectedTracks.value.includes(id)) {
    selectedTracks.value = selectedTracks.value.filter(t => t !== id);
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
    selectedTracks.value.includes(t.spotify_id || t.id)
  );
  downloadBatch(tracksToDownload);
};

const handleDownloadAll = () => {
  if (!metadata.value) return;
  downloadBatch(metadata.value.track_list);
};

// Mode Detection
const currentView = computed(() => {
  if (!metadata.value) return 'history';
  if ("track" in metadata.value) return 'track';
  if ("album_info" in metadata.value) return 'album';
  if ("playlist_info" in metadata.value) return 'playlist';
  if ("artist_info" in metadata.value) return 'artist';
  return 'history';
});
</script>

<template>
  <div class="h-full flex flex-col space-y-6 max-w-[1240px] mx-auto pb-12 px-2 md:px-6">
    <!-- Search / Back Section -->
    <div :class="['sticky top-0 z-20 bg-background/95 backdrop-blur-xl py-4 flex gap-4 items-center transition-all duration-500', currentView !== 'history' ? 'border-b mb-6' : '']">
      <Button 
        v-if="currentView !== 'history'" 
        variant="ghost" 
        size="icon" 
        @click="handleBack" 
        class="h-11 w-11 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary shrink-0 border border-muted-foreground/5 shadow-sm"
      >
        <ChevronLeft class="h-6 w-6" />
      </Button>
      
      <SfSearchBar 
        v-model:url="url" 
        v-model:search-mode="searchMode"
        v-model:region="region"
        :loading="loading" 
        :history="fetchHistory"
        :has-result="currentView !== 'history'"
        @fetch="handleFetch" 
        @fetch-url="handleFetchUrl" 
        @history-select="item => handleFetchUrl(item.url)"
        @history-remove="id => deleteFetchHistoryItem(id)"
      />
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 min-h-0">
      <!-- Loading State -->
      <div v-if="loading && !metadata" class="flex flex-col items-center justify-center py-48 gap-6 animate-in fade-in zoom-in duration-700">
         <Spinner size="lg" class="text-primary" />
         <div class="text-center space-y-2">
            <h3 class="font-black text-2xl tracking-tighter italic">SINCRONIZANDO CON SPOTIFY...</h3>
            <p class="text-sm text-muted-foreground font-medium animate-pulse uppercase tracking-widest opacity-60">Descifrando capas de metadatos de alta fidelidad</p>
         </div>
      </div>

      <!-- Views -->
      <template v-else>
        <!-- Single Track View -->
        <SfTrackInfo 
        v-if="currentView === 'track'"
          :track="metadata.track"
          :is-downloading="isDownloading"
          :downloaded="downloadedTracks.has(metadata.track.spotify_id)"
          @download="handleDownloadAll"
          @album-click="handleAlbumClick"
          @artist-click="artist => void handleArtistClick(artist)"
        />

        <!-- Album View -->
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

        <!-- Playlist View -->
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

        <!-- Artist View -->
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

        <!-- Welcome View -->
        <div v-else class="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div class="text-center space-y-6 pt-12">
             <div class="inline-flex h-24 w-24 rounded-[2.5rem] bg-primary/10 text-primary items-center justify-center mb-4 shadow-inner ring-1 ring-primary/20">
                <CloudDownload class="h-10 w-10" />
             </div>
             <div class="space-y-2">
                <h1 class="text-6xl font-black tracking-tighter italic bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">SpotiFLAC Engine</h1>
                <p class="text-muted-foreground max-w-xl mx-auto text-lg font-medium leading-relaxed opacity-80">
                   Pega un enlace de Spotify arriba para iniciar la preservación digital. 
                   FLAC sin pérdida, metadatos inmersivos y arte cinemático.
                </p>
             </div>
          </div>
        </div>
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
