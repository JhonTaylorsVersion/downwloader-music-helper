<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  content?: string;
  delay?: number;
}>();

const visible = ref(false);
let timer: any = null;

const show = () => {
  timer = setTimeout(() => {
    visible.value = true;
  }, props.delay || 300);
};

const hide = () => {
  clearTimeout(timer);
  visible.value = false;
};
</script>

<template>
  <div class="relative inline-block" @mouseenter="show" @mouseleave="hide">
    <slot />
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="visible"
        class="absolute z-[100] px-3 py-1.5 text-xs font-medium text-white bg-black/90 border border-white/10 rounded shadow-xl backdrop-blur-sm -top-1 w-max -translate-y-full left-1/2 -translate-x-1/2 pointer-events-none"
      >
        <slot name="content">{{ content }}</slot>
      </div>
    </Transition>
  </div>
</template>
