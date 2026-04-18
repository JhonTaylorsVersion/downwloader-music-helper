<script setup lang="ts">
import { ref } from 'vue';
import { 
  Download, FolderOpen, User, Music, Calendar, 
  ChevronLeft, LayoutGrid, List, BadgeCheck, Users,
  Gem, ImageDown, FileText, Info
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BfTrackList from './SfTrackList.vue';

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
}>();

const viewMode = ref<'tracks' | 'albums'>('tracks');

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
    <!-- Artist Banner Header -->
    <div class="relative h-[450px] rounded-[40px] overflow-hidden group shadow-2xl">
       <!-- Header Image -->
       <img :src="artistInfo.header || artistInfo.images" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" />
       <div class="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
       
       <!-- Artist Avatar Overlay -->
       <div class="absolute bottom-10 left-10 flex flex-col md:flex-row items-center md:items-end gap-8">
          <div class="h-48 w-48 rounded-full border-8 border-background shadow-2xl overflow-hidden shrink-0">
             <img :src="artistInfo.images" class="h-full w-full object-cover" />
          </div>
          
          <div class="space-y-4 text-center md:text-left pb-4">
             <div class="space-y-1">
                <div v-if="artistInfo.verified" class="flex items-center justify-center md:justify-start gap-2 text-sky-400">
                   <BadgeCheck class="h-5 w-5 fill-current" />
                   <span class="text-xs font-black uppercase tracking-widest">Verified Artist</span>
                </div>
                <h1 class="text-6xl md:text-8xl font-black tracking-tighter leading-none">{{ artistInfo.name }}</h1>
             </div>
             
             <div class="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm font-bold text-muted-foreground/80">
                <span class="flex items-center gap-2"><Users class="h-4 w-4" /> {{ formatNumber(artistInfo.listeners || 0) }} followers</span>
                <span class="flex items-center gap-2"><Music class="h-4 w-4" /> {{ artistInfo.total_albums || albumList.length }} albums</span>
                <span class="flex items-center gap-2"><Gem class="h-4 w-4" /> {{ artistInfo.rank || '#' + Math.floor(Math.random() * 100) }} global rank</span>
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
         @toggle-track="id => emit('toggleTrack', id)"
         @toggle-select-all="emit('toggleSelectAll')"
       />
    </div>

    <div v-show="viewMode === 'albums'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
       <div 
         v-for="album in albumList" 
         :key="album.id"
         @click="emit('albumClick', album)"
         class="group cursor-pointer space-y-3"
       >
          <div class="aspect-square rounded-2xl overflow-hidden shadow-xl border relative">
             <img :src="album.images" class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
             <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div class="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                   <Music class="h-6 w-6" />
                </div>
             </div>
          </div>
          <div>
             <h4 class="font-bold truncate group-hover:text-primary transition-colors">{{ album.name }}</h4>
             <p class="text-xs text-muted-foreground font-medium">{{ album.release_date.split('-')[0] }} • Album</p>
          </div>
       </div>
    </div>

    <!-- Biography / Extras -->
    <Card v-if="artistInfo.biography" class="bg-card/50 border-none shadow-xl overflow-hidden rounded-3xl">
       <CardHeader>
          <CardTitle class="flex items-center gap-2"><Info class="h-5 w-5 text-primary" /> About {{ artistInfo.name }}</CardTitle>
       </CardHeader>
       <CardContent>
          <p class="text-sm leading-relaxed text-muted-foreground/90 whitespace-pre-wrap max-h-48 overflow-y-auto pr-4 custom-scrollbar">
             {{ artistInfo.biography }}
          </p>
       </CardContent>
    </Card>
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
</style>
