<script setup lang="ts">
import { 
  ArrowLeft, ArrowRight, Github, Info
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Tooltip } from "@/components/ui/tooltip";

defineProps<{
  version: string;
  hasUpdate?: boolean;
  releaseDate?: string | null;
}>();

const openGithub = () => {
  window.open('https://github.com/afkarxyz/SpotiFLAC', '_blank');
};
</script>

<template>
  <header class="h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 select-none">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="icon" class="h-8 w-8 opacity-50 hover:opacity-100">
           <ArrowLeft class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" class="h-8 w-8 opacity-50 hover:opacity-100">
           <ArrowRight class="h-4 w-4" />
        </Button>
      </div>
      
      <div class="h-8 w-[1px] bg-border mx-2"></div>
      
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 group cursor-pointer" @click="openGithub">
          <div class="p-1.5 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
             <Github class="h-4 w-4" />
          </div>
          <div class="flex flex-col -space-y-1">
            <span class="text-[10px] font-black uppercase tracking-widest opacity-60">SpotiFLAC</span>
            <span class="text-[13px] font-bold text-foreground">v{{ version }}</span>
          </div>
        </div>

        <Tooltip v-if="hasUpdate">
          <template #content>
            <p>A new version is available on GitHub</p>
            <p v-if="releaseDate" class="text-[10px] opacity-60">Released: {{ new Date(releaseDate).toLocaleDateString() }}</p>
          </template>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full animate-pulse cursor-pointer" @click="openGithub">
            <div class="h-1.5 w-1.5 rounded-full bg-green-500"></div>
            <span class="text-[10px] font-black text-green-500 uppercase tracking-tighter">Update Available</span>
          </div>
        </Tooltip>
      </div>
    </div>

    <div class="flex items-center gap-3">
       <div class="hidden md:flex flex-col items-end mr-2">
          <span class="text-[10px] font-black text-primary uppercase tracking-tighter">Engine Status</span>
          <span class="text-[11px] font-bold text-muted-foreground opacity-80">CONNECTED / STABLE</span>
       </div>
       
       <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center p-0.5">
          <div class="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
             <img src="https://ui-avatars.com/api/?name=User&background=random" class="h-full w-full object-cover" />
          </div>
       </div>
    </div>
  </header>
</template>
