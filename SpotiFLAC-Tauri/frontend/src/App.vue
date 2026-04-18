<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Toaster } from 'vue-sonner';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { 
  SfSidebar, SfHeader, SfMainPage, SfSettingsPage, 
  SfAboutPage, SfHistoryPage, SfAudioAnalysisPage,
  SfAudioConverterPage, SfAudioResamplerPage, SfFileManagerPage,
  SfDebugLoggerPage, SfDownloadQueue, SfDownloadProgressToast,
  SfTitleBar
} from './modules/spotiflac/components';
import { type PageType } from './modules/spotiflac/components/SfSidebar.vue';
import { ArrowUp } from 'lucide-vue-next';
import { useSettings } from './modules/spotiflac/composables/useSettings';
import { useApiStatus } from './modules/spotiflac/composables/useApiStatus';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { toast } from 'vue-sonner';

const APP_VERSION = ref("2.2.0"); 
const osPlatform = ref("windows"); 

const { settings, loadSettings, applyTheme } = useSettings();
const { ensureApiStatusCheckStarted } = useApiStatus();
const currentPage = ref<PageType>('main');
const showDownloadQueue = ref(false);

// FFmpeg State
const isFFmpegInstalled = ref<boolean | null>(null);
const isInstallingFFmpeg = ref(false);
const ffmpegProgress = ref(0);
const ffmpegStatus = ref("");

// Updates State
const hasUpdate = ref(false);
const releaseDate = ref<string | null>(null);

onMounted(async () => {
  // 1. Initial State
  await loadSettings();
  
  // 2. Startup Orchestration
  checkFFmpeg();
  
  // Get App Version
  try {
    const v = await invoke<string>('get_app_version');
    APP_VERSION.value = v;
  } catch {
    APP_VERSION.value = "2.2.0";
  }

  checkForUpdates();
  ensureApiStatusCheckStarted();

  // Get platform
  try {
    const p = await invoke<string>('get_platform');
    osPlatform.value = p;
  } catch {
    osPlatform.value = "windows";
  }

  // 3. Listen for FFmpeg Events
  const unlistenProgress = await listen<number>('ffmpeg-progress', (event) => {
    ffmpegProgress.value = event.payload;
    if (event.payload >= 100) ffmpegStatus.value = "Extracting binaries...";
    else ffmpegStatus.value = `Downloading binaries... ${event.payload.toFixed(1)}%`;
  });

  const unlistenStatus = await listen<string>('ffmpeg-status', (event) => {
    ffmpegStatus.value = event.payload;
  });

  onUnmounted(() => {
    unlistenProgress();
    unlistenStatus();
  });

  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

const checkFFmpeg = async () => {
  try {
    const installed = await invoke<boolean>('check_ffmpeg_installed');
    isFFmpegInstalled.value = installed;
  } catch (err) {
    console.error("FFmpeg check failed:", err);
    isFFmpegInstalled.value = false;
  }
};

const installFFmpeg = async () => {
  isInstallingFFmpeg.value = true;
  ffmpegProgress.value = 0;
  ffmpegStatus.value = "Initializing...";
  
  try {
    const response = await invoke<{ success: boolean; error?: string }>('download_ffmpeg');
    if (response.success) {
      toast.success("FFmpeg installed successfully!");
      isFFmpegInstalled.value = true;
    } else {
      toast.error(response.error || "Failed to install FFmpeg. Please check logs.");
    }
  } catch (err: any) {
    toast.error(`Installation error: ${err}`);
  } finally {
    isInstallingFFmpeg.value = false;
  }
};

const checkForUpdates = async () => {
  try {
    const response = await fetch("https://api.github.com/repos/afkarxyz/SpotiFLAC/releases/latest");
    const data = await response.json();
    const latestVersion = data.tag_name?.replace(/^v/, "") || "";
    
    releaseDate.value = data.published_at || null;
    if (latestVersion && latestVersion > APP_VERSION.value) {
      hasUpdate.value = true;
    }
  } catch (err) {
    console.error("Update check failed:", err);
  }
};

const showScrollTop = ref(false);

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 300;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handlePageChange = (page: PageType | 'queue') => {
  if (page === 'queue') {
    showDownloadQueue.value = true;
  } else {
    currentPage.value = page;
    scrollToTop();
  }
};
</script>

<template>
  <div class="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans border shadow-2xl rounded-lg">
    <SfTitleBar />

    <!-- Sidebar -->
    <SfSidebar :current-page="currentPage" @page-change="handlePageChange" />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col relative overflow-hidden pt-10 ml-14">
      <!-- Fixed Header -->
      <SfHeader :version="APP_VERSION" :has-update="hasUpdate" :release-date="releaseDate" />

      <!-- Dynamic Page Scroll Area -->
      <div class="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 bg-gradient-to-b from-background to-muted/10">
        <transition 
          name="page-fade" 
          mode="out-in"
        >
          <div :key="currentPage" class="h-full max-w-6xl mx-auto">
            <SfMainPage v-if="currentPage === 'main'" />
            <SfSettingsPage v-else-if="currentPage === 'settings'" />
            <SfAboutPage v-else-if="currentPage === 'about'" />
            <SfHistoryPage v-else-if="currentPage === 'history'" />
            <SfAudioAnalysisPage v-else-if="currentPage === 'audio-analysis'" />
            <SfAudioConverterPage v-else-if="currentPage === 'audio-converter'" />
            <SfAudioResamplerPage v-else-if="currentPage === 'audio-resampler'" />
            <SfFileManagerPage v-else-if="currentPage === 'file-manager'" />
            <SfDebugLoggerPage v-else-if="currentPage === 'debug'" />
          </div>
        </transition>
      </div>

      <!-- Overlays -->
      <SfDownloadQueue :is-open="showDownloadQueue" @close="showDownloadQueue = false" />
      <SfDownloadProgressToast />

      <!-- Scroll to Top -->
      <transition name="fade">
        <Button 
          v-if="showScrollTop"
          variant="outline" 
          size="icon" 
          class="fixed bottom-6 right-6 h-10 w-10 rounded-full shadow-lg border-primary/20 bg-background/80 backdrop-blur-md hover:bg-primary hover:text-white transition-all z-[60]"
          @click="scrollToTop"
        >
          <ArrowUp class="h-4 w-4" />
        </Button>
      </transition>
    </main>

    <!-- FFmpeg Missing Dialog -->
    <Dialog :open="isFFmpegInstalled === false && !isInstallingFFmpeg">
      <DialogContent class="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-primary">
            <div class="h-2 w-2 rounded-full bg-primary animate-ping"></div>
            FFmpeg Dependency Missing
          </DialogTitle>
          <DialogDescription class="pt-2">
            SpotiFLAC requires FFmpeg to process and resample your high-quality downloads. 
            Would you like us to automatically download and configure it for you?
          </DialogDescription>
        </DialogHeader>
        <div class="bg-muted/30 p-4 rounded-xl border border-dashed border-muted-foreground/20 text-[11px] font-mono text-muted-foreground">
          Estimated download size: ~60MB <br/>
          Platform: {{ osPlatform }}-x64
        </div>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="ghost" @click="isFFmpegInstalled = null">Later</Button>
          <Button @click="installFFmpeg">Install Automatically</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- FFmpeg Installing Overlay -->
    <div v-if="isInstallingFFmpeg" class="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-6">
      <div class="max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in duration-300">
        <div class="space-y-2">
          <h2 class="text-2xl font-black tracking-tighter uppercase italic">Installing FFmpeg</h2>
          <p class="text-sm text-muted-foreground font-medium">{{ ffmpegStatus }}</p>
        </div>
        
        <div class="relative py-4">
           <Progress :model-value="ffmpegProgress" class="h-3 shadow-inner" />
           <div class="absolute -bottom-2 right-0 text-[10px] font-mono opacity-50">{{ ffmpegProgress.toFixed(1) }}%</div>
        </div>

        <div class="pt-4 flex justify-center">
          <div class="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <div class="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
            <span class="text-[10px] font-black text-primary uppercase tracking-widest">Optimizing Engine</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Global Components -->
    <Toaster position="bottom-right" richColors closeButton theme="dark" />
  </div>
</template>

<style>
/* Global Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.1);
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.2);
}

/* Page Transitions */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
  filter: blur(10px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.98);
  filter: blur(10px);
}

/* Base Styles */
body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: transparent;
  user-select: none;
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
