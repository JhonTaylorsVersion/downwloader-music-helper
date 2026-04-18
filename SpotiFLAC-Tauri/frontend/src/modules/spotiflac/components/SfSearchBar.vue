<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { 
  CloudDownload, Link, Search, XCircle, X, ChevronDown, 
  ArrowUpDown, History as HistoryIcon, Clock, Trash2, Link2Off
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTypingEffect } from '../composables/useTypingEffect';
import { useSettings } from '../composables/useSettings';
import SfFetchHistory from './SfFetchHistory.vue';
import type { HistoryItem } from './SfFetchHistory.vue';
import { cn } from '@/lib/utils';

type ResultTab = "tracks" | "albums" | "artists" | "playlists";

const props = defineProps<{
  url: string;
  loading: boolean;
  history: HistoryItem[];
  hasResult: boolean;
  searchMode: boolean;
  region: string;
}>();

const emit = defineEmits<{
  (e: 'update:url', value: string): void;
  (e: 'update:searchMode', value: boolean): void;
  (e: 'update:region', value: string): void;
  (e: 'fetch'): void;
  (e: 'fetchUrl', url: string): void;
  (e: 'historySelect', item: HistoryItem): void;
  (e: 'historyRemove', id: string): void;
}>();

const FETCH_PLACEHOLDERS = [
  "https://open.spotify.com/track/...",
  "https://open.spotify.com/album/...",
  "https://open.spotify.com/playlist/...",
  "https://open.spotify.com/artist/...",
];

const SEARCH_PLACEHOLDERS = [
  "Golden",
  "Taylor Swift",
  "The Weeknd",
  "Starboy",
  "Joji",
  "Die For You",
];

const REGIONS = [
  "AD", "AE", "AG", "AL", "AM", "AO", "AR", "AT", "AU", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN", "BO", "BR", "BS", "BT", "BW", "BZ", "CA", "CD", "CG", "CH", "CI", "CL", "CM", "CO", "CR", "CV", "CW", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ES", "ET", "FI", "FJ", "FM", "FR", "GA", "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IN", "IQ", "IS", "IT", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KR", "KW", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MN", "MO", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NE", "NG", "NI", "NL", "NO", "NP", "NR", "NZ", "OM", "PA", "PE", "PG", "PH", "PK", "PL", "PS", "PT", "PW", "PY", "QA", "RO", "RS", "RW", "SA", "SB", "SC", "SE", "SG", "SI", "SK", "SL", "SM", "SN", "SR", "ST", "SV", "SZ", "TD", "TG", "TH", "TJ", "TL", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VC", "VE", "VN", "VU", "WS", "XK", "ZA", "ZM", "ZW"
];

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const getRegionName = (code: string) => {
  try {
    if (code === "XK") return "Kosovo";
    return regionNames.of(code) || code;
  } catch (e) {
    return code;
  }
};

const RECENT_SEARCHES_KEY = "spotiflac_recent_searches";
const MAX_RECENT_SEARCHES = 8;
const SEARCH_LIMIT = 50;

const searchQuery = ref("");
const searchResults = ref<any>(null);
const { settings } = useSettings();
const showRegionSelector = computed(() => settings.value.linkResolver === "songlink");
const resultFilter = ref("");
const sortOrders = ref<Record<ResultTab, string>>({
  tracks: "default",
  albums: "default",
  artists: "default",
  playlists: "default",
});
const isSearching = ref(false);
const isLoadingMore = ref(false);
const lastSearchedQuery = ref("");
const activeTab = ref<ResultTab>("tracks");
const recentSearches = ref<string[]>([]);
const hasMore = ref<Record<ResultTab, boolean>>({
  tracks: false,
  albums: false,
  artists: false,
  playlists: false,
});
const showInvalidUrlDialog = ref(false);
const invalidUrl = ref("");

let searchTimeout: any = null;
const placeholders = computed(() => props.searchMode ? SEARCH_PLACEHOLDERS : FETCH_PLACEHOLDERS);
const placeholderText = useTypingEffect(placeholders);

onMounted(() => {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      recentSearches.value = JSON.parse(saved);
    }
  } catch (error) {
    console.error("Failed to load recent searches:", error);
  }
});

const saveRecentSearch = (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return;
  const filtered = recentSearches.value.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  recentSearches.value = updated;
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent searches:", error);
  }
};

const removeRecentSearch = (query: string) => {
  const updated = recentSearches.value.filter((s) => s !== query);
  recentSearches.value = updated;
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent searches:", error);
  }
};

const handleSearch = async () => {
  if (!props.searchMode || !searchQuery.value.trim()) return;
  if (searchQuery.value.trim() === lastSearchedQuery.value) return;

  isSearching.value = true;
  try {
    const results = await invoke<any>('search_spotify', { 
      query: searchQuery.value, 
      limit: SEARCH_LIMIT 
    });
    searchResults.value = results;
    resultFilter.value = "";
    lastSearchedQuery.value = searchQuery.value.trim();
    saveRecentSearch(searchQuery.value.trim());
    
    hasMore.value = {
      tracks: results.tracks?.length === SEARCH_LIMIT,
      albums: results.albums?.length === SEARCH_LIMIT,
      artists: results.artists?.length === SEARCH_LIMIT,
      playlists: results.playlists?.length === SEARCH_LIMIT,
    };

    if (results.tracks?.length > 0) activeTab.value = "tracks";
    else if (results.albums?.length > 0) activeTab.value = "albums";
    else if (results.artists?.length > 0) activeTab.value = "artists";
    else if (results.playlists?.length > 0) activeTab.value = "playlists";
  } catch (error) {
    console.error("Search failed:", error);
    searchResults.value = null;
  } finally {
    isSearching.value = false;
  }
};

watch([searchQuery, () => props.searchMode], () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  if (props.searchMode && searchQuery.value.trim()) {
    searchTimeout = setTimeout(handleSearch, 400);
  }
});

const handleLoadMore = async () => {
  if (!searchResults.value || !lastSearchedQuery.value || isLoadingMore.value) return;
  
  const typeMap: Record<ResultTab, string> = {
    tracks: "track",
    albums: "album",
    artists: "artist",
    playlists: "playlist",
  };
  
  const currentCount = searchResults.value[activeTab.value]?.length || 0;
  isLoadingMore.value = true;
  try {
    const moreResults = await invoke<any[]>('search_spotify_by_type', {
      query: lastSearchedQuery.value,
      searchType: typeMap[activeTab.value],
      limit: SEARCH_LIMIT,
      offset: currentCount,
    });
    
    if (moreResults.length > 0) {
      if (searchResults.value) {
        searchResults.value[activeTab.value] = [...searchResults.value[activeTab.value], ...moreResults];
      }
    }
    hasMore.value[activeTab.value] = moreResults.length === SEARCH_LIMIT;
  } catch (error) {
    console.error("Load more failed:", error);
  } finally {
    isLoadingMore.value = false;
  }
};

const isSpotifyUrl = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const isUrl = /^(https?:\/\/|www\.)/i.test(trimmed) || /^spotify:/i.test(trimmed);
  if (!isUrl) return true;
  return (trimmed.includes("spotify.com") || 
          trimmed.includes("spotify.link") || 
          trimmed.startsWith("spotify:"));
};

const handleFetchWithValidation = () => {
  if (!isSpotifyUrl(props.url)) {
    invalidUrl.value = props.url;
    showInvalidUrlDialog.value = true;
    return;
  }
  emit('fetch');
};

const handlePaste = (e: ClipboardEvent) => {
  if (props.searchMode) return;
  const pastedText = e.clipboardData?.getData("text");
  if (pastedText && !isSpotifyUrl(pastedText)) {
    e.preventDefault();
    invalidUrl.value = pastedText;
    showInvalidUrlDialog.value = true;
  }
};

const handleResultClick = (externalUrl: string) => {
  emit('update:searchMode', false);
  emit('fetchUrl', externalUrl);
};

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const hasAnyResults = computed(() => searchResults.value && 
  (searchResults.value.tracks?.length > 0 || 
   searchResults.value.albums?.length > 0 || 
   searchResults.value.artists?.length > 0 || 
   searchResults.value.playlists?.length > 0)
);

const sortedResults = computed(() => {
  if (!searchResults.value) return { tracks: [], albums: [], artists: [], playlists: [] };
  
  const filterStr = resultFilter.value.toLowerCase();
  
  const processTab = (tab: ResultTab, filterFn: (item: any) => boolean, sortFn: (a: any, b: any) => number) => {
    let items = [...(searchResults.value[tab] || [])];
    if (filterStr) items = items.filter(filterFn);
    if (sortOrders.value[tab] !== 'default') items.sort(sortFn);
    return items;
  };

  const tracks = processTab('tracks', 
    t => (t.name || '').toLowerCase().includes(filterStr) || (t.artists || '').toLowerCase().includes(filterStr),
    (a, b) => {
      const s = sortOrders.value.tracks;
      if (s === 'title-asc') return (a.name || '').localeCompare(b.name || '');
      if (s === 'title-desc') return (b.name || '').localeCompare(a.name || '');
      if (s === 'artist-asc') return (a.artists || '').localeCompare(b.artists || '');
      if (s === 'artist-desc') return (b.artists || '').localeCompare(a.artists || '');
      if (s === 'duration-desc') return (b.duration_ms || 0) - (a.duration_ms || 0);
      if (s === 'duration-asc') return (a.duration_ms || 0) - (b.duration_ms || 0);
      return 0;
    }
  );

  const albums = processTab('albums',
    a => (a.name || '').toLowerCase().includes(filterStr) || (a.artists || '').toLowerCase().includes(filterStr),
    (a, b) => {
      const s = sortOrders.value.albums;
      if (s === 'title-asc') return (a.name || '').localeCompare(b.name || '');
      if (s === 'title-desc') return (b.name || '').localeCompare(a.name || '');
      if (s === 'artist-asc') return (a.artists || '').localeCompare(b.artists || '');
      if (s === 'artist-desc') return (b.artists || '').localeCompare(a.artists || '');
      if (s === 'year-desc') return (b.release_date || '').localeCompare(a.release_date || '');
      if (s === 'year-asc') return (a.release_date || '').localeCompare(b.release_date || '');
      return 0;
    }
  );

  const artists = processTab('artists',
    a => (a.name || '').toLowerCase().includes(filterStr),
    (a, b) => {
      const s = sortOrders.value.artists;
      if (s === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (s === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    }
  );

  const playlists = processTab('playlists',
    p => (p.name || '').toLowerCase().includes(filterStr) || (p.owner || '').toLowerCase().includes(filterStr),
    (a, b) => {
      const s = sortOrders.value.playlists;
      if (s === 'title-asc') return (a.name || '').localeCompare(b.name || '');
      if (s === 'title-desc') return (b.name || '').localeCompare(a.name || '');
      if (s === 'owner-asc') return (a.owner || '').localeCompare(b.owner || '');
      if (s === 'owner-desc') return (b.owner || '').localeCompare(a.owner || '');
      return 0;
    }
  );

  return { tracks, albums, artists, playlists };
});

const tabs: { key: ResultTab; label: string }[] = [
  { key: "tracks", label: "Tracks" },
  { key: "albums", label: "Albums" },
  { key: "artists", label: "Artists" },
  { key: "playlists", label: "Playlists" },
];
</script>

<template>
  <div class="space-y-4 w-full">
    <!-- Header Input Group -->
    <div class="flex gap-2 p-1.5 bg-muted/20 rounded-2xl border border-muted-foreground/10 shadow-sm backdrop-blur-md">
      <Tooltip>
        <Button 
          variant="ghost" 
          size="icon" 
          class="shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300" 
          @click="emit('update:searchMode', !searchMode)"
        >
          <Link v-if="searchMode" class="h-5 w-5" />
          <Search v-else class="h-5 w-5" />
        </Button>
        <template #content>
          <p class="font-bold">{{ searchMode ? "Fetch via Link" : "Search Spotify" }}</p>
        </template>
      </Tooltip>

      <div class="relative flex-1 group">
        <template v-if="!searchMode">
          <Input 
            :model-value="url" 
            @update:model-value="v => emit('update:url', v)"
            :placeholder="placeholderText" 
            class="bg-transparent border-none focus-visible:ring-0 text-base h-11 pr-10 font-medium"
            @paste="handlePaste"
            @keydown.enter="handleFetchWithValidation"
          />
          <button 
            v-if="url" 
            @click="emit('update:url', '')"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-destructive transition-colors p-1"
          >
            <XCircle class="h-5 w-5 fill-current bg-background rounded-full" />
          </button>
        </template>
        <template v-else>
          <Input 
            v-model="searchQuery" 
            :placeholder="placeholderText"
            class="bg-transparent border-none focus-visible:ring-0 text-base h-11 pr-10 font-bold"
          />
          <button 
            v-if="searchQuery" 
            @click="() => { searchQuery = ''; searchResults = null; lastSearchedQuery = ''; resultFilter = ''; }"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-destructive transition-colors p-1"
          >
            <XCircle class="h-5 w-5 fill-current bg-background rounded-full" />
          </button>
        </template>
      </div>

      <template v-if="!searchMode">
        <Select v-if="showRegionSelector" :model-value="region" @update:model-value="v => emit('update:region', v)">
          <SelectTrigger class="w-[75px] shrink-0 h-11 border-none bg-muted/40 rounded-xl font-bold">
            <SelectValue placeholder="US" />
          </SelectTrigger>
          <SelectContent class="max-h-[300px] rounded-xl shadow-2xl">
            <SelectItem v-for="r in REGIONS" :key="r" :value="r" class="rounded-lg">
              <div class="flex items-center gap-2">
                <span class="font-black">{{ r }}</span>
                <span class="text-xs text-muted-foreground">{{ getRegionName(r) }}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button 
          @click="handleFetchWithValidation" 
          :disabled="loading || !url"
          class="rounded-xl px-7 h-11 gap-2.5 shadow-lg shadow-primary/20 font-bold transition-all active:scale-95"
        >
          <Spinner v-if="loading" size="sm" class="text-primary-foreground" />
          <CloudDownload v-else class="h-5 w-5" />
          <span>{{ loading ? 'Sincronizando...' : 'Fetch' }}</span>
        </Button>
      </template>
    </div>

    <!-- History View (Only in Fetch mode and NOT when showing result) -->
    <SfFetchHistory 
      v-if="!searchMode && !hasResult" 
      :history="history" 
      @select="i => emit('historySelect', i)" 
      @remove="id => emit('historyRemove', id)" 
    />

    <!-- Search View -->
    <div v-if="searchMode" class="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <!-- Recent Searches -->
      <div v-if="!searchQuery && !searchResults && recentSearches.length > 0" class="space-y-3">
        <div class="flex items-center gap-2 text-muted-foreground">
          <HistoryIcon class="h-4 w-4" />
          <p class="text-xs font-black uppercase tracking-widest opacity-60">Búsquedas Recientes</p>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <div 
            v-for="query in recentSearches" 
            :key="query" 
            class="group relative flex items-center px-4 py-2 bg-muted/40 hover:bg-primary/10 rounded-full text-sm font-bold cursor-pointer transition-all border border-transparent hover:border-primary/20"
            @click="searchQuery = query"
          >
            <span>{{ query }}</span>
            <button 
              @click.stop="removeRecentSearch(query)"
              class="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all shadow-lg flex items-center justify-center scale-75 group-hover:scale-100"
            >
              <X class="h-3 w-3" stroke-width="4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Searching State -->
      <div v-if="isSearching" class="flex flex-col items-center justify-center py-16 gap-4">
        <Spinner size="lg" class="text-primary" />
        <p class="text-sm font-black text-muted-foreground animate-pulse tracking-tight">EXPLORANDO EL ECOSISTEMA SPOTIFY...</p>
      </div>

      <!-- No Results -->
      <div v-else-if="searchQuery && !hasAnyResults" class="flex flex-col items-center py-20 text-muted-foreground gap-4 bg-muted/5 rounded-3xl border-2 border-dashed border-muted-foreground/10">
        <Link2Off class="h-10 w-10 opacity-20" />
        <p class="font-bold text-lg">No se hallaron resultados para "{{ searchQuery }}"</p>
      </div>

      <!-- Search Results -->
      <div v-else-if="hasAnyResults" class="space-y-4">
        <!-- Tabs -->
        <div class="flex gap-2 border-b-2 border-muted/30 pb-0 shrink-0 overflow-x-auto no-scrollbar">
          <button 
            v-for="tab in tabs" 
            :key="tab.key"
            v-show="searchResults[tab.key]?.length > 0"
            @click="activeTab = tab.key"
            :class="cn(
              'px-5 py-3 text-sm font-bold transition-all border-b-4 -mb-1 whitespace-nowrap',
              activeTab === tab.key 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )"
          >
            {{ tab.label }} <span class="ml-1.5 text-[10px] opacity-60">{{ searchResults[tab.key].length }}</span>
          </button>
        </div>

        <!-- Filters & Sorting -->
        <div class="flex flex-wrap gap-2.5">
          <div class="relative flex-1 min-w-[200px]">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              v-model="resultFilter" 
              :placeholder="`Filtrar ${activeTab}...`" 
              class="pl-11 h-12 bg-muted/40 border-none rounded-xl font-medium focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            <button 
              v-if="resultFilter" 
              @click="resultFilter = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
            >
              <XCircle class="h-4 w-4" />
            </button>
          </div>

          <Select :model-value="sortOrders[activeTab]" @update:model-value="v => sortOrders[activeTab] = v">
            <SelectTrigger class="w-[200px] h-12 bg-card border-muted-foreground/10 rounded-xl gap-2 shadow-sm font-bold">
              <ArrowUpDown class="h-4 w-4 text-primary" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent class="rounded-xl shadow-2xl">
              <SelectItem value="default" class="font-bold">Por Defecto</SelectItem>
              <template v-if="activeTab === 'tracks'">
                <SelectItem value="title-asc">Título (A-Z)</SelectItem>
                <SelectItem value="title-desc">Título (Z-A)</SelectItem>
                <SelectItem value="artist-asc">Artista (A-Z)</SelectItem>
                <SelectItem value="artist-desc">Artista (Z-A)</SelectItem>
                <SelectItem value="duration-desc">Duración (Más Largo)</SelectItem>
                <SelectItem value="duration-asc">Duración (Más Corto)</SelectItem>
              </template>
              <template v-if="activeTab === 'albums'">
                <SelectItem value="title-asc">Título (A-Z)</SelectItem>
                <SelectItem value="title-desc">Título (Z-A)</SelectItem>
                <SelectItem value="artist-asc">Artista (A-Z)</SelectItem>
                <SelectItem value="artist-desc">Artista (Z-A)</SelectItem>
                <SelectItem value="year-desc">Año (Nuevo)</SelectItem>
                <SelectItem value="year-asc">Año (Viejo)</SelectItem>
              </template>
              <template v-if="activeTab === 'artists'">
                <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
              </template>
              <template v-if="activeTab === 'playlists'">
                <SelectItem value="title-asc">Título (A-Z)</SelectItem>
                <SelectItem value="title-desc">Título (Z-A)</SelectItem>
                <SelectItem value="owner-asc">Creador (A-Z)</SelectItem>
                <SelectItem value="owner-desc">Creador (Z-A)</SelectItem>
              </template>
            </SelectContent>
          </Select>
        </div>

        <!-- Result Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-3 custom-scrollbar">
          <!-- Tracks -->
          <template v-if="activeTab === 'tracks'">
            <button 
              v-for="track in sortedResults.tracks" 
              :key="track.id" 
              class="flex items-center gap-4 p-3.5 rounded-2xl bg-card hover:bg-accent/40 border-2 border-transparent hover:border-primary/20 cursor-pointer text-left transition-all group relative overflow-hidden"
              @click="handleResultClick(track.external_urls)"
            >
              <div class="h-14 w-14 rounded-xl overflow-hidden shrink-0 shadow-lg relative">
                <img v-if="track.images" :src="track.images" class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div v-else class="h-full w-full bg-muted flex items-center justify-center">
                   <Clock class="h-6 w-6 opacity-20" />
                </div>
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <CloudDownload class="h-6 w-6 text-white scale-75 group-hover:scale-100 transition-transform" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                   <p class="font-black truncate group-hover:text-primary transition-colors">{{ track.name }}</p>
                   <span v-if="track.is_explicit" class="px-1 text-[10px] font-black bg-red-600/90 text-white rounded-sm shrink-0 shadow-sm">E</span>
                </div>
                <p class="text-xs font-bold text-muted-foreground truncate opacity-70">{{ track.artists }}</p>
              </div>
              <span class="text-xs font-mono font-bold text-muted-foreground/60 bg-muted/40 px-2 py-1 rounded-lg">
                {{ formatDuration(track.duration_ms || 0) }}
              </span>
            </button>
          </template>

          <!-- Albums -->
          <template v-if="activeTab === 'albums'">
            <button 
              v-for="album in sortedResults.albums" 
              :key="album.id" 
              class="flex items-center gap-4 p-3.5 rounded-2xl bg-card hover:bg-accent/40 border-2 border-transparent hover:border-primary/20 cursor-pointer text-left transition-all group"
              @click="handleResultClick(album.external_urls)"
            >
              <div class="h-14 w-14 rounded-xl overflow-hidden shrink-0 shadow-lg">
                <img v-if="album.images" :src="album.images" class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-black truncate group-hover:text-primary transition-colors text-base">{{ album.name }}</p>
                <p class="text-xs font-bold text-muted-foreground truncate opacity-70">{{ album.artists }}</p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                 <span class="text-[10px] font-black uppercase tracking-tighter bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Álbum</span>
                 <span class="text-xs font-bold text-muted-foreground opacity-60">{{ album.release_date || "" }}</span>
              </div>
            </button>
          </template>

          <!-- Artists -->
          <template v-if="activeTab === 'artists'">
            <button 
              v-for="artist in sortedResults.artists" 
              :key="artist.id" 
              class="flex items-center gap-4 p-4 rounded-3xl bg-card hover:bg-accent/40 border-2 border-transparent hover:border-primary/20 cursor-pointer text-left transition-all group"
              @click="handleResultClick(artist.external_urls)"
            >
              <div class="h-16 w-16 rounded-full overflow-hidden shrink-0 shadow-2xl border-2 border-background ring-4 ring-muted/10 group-hover:ring-primary/20 transition-all">
                <img v-if="artist.images" :src="artist.images" class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-black text-lg truncate group-hover:text-primary transition-colors">{{ artist.name }}</p>
                <div class="flex items-center gap-1.5">
                   <span class="w-1.5 h-1.5 rounded-full bg-primary" />
                   <p class="text-xs font-black uppercase tracking-tighter text-muted-foreground opacity-70">Artista Oficial</p>
                </div>
              </div>
            </button>
          </template>

          <!-- Playlists -->
          <template v-if="activeTab === 'playlists'">
            <button 
              v-for="playlist in sortedResults.playlists" 
              :key="playlist.id" 
              class="flex items-center gap-4 p-4 rounded-2xl bg-card hover:bg-accent/40 border-2 border-transparent hover:border-primary/20 cursor-pointer text-left transition-all group"
              @click="handleResultClick(playlist.external_urls)"
            >
              <div class="h-16 w-16 rounded-2xl overflow-hidden shrink-0 shadow-lg relative">
                <img v-if="playlist.images" :src="playlist.images" class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-black text-lg truncate group-hover:text-primary transition-colors tracking-tight">{{ playlist.name }}</p>
                <div class="flex items-center gap-1">
                   <span class="text-xs font-bold text-muted-foreground opacity-60">Creada por</span>
                   <span class="text-xs font-black text-primary/80">{{ playlist.owner || "" }}</span>
                </div>
              </div>
            </button>
          </template>
        </div>

        <!-- Load More -->
        <div v-if="hasMore[activeTab]" class="flex justify-center pt-6">
          <Button 
            variant="outline" 
            @click="handleLoadMore" 
            :disabled="isLoadingMore"
            class="rounded-full px-10 h-12 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 font-black text-xs uppercase tracking-widest gap-2.5 transition-all shadow-xl hover:shadow-primary/5 overflow-hidden relative"
          >
            <Spinner v-if="isLoadingMore" size="sm" />
            <ChevronDown v-else class="h-4 w-4 text-primary" />
            <span>{{ isLoadingMore ? 'Buscando más...' : 'Cargar más resultados' }}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Invalid URL Dialog -->
    <Dialog v-model:open="showInvalidUrlDialog">
      <DialogContent class="sm:max-w-[480px] rounded-3xl p-8 border-none ring-1 ring-muted/20 shadow-3xl backdrop-blur-3xl bg-background/90">
        <DialogHeader class="gap-4">
          <div class="mx-auto bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mb-2">
            <XCircle class="h-10 w-10 text-destructive animate-in zoom-in duration-500" />
          </div>
          <DialogTitle class="text-3xl font-black text-center tracking-tighter">URL no válida</DialogTitle>
          <DialogDescription class="text-center text-base font-medium px-4 opacity-80">
            Solo se permiten enlaces oficiales de <span class="text-primary font-black">Spotify</span> en el modo de Sincronización Directa.
          </DialogDescription>
        </DialogHeader>

        <div v-if="invalidUrl" class="my-6 p-6 bg-muted/50 rounded-2xl border-2 border-dashed border-destructive/20 text-xs font-mono break-all opacity-90 text-destructive/80 leading-relaxed shadow-inner">
          <p class="mb-2 font-black uppercase text-[10px] opacity-40">Entrada rechazada:</p>
          {{ invalidUrl }}
        </div>

        <DialogFooter class="sm:justify-center pt-4">
          <Button 
            variant="outline" 
            @click="showInvalidUrlDialog = false"
            class="rounded-2xl h-14 w-full text-lg font-black hover:bg-muted border-2 transition-all active:scale-[0.98]"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--primary) / 0.1);
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--primary) / 0.3);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
