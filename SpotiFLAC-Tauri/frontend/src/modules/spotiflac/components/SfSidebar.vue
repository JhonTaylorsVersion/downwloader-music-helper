<script setup lang="ts">
import { ref } from 'vue';
import { 
  Home, History, Settings, Terminal, Blocks, Activity, 
  AudioLines, FileMusic, FilePen, Github, Coffee, 
  BadgeAlert, ExternalLink, ChevronRight
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { invoke } from '@tauri-apps/api/core';

export type PageType = "main" | "settings" | "debug" | "audio-analysis" | "audio-converter" | "audio-resampler" | "file-manager" | "about" | "history";

const props = defineProps<{
  currentPage: PageType;
}>();

const emit = defineEmits<{
  (e: 'page-change', page: PageType): void;
}>();

const isIssuesDialogOpen = ref(false);
const hasIssueAgreement = ref(false);

const openExternal = async (url: string) => {
  await invoke('open_url', { url });
};

const handleOpenIssues = () => {
  openExternal("https://github.com/spotbye/SpotiFLAC/issues");
  isIssuesDialogOpen.value = false;
  hasIssueAgreement.value = false;
};

const toolPages = ["audio-analysis", "audio-converter", "audio-resampler", "file-manager"];
const isToolActive = (page: PageType) => toolPages.includes(page);
</script>

<template>
  <div class="fixed left-0 top-0 h-full w-14 bg-card border-r border-border flex flex-col items-center py-12 z-40 transition-all duration-500 shadow-2xl">
    <!-- Top Navigation -->
    <div class="flex flex-col gap-3 flex-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            :class="['h-10 w-10 h-10 w-10 rounded-xl transition-all duration-300', currentPage === 'main' ? 'bg-primary/15 text-primary shadow-lg shadow-primary/10' : 'opacity-40 hover:opacity-100 hover:bg-primary/5']"
            @click="emit('page-change', 'main')"
          >
            <Home class="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" class="font-black text-[10px] uppercase">Home</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            :class="['h-10 w-10 h-10 w-10 rounded-xl transition-all duration-300', currentPage === 'history' ? 'bg-primary/15 text-primary shadow-lg shadow-primary/10' : 'opacity-40 hover:opacity-100 hover:bg-primary/5']"
            @click="emit('page-change', 'history')"
          >
            <History class="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" class="font-black text-[10px] uppercase">History</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            :class="['h-10 w-10 h-10 w-10 rounded-xl transition-all duration-300', currentPage === 'settings' ? 'bg-primary/15 text-primary shadow-lg shadow-primary/10' : 'opacity-40 hover:opacity-100 hover:bg-primary/5']"
            @click="emit('page-change', 'settings')"
          >
            <Settings class="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" class="font-black text-[10px] uppercase">Settings</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            :class="['h-10 w-10 h-10 w-10 rounded-xl transition-all duration-300', currentPage === 'debug' ? 'bg-primary/15 text-primary shadow-lg shadow-primary/10' : 'opacity-40 hover:opacity-100 hover:bg-primary/5']"
            @click="emit('page-change', 'debug')"
          >
            <Terminal class="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" class="font-black text-[10px] uppercase">Debug Logs</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                :class="['h-10 w-10 h-10 w-10 rounded-xl transition-all duration-300 relative group', isToolActive(currentPage) ? 'bg-primary/15 text-primary shadow-lg shadow-primary/10' : 'opacity-40 hover:opacity-100 hover:bg-primary/5']"
              >
                <Blocks class="h-5 w-5 transition-transform group-hover:rotate-12" />
                <div v-if="isToolActive(currentPage)" class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"></div>
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="right" class="font-black text-[10px] uppercase">Tools</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" :side-offset="14" class="min-w-[220px] ml-2 p-1.5 rounded-2xl shadow-2xl backdrop-blur-xl bg-background/95 border-muted-foreground/10">
          <DropdownMenuLabel class="px-3 py-2 text-[10px] font-black uppercase tracking-widest opacity-40">System Utilities</DropdownMenuLabel>
          <DropdownMenuItem @click="emit('page-change', 'audio-analysis')" class="gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 font-bold transition-all group">
            <div class="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
              <Activity class="h-4 w-4" />
            </div>
            <span>Audio Quality Analyzer</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('page-change', 'audio-resampler')" class="gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 font-bold transition-all group">
            <div class="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
              <AudioLines class="h-4 w-4" />
            </div>
            <span>Audio Resampler</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('page-change', 'audio-converter')" class="gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 font-bold transition-all group">
            <div class="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
              <FileMusic class="h-4 w-4" />
            </div>
            <span>Audio Converter</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('page-change', 'file-manager')" class="gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 font-bold transition-all group">
            <div class="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
              <FilePen class="h-4 w-4" />
            </div>
            <span>File Manager</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Bottom Navigation -->
    <div class="mt-auto flex flex-col gap-3">
      <Dialog v-model:open="isIssuesDialogOpen">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              class="h-10 w-10 h-10 w-10 rounded-xl transition-all duration-300 opacity-40 hover:opacity-100 hover:bg-primary/5"
              @click="isIssuesDialogOpen = true"
            >
              <Github class="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" class="font-black text-[10px] uppercase">Report Bugs</TooltipContent>
        </Tooltip>
        
        <DialogContent class="max-w-xl rounded-[2rem] border-none shadow-3xl p-8 backdrop-blur-2xl bg-background/95 ring-1 ring-muted-foreground/10 animate-in zoom-in-95">
          <DialogHeader class="gap-4">
            <div class="mx-auto h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-2">
              <Github class="h-10 w-10 text-primary" />
            </div>
            <DialogTitle class="text-3xl font-black text-center tracking-tighter">Antes de abrir Issues</DialogTitle>
            <DialogDescription class="text-center font-medium opacity-60">
              Ayúdanos a mantener el proyecto limpio siguiendo estas directrices.
            </DialogDescription>
          </DialogHeader>

          <div class="space-y-6 pt-4">
            <div class="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-5 space-y-2">
              <p class="font-black text-primary text-xs uppercase tracking-widest">Importante</p>
              <p class="text-sm font-medium leading-relaxed opacity-80">
                Busca primero en los issues existentes y utiliza la plantilla (template) al abrir un nuevo reporte o sugerencia.
              </p>
            </div>

            <label class="flex cursor-pointer items-center gap-4 rounded-3xl border-2 border-muted-foreground/5 p-6 hover:bg-muted/30 transition-all group active:scale-[0.98]">
              <Checkbox 
                class="h-6 w-6 rounded-lg border-2" 
                :checked="hasIssueAgreement" 
                @update:checked="v => hasIssueAgreement = !!v"
              />
              <span class="text-sm font-bold opacity-70 group-hover:opacity-100 transition-opacity">
                Entiendo que debo usar la plantilla de issue y evitar duplicados.
              </span>
            </label>
          </div>

          <DialogFooter class="sm:justify-between gap-3 pt-6">
            <Button 
              variant="outline" 
              class="rounded-2xl h-14 px-8 font-black border-2"
              @click="isIssuesDialogOpen = false"
            >
              Cancelar
            </Button>
            <Button 
              class="rounded-2xl h-14 px-10 font-black shadow-lg shadow-primary/20 flex-1 sm:flex-none gap-2"
              :disabled="!hasIssueAgreement" 
              @click="handleOpenIssues"
            >
              Abrir en GitHub
              <ExternalLink class="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            :class="['h-10 w-10 h-10 w-10 rounded-xl transition-all duration-300', currentPage === 'about' ? 'bg-primary/15 text-primary shadow-lg shadow-primary/10' : 'opacity-40 hover:opacity-100 hover:bg-primary/5']"
            @click="emit('page-change', 'about')"
          >
            <BadgeAlert class="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" class="font-black text-[10px] uppercase">About</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-10 w-10 h-10 w-10 rounded-xl transition-all duration-300 opacity-40 hover:opacity-100 hover:bg-primary/5 text-amber-500"
            @click="openExternal('https://ko-fi.com/afkarxyz')"
          >
            <Coffee class="h-5 w-5 fill-current" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" class="font-black text-[10px] uppercase">Support on Ko-fi</TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
