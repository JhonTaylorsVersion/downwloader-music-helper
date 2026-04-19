<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { 
  Download, FolderOpen, User, Music, Calendar, 
  ChevronLeft, LayoutGrid, List, BadgeCheck, Users,
  Gem, ImageDown, FileText, Info
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BfTrackList from './SfTrackList.vue';
import { downloadAvatar, downloadHeader } from '../utils/api';
import { getSettings } from '../utils/settings';
import { toastWithSound as toast } from '../utils/toast-with-sound';

const props = withDefaults(defineProps<{
  artistInfo: any;
  albumList: any[];
  trackList: any[];
  isDownloading: boolean;
  selectedTracks: string[];
  downloadedTracks: Set<string>;
  failedTracks?: Set<string>;
  skippedTracks?: Set<string>;
  downloadingTrack?: string | null;
  bulkDownloadType?: 'all' | 'selected' | null;
  downloadProgress?: number;
  currentDownloadInfo?: { name: string; artists: string; id?: string } | null;
  itemsPerPage?: number;
  currentPage?: number;
  
  downloadedLyrics?: Set<string>;
  failedLyrics?: Set<string>;
  skippedLyrics?: Set<string>;
  downloadingLyricsTrack?: string | null;
  isBulkDownloadingLyrics?: boolean;
  
  downloadedCovers?: Set<string>;
  failedCovers?: Set<string>;
  skippedCovers?: Set<string>;
  downloadingCoverTrack?: string | null;
  isBulkDownloadingCovers?: boolean;
  
  availabilityMap?: Map<string, any>;
  checkingAvailability?: boolean;
  checkingTrackId?: string | null;
}>(), {
  failedTracks: () => new Set(),
  skippedTracks: () => new Set(),
  downloadingTrack: null,
  bulkDownloadType: null,
  downloadProgress: 0,
  currentDownloadInfo: null,
  itemsPerPage: 100,
  currentPage: 1,
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'downloadAll'): void;
  (e: 'albumClick', album: any): void;
  (e: 'toggleTrack', id: string): void;
  (e: 'toggleSelectAll'): void;
  (e: 'openFolder'): void;
  (e: 'downloadTrack', ...args: any[]): void;
  (e: 'downloadLyrics', ...args: any[]): void;
  (e: 'downloadCover', ...args: any[]): void;
  (e: 'checkAvailability', id: string): void;
  (e: 'downloadAllLyrics'): void;
  (e: 'downloadAllCovers'): void;
}>();

const viewMode = ref<'tracks' | 'albums'>('tracks');
const selectedCategory = ref('all');
const downloadingHeader = ref(false);
const downloadingAvatar = ref(false);
const headerDownloadUrl = computed(() => props.artistInfo?.header || props.artistInfo?.images || '');

const computedCategories = computed(() => {
  if (!props.albumList) return [{ id: 'all', name: 'All', count: 0 }];
  
  const cats = new Map<string, number>();
  let total = 0;
  
  props.albumList.forEach(album => {
    const type = album.album_type || 'album';
    // Normalize: EP -> Ep, SINGLE -> Single, etc.
    const normalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    cats.set(normalized, (cats.get(normalized) || 0) + 1);
    total++;
  });
  
  const result = [{ id: 'all', name: 'All', count: total }];
  // Sort categories alphabetically
  Array.from(cats.keys()).sort().forEach(name => {
    result.push({ 
      id: name.toLowerCase(), 
      name, 
      count: cats.get(name) || 0 
    });
  });
  
  return result;
});

const filteredAlbums = computed(() => {
  if (!props.albumList) return [];
  if (selectedCategory.value === 'all') return props.albumList;
  return props.albumList.filter(album => 
    (album.album_type || 'album').toLowerCase() === selectedCategory.value.toLowerCase()
  );
});

type ArtistTheme = {
  prefersLightText: boolean;
  title: string;
  body: string;
  muted: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  avatarBorder: string;
  avatarShadow: string;
  overlay: string;
  actionBg: string;
  actionHoverBg: string;
  actionBorder: string;
  actionIcon: string;
  actionShadow: string;
};

const theme = ref<ArtistTheme>({
  prefersLightText: false,
  title: '#0f172a',
  body: 'rgba(15, 23, 42, 0.92)',
  muted: 'rgba(15, 23, 42, 0.76)',
  accent: '#0ea5e9',
  cardBg: 'rgba(255, 255, 255, 0.56)',
  cardBorder: 'rgba(255, 255, 255, 0.42)',
  cardShadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
  avatarBorder: 'rgba(255, 255, 255, 0.95)',
  avatarShadow: '0 22px 55px rgba(15, 23, 42, 0.18)',
  overlay: 'linear-gradient(to top, rgba(255,255,255,0.28), rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
  actionBg: 'rgba(255, 255, 255, 0.88)',
  actionHoverBg: 'rgba(255, 255, 255, 0.98)',
  actionBorder: 'rgba(15, 23, 42, 0.08)',
  actionIcon: '#0f172a',
  actionShadow: '0 14px 35px rgba(15, 23, 42, 0.16)',
});

const srgbToLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
};

const luminanceFromRgb = (r: number, g: number, b: number) => (
  0.2126 * srgbToLinear(r) +
  0.7152 * srgbToLinear(g) +
  0.0722 * srgbToLinear(b)
);

const contrastRatio = (a: number, b: number) => {
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
};

const averageLuminance = (samples: number[]) => (
  samples.reduce((sum, value) => sum + value, 0) / Math.max(samples.length, 1)
);

const buildThemeFromLuminance = (luminance: number): ArtistTheme => {
  const whiteContrast = contrastRatio(1, luminance);
  const blackContrast = contrastRatio(0, luminance);
  const prefersLightText = whiteContrast >= blackContrast;

  if (prefersLightText) {
    const needsStrongerCard = whiteContrast < 4.5;
    return {
      prefersLightText: true,
      title: '#ffffff',
      body: 'rgba(255, 255, 255, 0.94)',
      muted: 'rgba(255, 255, 255, 0.82)',
      accent: '#38bdf8',
      cardBg: needsStrongerCard ? 'rgba(8, 15, 30, 0.62)' : 'rgba(8, 15, 30, 0.44)',
      cardBorder: 'rgba(255, 255, 255, 0.16)',
      cardShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
      avatarBorder: 'rgba(245, 248, 255, 0.98)',
      avatarShadow: '0 22px 55px rgba(0, 0, 0, 0.34)',
      overlay: 'linear-gradient(to top, rgba(4,8,20,0.42), rgba(4,8,20,0.18), rgba(4,8,20,0.04))',
      actionBg: 'rgba(255, 255, 255, 0.14)',
      actionHoverBg: 'rgba(255, 255, 255, 0.22)',
      actionBorder: 'rgba(255, 255, 255, 0.34)',
      actionIcon: '#ffffff',
      actionShadow: '0 18px 38px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
    };
  }

  const needsStrongerCard = blackContrast < 4.5;
  return {
    prefersLightText: false,
    title: '#0f172a',
    body: 'rgba(15, 23, 42, 0.92)',
    muted: 'rgba(15, 23, 42, 0.76)',
    accent: '#0ea5e9',
    cardBg: needsStrongerCard ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.56)',
    cardBorder: 'rgba(255, 255, 255, 0.42)',
    cardShadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
    avatarBorder: 'rgba(255, 255, 255, 0.95)',
    avatarShadow: '0 22px 55px rgba(15, 23, 42, 0.18)',
    overlay: 'linear-gradient(to top, rgba(255,255,255,0.28), rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    actionBg: 'rgba(15, 23, 42, 0.12)',
    actionHoverBg: 'rgba(15, 23, 42, 0.18)',
    actionBorder: 'rgba(15, 23, 42, 0.16)',
    actionIcon: '#0f172a',
    actionShadow: '0 18px 38px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
  };
};

const analyzeImageLuminance = (url: string) => {
  if (!url) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 24;
      canvas.height = 24;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const xStart = 3;
      const xEnd = 21;
      const yStart = 4;
      const yEnd = 20;
      const luminanceSamples: number[] = [];

      for (let y = yStart; y < yEnd; y += 2) {
        for (let x = xStart; x < xEnd; x += 2) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          luminanceSamples.push(
            luminanceFromRgb(pixel[0], pixel[1], pixel[2]),
          );
        }
      }

      if (luminanceSamples.length === 0) return;

      luminanceSamples.sort((a, b) => a - b);
      const median = luminanceSamples[Math.floor(luminanceSamples.length / 2)];
      const average = averageLuminance(luminanceSamples);
      const weighted = median * 0.65 + average * 0.35;

      theme.value = buildThemeFromLuminance(weighted);
    } catch (e) {
      console.warn('Luminance analysis failed:', e);
      theme.value = buildThemeFromLuminance(0.82);
    }
  };

  img.onerror = () => {
    theme.value = buildThemeFromLuminance(0.82);
  };
};

watch(() => props.artistInfo.header || props.artistInfo.images, (newUrl) => {
  if (newUrl) analyzeImageLuminance(newUrl);
}, { immediate: true });

onMounted(() => {
  const initialUrl = props.artistInfo.header || props.artistInfo.images;
  if (initialUrl) analyzeImageLuminance(initialUrl);
});

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const handleDownloadHeader = async () => {
  if (!headerDownloadUrl.value) return;

  downloadingHeader.value = true;
  try {
    const settings = getSettings();
    const response = await downloadHeader({
      header_url: headerDownloadUrl.value,
      artist_name: props.artistInfo.name,
      output_dir: settings.downloadPath,
    });

    if (response.success) {
      if (response.already_exists) {
        toast.info('Header already exists');
      } else {
        toast.success('Header downloaded successfully');
      }
    } else {
      toast.error(response.error || 'Failed to download header');
    }
  } catch (error) {
    toast.error(`Error downloading header: ${error}`);
  } finally {
    downloadingHeader.value = false;
  }
};

const handleDownloadAvatar = async () => {
  if (!props.artistInfo?.images) return;

  downloadingAvatar.value = true;
  try {
    const settings = getSettings();
    const response = await downloadAvatar({
      avatar_url: props.artistInfo.images,
      artist_name: props.artistInfo.name,
      output_dir: settings.downloadPath,
    });

    if (response.success) {
      if (response.already_exists) {
        toast.info('Avatar already exists');
      } else {
        toast.success('Avatar downloaded successfully');
      }
    } else {
      toast.error(response.error || 'Failed to download avatar');
    }
  } catch (error) {
    toast.error(`Error downloading avatar: ${error}`);
  } finally {
    downloadingAvatar.value = false;
  }
};

const artistCardStyle = computed(() => ({
  background: theme.value.cardBg,
  borderColor: theme.value.cardBorder,
  boxShadow: theme.value.cardShadow,
}));

const artistTitleStyle = computed(() => ({
  color: theme.value.title,
}));

const artistBodyStyle = computed(() => ({
  color: theme.value.body,
}));

const artistMutedStyle = computed(() => ({
  color: theme.value.muted,
}));

const artistAccentStyle = computed(() => ({
  color: theme.value.accent,
}));

const heroOverlayStyle = computed(() => ({
  background: theme.value.overlay,
}));

const avatarFrameStyle = computed(() => ({
  borderColor: theme.value.avatarBorder,
  boxShadow: theme.value.avatarShadow,
}));

const actionButtonStyle = computed(() => ({
  '--sf-action-bg': theme.value.actionBg,
  '--sf-action-hover-bg': theme.value.actionHoverBg,
  '--sf-action-border': theme.value.actionBorder,
  '--sf-action-icon': theme.value.actionIcon,
  '--sf-action-shadow': theme.value.actionShadow,
} as Record<string, string>));
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
    <!-- Artist Banner Header -->
    <div class="relative h-[450px] rounded-[40px] overflow-hidden group shadow-2xl">
       <!-- Header Image -->
       <img :src="artistInfo.header || artistInfo.images" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" />
       <div class="absolute inset-0 transition-opacity duration-1000" :style="heroOverlayStyle"></div>

       <!-- Artist Avatar & Info Overlay -->
       <div class="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row items-end gap-10">
          <div
            class="relative h-52 w-52 rounded-full border-8 overflow-hidden shrink-0 transition-colors duration-500 z-10 mb-[-16px] group/avatar"
            :style="avatarFrameStyle"
          >
             <img :src="artistInfo.images" class="h-full w-full object-cover" />
             <div class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/avatar:bg-black/45 transition-colors duration-200">
                <div class="relative">
                     <Button
                        size="icon"
                        variant="secondary"
                        :disabled="downloadingAvatar"
                        @click.stop="handleDownloadAvatar"
                     class="sf-dynamic-action-btn h-14 w-14 rounded-2xl shadow-xl backdrop-blur-md opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200"
                     :style="actionButtonStyle"
                   >
                     <span v-if="downloadingAvatar" class="sf-spinner" />
                     <ImageDown v-else class="h-5 w-5" />
                   </Button>
                   <div class="sf-artist-tooltip sf-artist-tooltip-avatar">
                     Download Avatar
                   </div>
                </div>
             </div>
          </div>
          
          <div
            class="flex-1 p-8 rounded-[32px] backdrop-blur-md backdrop-saturate-200 border transition-all duration-1000 space-y-4 mb-2"
            :style="artistCardStyle"
          >
             <div class="space-y-1">
                <div v-if="artistInfo.verified" class="flex items-center justify-center md:justify-start gap-2" :style="artistAccentStyle">
                   <BadgeCheck class="h-5 w-5 fill-current" />
                   <span class="text-xs font-black uppercase tracking-widest drop-shadow-sm">Verified Artist</span>
                </div>
                <h1 class="text-6xl md:text-7xl font-black tracking-tighter leading-none drop-shadow-xl transition-colors duration-500" :style="artistTitleStyle">
                  {{ artistInfo.name }}
                </h1>
             </div>

             <p v-if="artistInfo.biography" class="text-sm md:text-base font-semibold line-clamp-2 max-w-4xl drop-shadow-md leading-relaxed transition-colors duration-500" :style="artistBodyStyle">
                {{ artistInfo.biography.replace(/<[^>]*>/g, '') }}
             </p>
             
             <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div class="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm font-bold transition-colors duration-500" :style="artistMutedStyle">
                   <span class="flex items-center gap-2"><Users class="h-4 w-4" /> {{ formatNumber(artistInfo.listeners || 0) }} followers</span>
                   <span class="flex items-center gap-2"><Music class="h-4 w-4" /> {{ artistInfo.total_albums || albumList.length }} albums</span>
                   <span class="flex items-center gap-2"><Gem class="h-4 w-4" /> {{ artistInfo.rank || '#' + Math.floor(Math.random() * 100) }} global rank</span>
                </div>

                <div v-if="headerDownloadUrl" class="flex justify-center md:justify-end">
                   <div class="relative group/header-action">
                      <Button
                        size="icon"
                        variant="secondary"
                        :disabled="downloadingHeader"
                        @click.stop="handleDownloadHeader"
                        class="sf-dynamic-action-btn h-12 w-12 rounded-2xl shadow-xl backdrop-blur-lg shrink-0"
                        :style="actionButtonStyle"
                      >
                        <span v-if="downloadingHeader" class="sf-spinner" />
                        <ImageDown v-else class="h-5 w-5" />
                      </Button>
                      <div class="sf-artist-tooltip sf-artist-tooltip-header">
                        Download Header
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <!-- Action Buttons Overlay -->
       <div class="absolute top-8 right-8 flex gap-3">
          <Button variant="secondary" @click="emit('openFolder')" class="rounded-full h-12 w-12 p-0 bg-background/50 backdrop-blur hover:bg-background/80 shadow-xl border-none">
             <FolderOpen class="h-5 w-5" />
          </Button>
          <Button @click="emit('downloadAll')" :disabled="isDownloading" class="rounded-full h-12 px-8 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95">
             <Download class="h-4 w-4 mr-2" /> Sync Discography
          </Button>
       </div>
    </div>

    <!-- View Switcher -->
    <div class="flex items-center justify-between border-b pb-4">
       <div class="flex p-1 bg-muted rounded-xl gap-1">
          <button 
            @click="viewMode = 'tracks'" 
            :class="['px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2', viewMode === 'tracks' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground']"
          >
            <List class="h-4 w-4" /> Discography Tracks
          </button>
          <button 
            @click="viewMode = 'albums'" 
            :class="['px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2', viewMode === 'albums' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground']"
          >
            <LayoutGrid class="h-4 w-4" /> Studio Albums
          </button>
       </div>
    </div>

    <!-- Content Sections -->
    <div v-show="viewMode === 'tracks'" class="animate-in fade-in slide-in-from-left-4 duration-500">
       <BfTrackList 
         :tracks="trackList" 
         :selected-tracks="selectedTracks" 
         :downloaded-tracks="downloadedTracks"
         :downloaded-lyrics="downloadedLyrics"
         :failed-lyrics="failedLyrics"
         :skipped-lyrics="skippedLyrics"
         :downloading-lyrics-track="downloadingLyricsTrack"
         :downloaded-covers="downloadedCovers"
         :failed-covers="failedCovers"
         :skipped-covers="skippedCovers"
         :downloading-cover-track="downloadingCoverTrack"
         :availability-map="availabilityMap"
         :checking-availability="checkingAvailability"
         :checking-track-id="checkingTrackId"
         @toggle-track="id => emit('toggleTrack', id)"
         @toggle-select-all="emit('toggleSelectAll')"
         @download-track="(...args: any[]) => emit('downloadTrack', ...args)"
         @download-lyrics="(...args: any[]) => emit('downloadLyrics', ...args)"
         @download-cover="(...args: any[]) => emit('downloadCover', ...args)"
         @check-availability="id => emit('checkAvailability', id)"
       />
    </div>

    <div v-show="viewMode === 'albums'" class="space-y-6">
       <!-- Category Filter Pills -->
       <div class="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button 
            v-for="cat in computedCategories" 
            :key="cat.id"
            :variant="selectedCategory === cat.id ? 'default' : 'secondary'"
            size="sm"
            @click="selectedCategory = cat.id"
            class="rounded-full h-9 px-4 font-bold text-xs whitespace-nowrap transition-all active:scale-95"
          >
            {{ cat.name }} <span class="ml-1 opacity-60">({{ cat.count }})</span>
          </Button>
       </div>

       <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div 
            v-for="album in filteredAlbums" 
            :key="album.id"
            @click="emit('albumClick', album)"
            class="group cursor-pointer space-y-3"
          >
             <div class="aspect-square rounded-2xl overflow-hidden shadow-xl border relative">
                <img :src="album.images" class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                
                <!-- Type Badge -->
                <div class="absolute bottom-2 right-2">
                   <div class="bg-black/60 backdrop-blur-md text-[10px] font-black uppercase tracking-tighter text-white px-2 py-0.5 rounded-md border border-white/20 shadow-lg">
                      {{ album.album_type || 'ALBUM' }}
                   </div>
                </div>

                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div class="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Music class="h-6 w-6" />
                   </div>
                </div>
             </div>
             <div>
                <h4 class="font-bold truncate group-hover:text-primary transition-colors text-sm">{{ album.name }}</h4>
                <p class="text-xs text-muted-foreground font-medium">
                  {{ album.release_date.split('-')[0] }} • 
                  <span class="capitalize">{{ (album.album_type || 'album').toLowerCase() }}</span>
                </p>
             </div>
          </div>
       </div>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.2);
  border-radius: 10px;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sf-spinner {
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

.sf-dynamic-action-btn {
  background: var(--sf-action-bg) !important;
  color: var(--sf-action-icon) !important;
  border: 1px solid var(--sf-action-border) !important;
  box-shadow: var(--sf-action-shadow) !important;
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
}

.sf-dynamic-action-btn:hover:not(:disabled) {
  background: var(--sf-action-hover-bg) !important;
}

.sf-dynamic-action-btn :deep(svg) {
  color: var(--sf-action-icon);
}

.sf-artist-tooltip {
  position: absolute;
  padding: 0.625rem 0.875rem;
  border-radius: 0.875rem;
  background: rgba(17, 17, 17, 0.92);
  color: white;
  font-size: 0.9rem;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
}

.group\/header-action:hover .sf-artist-tooltip-header,
.group\/avatar:hover .sf-artist-tooltip-avatar {
  opacity: 1;
  transform: translateY(0);
}

.sf-artist-tooltip-header {
  right: calc(100% + 0.75rem);
  top: 50%;
  transform: translateY(-50%);
}

.group\/header-action:hover .sf-artist-tooltip-header {
  transform: translateY(-50%);
}

.sf-artist-tooltip-avatar {
  left: 50%;
  bottom: calc(100% + 0.75rem);
  transform: translateX(-50%) translateY(6px);
}

.group\/avatar:hover .sf-artist-tooltip-avatar {
  transform: translateX(-50%) translateY(0);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
