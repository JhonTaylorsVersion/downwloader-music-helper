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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toastWithSound as toast } from './modules/spotiflac/utils/toast-with-sound';

import { getCurrentWindow } from '@tauri-apps/api/window';

const APP_VERSION = ref("2.2.0"); 
const osPlatform = ref("windows"); 

const { settings, loadSettings, applyTheme } = useSettings();
const { ensureApiStatusCheckStarted } = useApiStatus();
const currentPage = ref<PageType>('main');
const showDownloadQueue = ref(false);
const hasUnsavedSettings = ref(false);
const pendingPageChange = ref<PageType | null>(null);
const showUnsavedChangesDialog = ref(false);
const resetSettingsFn = ref<(() => void) | null>(null);

// FFmpeg State
const isFFmpegInstalled = ref<boolean | null>(null);
const isInstallingFFmpeg = ref(false);
const ffmpegProgress = ref(0);
const ffmpegStatus = ref("");

// Updates State
const hasUpdate = ref(false);
const releaseDate = ref<string | null>(null);

onMounted(async () => {
  // 1. Initial State (Theme & Local settings)
  await loadSettings();
  
  // 4. Show window IMMEDIATELY after settings are loaded (Eliminates transparent flicker)
  // We do this before network calls to ensure the window doesn't hang hidden.
  try {
    const appWindow = getCurrentWindow();
    await appWindow.show();
  } catch (err) {
    console.error("Failed to show window:", err);
  }

  // 2. Startup Orchestration (Background checks)
  checkFFmpeg();
  
  // Get App Version
  try {
    const v = await invoke<string>('get_app_version');
    APP_VERSION.value = v;
  } catch {
    APP_VERSION.value = "2.2.0";
  }

  checkForUpdates(); // This is a network call, we don't await it to avoid blocking.
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

  const unlistenBackendLog = await listen<string>('backend-log', (event) => {
    console.log(`%c[Backend]%c ${event.payload}`, "color: #7c3aed; font-weight: bold", "");
  });

  // Prepare cleanup functions
  const cleanups = [unlistenProgress, unlistenStatus, unlistenBackendLog];
  (window as any)._spotiflac_cleanups = cleanups;
  
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Warm up audio engine on first interaction
  const warmUpAudio = () => {
    toast.warmUp();
    window.removeEventListener('click', warmUpAudio);
    window.removeEventListener('keydown', warmUpAudio);
  };
  window.addEventListener('click', warmUpAudio, { once: true });
  window.addEventListener('keydown', warmUpAudio, { once: true });
});

onUnmounted(() => {
  const cleanups = (window as any)._spotiflac_cleanups;
  if (cleanups) {
    cleanups.forEach((f: any) => f());
  }
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
  } else if (currentPage.value === 'settings' && hasUnsavedSettings.value && page !== 'settings') {
    pendingPageChange.value = page;
    showUnsavedChangesDialog.value = true;
  } else {
    currentPage.value = page;
    scrollToTop();
  }
};

const handleDiscardChanges = () => {
  showUnsavedChangesDialog.value = false;
  resetSettingsFn.value?.();
  const savedSettings = settings.value;
  applyTheme(savedSettings.theme);
  if (pendingPageChange.value) {
    currentPage.value = pendingPageChange.value;
    pendingPageChange.value = null;
    hasUnsavedSettings.value = false;
    scrollToTop();
  }
};

const handleCancelNavigation = () => {
  showUnsavedChangesDialog.value = false;
  pendingPageChange.value = null;
};

const handleUnsavedChangesChange = (value: boolean) => {
  hasUnsavedSettings.value = value;
};

const handleRegisterSettingsReset = (fn: () => void) => {
  resetSettingsFn.value = fn;
};

const handleHistorySelect = (cachedData: string) => {
  currentPage.value = 'main';
  window.dispatchEvent(new CustomEvent('spotiflac:history-select', { detail: cachedData }));
};
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col text-foreground">
    <SfTitleBar />
    <SfSidebar :current-page="currentPage" @page-change="handlePageChange" />

    <div class="flex-1 ml-14 mt-10 p-4 md:p-8 overflow-y-auto">
      <div class="max-w-4xl mx-auto space-y-6">
        <SfHeader
          v-if="currentPage === 'main'"
          :version="APP_VERSION"
          :has-update="hasUpdate"
          :release-date="releaseDate"
        />

        <SfMainPage v-if="currentPage === 'main'" />
        <SfSettingsPage
          v-else-if="currentPage === 'settings'"
          :on-unsaved-changes-change="handleUnsavedChangesChange"
          :on-reset-request="handleRegisterSettingsReset"
        />
        <SfAboutPage v-else-if="currentPage === 'about'" />
        <SfHistoryPage
          v-else-if="currentPage === 'history'"
          @history-select="handleHistorySelect"
        />
        <SfAudioAnalysisPage v-else-if="currentPage === 'audio-analysis'" />
        <SfAudioConverterPage v-else-if="currentPage === 'audio-converter'" />
        <SfAudioResamplerPage v-else-if="currentPage === 'audio-resampler'" />
        <SfFileManagerPage v-else-if="currentPage === 'file-manager'" />
        <SfDebugLoggerPage v-else-if="currentPage === 'debug'" />
      </div>

      <SfDownloadQueue :is-open="showDownloadQueue" @close="showDownloadQueue = false" />
      <SfDownloadProgressToast @click="showDownloadQueue = true" />

      <Button
        v-if="showScrollTop"
        variant="default"
        size="icon"
        class="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full shadow-lg"
        @click="scrollToTop"
      >
        <ArrowUp class="h-5 w-5" />
      </Button>
    </div>

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

    <Dialog v-model:open="showUnsavedChangesDialog">
      <DialogContent class="sm:max-w-[425px] [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes in Settings. Are you sure you want to leave? Your changes will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="handleCancelNavigation">Cancel</Button>
          <Button variant="destructive" @click="handleDiscardChanges">Discard Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Global Components -->
    <Toaster position="bottom-right" richColors closeButton theme="dark" />
  </div>
</template>

<style>
body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: transparent;
  overflow-x: hidden;
}

#app {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}
</style>
