<script setup lang="ts">
import { inject } from 'vue';

const context = inject<any>('selectContext');
</script>

<template>
  <div 
    v-if="context?.isOpen?.value"
    :class="[
      'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95 top-full mt-1 w-full',
      $attrs.class
    ]"
  >
    <div class="p-1">
      <slot />
    </div>
  </div>
</template>
