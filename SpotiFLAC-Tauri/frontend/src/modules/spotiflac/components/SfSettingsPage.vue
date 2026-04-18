<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import {
  useSettings,
  type FolderPreset,
  type FilenamePreset,
  type FontFamily,
} from "../composables/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  Save,
  RotateCcw,
  Info,
  Monitor,
  FolderCog,
  Settings2,
  Music,
  Database,
  ShieldCheck,
  Languages,
  Palette,
  ExternalLink,
  FolderCheck,
} from "lucide-vue-next";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "vue-sonner";
import SfPlatformIcons from "./SfPlatformIcons.vue";

const props = defineProps<{
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
  onResetRequest?: ((resetFn: () => void) => void) | null;
}>();

const { settings, save, reset, initialized } = useSettings();

// Local temporary state for unsaved changes
const tempSettings = reactive({ ...settings.value });

// Watch for external changes to settings
watch(
  settings,
  (newVal) => {
    Object.assign(tempSettings, newVal);
  },
  { deep: true },
);

const hasUnsavedChanges = ref(false);
watch(
  tempSettings,
  () => {
    hasUnsavedChanges.value =
      JSON.stringify(tempSettings) !== JSON.stringify(settings.value);
    props.onUnsavedChangesChange?.(hasUnsavedChanges.value);
  },
  { deep: true },
);

const handleSave = async () => {
  await save({ ...tempSettings });
  hasUnsavedChanges.value = false;
  props.onUnsavedChangesChange?.(false);
  toast.success("Settings saved successfully");
};

const handleReset = async () => {
  await reset();
  Object.assign(tempSettings, settings.value);
  hasUnsavedChanges.value = false;
  props.onUnsavedChangesChange?.(false);
  toast.success("Settings reset to defaults");
};

const resetToSavedSettings = () => {
  Object.assign(tempSettings, settings.value);
  hasUnsavedChanges.value = false;
  props.onUnsavedChangesChange?.(false);
};

const pickFolder = async () => {
  try {
    const selected = await invoke<string | null>("select_folder");
    if (selected) {
      tempSettings.downloadPath = selected;
    }
  } catch (err) {
    console.error(err);
  }
};

const openConfigFolder = async () => {
  await invoke("open_config_folder");
};

import {
  FOLDER_PRESETS,
  FILENAME_PRESETS,
  FONT_OPTIONS,
} from "../utils/settings";

const QUALITY_DESC = {
  tidal: {
    LOSSLESS: "16-bit FLAC (CD Quality)",
    HI_RES_LOSSLESS: "24-bit FLAC (High Res)",
  },
  qobuz: {
    "6": "MP3 320kbps",
    "7": "16-bit FLAC",
    "27": "24-bit FLAC",
  },
};

watch(
  () => props.onResetRequest,
  (registerReset) => {
    registerReset?.(resetToSavedSettings);
  },
  { immediate: true },
);
</script>

<template>
  <div class="h-full flex flex-col space-y-6 max-w-[1000px] mx-auto pb-20">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 sticky top-0 bg-background/95 backdrop-blur z-20"
    >
      <div class="space-y-1">
        <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
        <p class="text-muted-foreground">
          Configure your downloader, quality preferences, and UI appearance.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          @click="handleReset"
          class="gap-2 h-10 border-muted-foreground/20"
        >
          <RotateCcw class="h-4 w-4" />
          Reset
        </Button>
        <Button
          @click="handleSave"
          :disabled="!hasUnsavedChanges"
          :class="[
            'gap-2 h-10 px-6 shadow-lg transition-all duration-300',
            hasUnsavedChanges
              ? 'bg-primary shadow-primary/20 scale-100'
              : 'bg-muted text-muted-foreground scale-95 opacity-50',
          ]"
        >
          <Save class="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>

    <div v-if="initialized" class="space-y-10 animate-in fade-in duration-700">
      <!-- Download Location -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 text-primary">
          <FolderCog class="h-5 w-5" />
          <h2 class="text-lg font-bold">Storage & Paths</h2>
        </div>
        <Card>
          <CardContent class="pt-6 space-y-4">
            <div class="space-y-2">
              <Label>Default Download Path</Label>
              <div class="flex gap-2">
                <Input
                  v-model="tempSettings.downloadPath"
                  placeholder="C:\Users\...\Music"
                  class="font-mono text-sm border-muted-foreground/20"
                />
                <Button variant="secondary" @click="pickFolder" class="gap-2">
                  <FolderOpen class="h-4 w-4" />
                  Browse
                </Button>
              </div>
              <p
                class="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1"
              >
                This is where all your synced music will be stored.
              </p>
            </div>
            <Separator />
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label>Config Directory</Label>
                <p class="text-xs text-muted-foreground">
                  Manage databases, logs, and persistent state files.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                @click="openConfigFolder"
                class="gap-2 text-primary hover:bg-primary/10"
              >
                <ExternalLink class="h-3.5 w-3.5" />
                Open Config Folder
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Provider Settings -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 text-primary">
          <Database class="h-5 w-5" />
          <h2 class="text-lg font-bold">Quality & Providers</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Tidal -->
          <Card class="border-l-4 border-l-black">
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <SfPlatformIcons platform="tidal" class="h-5 w-5" />
                  <CardTitle class="text-base font-bold">Tidal</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <Label class="text-xs font-bold text-muted-foreground"
                  >Max Download Quality</Label
                >
                <Select v-model="tempSettings.tidalQuality">
                  <SelectTrigger class="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOSSLESS">Lossless (CD)</SelectItem>
                    <SelectItem value="HI_RES_LOSSLESS"
                      >Hi-Res Lossless (MQA/FLAC)</SelectItem
                    >
                  </SelectContent>
                </Select>
                <p class="text-[11px] text-muted-foreground italic">
                  {{
                    QUALITY_DESC.tidal[
                      tempSettings.tidalQuality as keyof typeof QUALITY_DESC.tidal
                    ]
                  }}
                </p>
              </div>
            </CardContent>
          </Card>

          <!-- Qobuz -->
          <Card class="border-l-4 border-l-blue-500">
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <SfPlatformIcons platform="qobuz" class="h-5 w-5" />
                  <CardTitle class="text-base font-bold">Qobuz</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <Label class="text-xs font-bold text-muted-foreground"
                  >Max Download Quality</Label
                >
                <Select v-model="tempSettings.qobuzQuality">
                  <SelectTrigger class="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">MP3 320kbps</SelectItem>
                    <SelectItem value="7">Lossless (16-bit)</SelectItem>
                    <SelectItem value="27">Hi-Res (24-bit)</SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-[11px] text-muted-foreground italic">
                  {{
                    QUALITY_DESC.qobuz[
                      tempSettings.qobuzQuality as keyof typeof QUALITY_DESC.qobuz
                    ]
                  }}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <!-- Engine & Metadata -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 text-primary">
          <Settings2 class="h-5 w-5" />
          <h2 class="text-lg font-bold">Downloader Engine</h2>
        </div>
        <Card>
          <CardContent class="pt-6 space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div class="space-y-0.5">
                    <Label>Embed Lyrics</Label>
                    <p class="text-xs text-muted-foreground">
                      Automatically write synchronized lyrics to file tags.
                    </p>
                  </div>
                  <Switch v-model="tempSettings.embedLyrics" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="space-y-0.5">
                    <Label>Embed Genre</Label>
                    <p class="text-xs text-muted-foreground">
                      Enrich tracks with high-accuracy genres from MusicBrainz.
                    </p>
                  </div>
                  <Switch v-model="tempSettings.embedGenre" />
                </div>
              </div>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div class="space-y-0.5">
                    <Label>Embed 1:1 Cover</Label>
                    <p class="text-xs text-muted-foreground">
                      Inject maximum resolution album cover into tracks.
                    </p>
                  </div>
                  <Switch v-model="tempSettings.embedMaxQualityCover" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="space-y-0.5">
                    <Label>Create M3U8 Playlist</Label>
                    <p class="text-xs text-muted-foreground">
                      Generate playlist files for local library management.
                    </p>
                  </div>
                  <Switch v-model="tempSettings.createM3u8File" />
                </div>
              </div>
            </div>

            <Separator />

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div class="space-y-2">
                <Label>Folder Structure</Label>
                <Select v-model="tempSettings.folderPreset">
                  <SelectTrigger class="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="(v, k) in FOLDER_PRESETS"
                      :key="k"
                      :value="k"
                      >{{ v.label }}</SelectItem
                    >
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label>Filename Convention</Label>
                <Select v-model="tempSettings.filenamePreset">
                  <SelectTrigger class="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="(v, k) in FILENAME_PRESETS"
                      :key="k"
                      :value="k"
                      >{{ v.label }}</SelectItem
                    >
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Appearance -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 text-primary">
          <Palette class="h-5 w-5" />
          <h2 class="text-lg font-bold">Aesthetics & UI</h2>
        </div>
        <Card>
          <CardContent class="pt-6 space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div class="space-y-2">
                <Label>Theme Mode</Label>
                <div class="flex p-1 bg-muted rounded-lg gap-1">
                  <button
                    @click="tempSettings.themeMode = 'light'"
                    :class="[
                      'flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                      tempSettings.themeMode === 'light'
                        ? 'bg-background shadow text-primary'
                        : 'text-muted-foreground',
                    ]"
                  >
                    LIGHT
                  </button>
                  <button
                    @click="tempSettings.themeMode = 'dark'"
                    :class="[
                      'flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                      tempSettings.themeMode === 'dark'
                        ? 'bg-background shadow text-primary'
                        : 'text-muted-foreground',
                    ]"
                  >
                    DARK
                  </button>
                  <button
                    @click="tempSettings.themeMode = 'auto'"
                    :class="[
                      'flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                      tempSettings.themeMode === 'auto'
                        ? 'bg-background shadow text-primary'
                        : 'text-muted-foreground',
                    ]"
                  >
                    SYSTEM
                  </button>
                </div>
              </div>

              <div class="space-y-2">
                <Label>Typography</Label>
                <Select v-model="tempSettings.fontFamily">
                  <SelectTrigger class="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="f in FONT_OPTIONS"
                      :key="f.value"
                      :value="f.value"
                      :style="{ fontFamily: f.fontFamily }"
                    >
                      {{ f.label.toUpperCase() }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label>SFX Engine</Label>
                <p class="text-xs text-muted-foreground">
                  Play subtle confirmation sounds for application events.
                </p>
              </div>
              <Switch v-model="tempSettings.sfxEnabled" />
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- App Status & Debug -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 text-primary">
          <ShieldCheck class="h-5 w-5" />
          <h2 class="text-lg font-bold">System Integrity</h2>
        </div>
        <Card>
          <CardContent class="p-0">
            <div
              class="flex items-center p-6 justify-between flex-wrap gap-4 bg-muted/20"
            >
              <div class="space-y-1">
                <h4 class="font-bold">Downloader Engine (Rust/Tauri)</h4>
                <p class="text-xs text-muted-foreground font-mono">
                  Build v2.1.0-stable | OpenSource License
                </p>
              </div>
              <div class="flex items-center gap-2">
                <div
                  class="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider"
                >
                  Core Reactive
                </div>
                <div
                  class="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-wider"
                >
                  FFmpeg Validated
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-40 gap-4">
      <div
        class="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-sm font-medium text-muted-foreground animate-pulse">
        Initializing settings engine...
      </p>
    </div>
  </div>
</template>
