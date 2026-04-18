<script setup lang="ts">
import { ref, provide } from 'vue';

const props = defineProps<{
  modelValue?: string | number;
}>();

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);

const select = (value: string | number) => {
  emit('update:modelValue', value);
  isOpen.value = false;
};

provide('selectContext', {
  modelValue: props,
  select,
  isOpen
});

const toggle = () => {
  isOpen.value = !isOpen.value;
};
</script>

<template>
  <div class="relative w-full">
    <slot :toggle="toggle" :isOpen="isOpen" />
  </div>
</template>
