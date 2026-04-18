<template>
  <!-- Mirrors DownloadProgressToast.tsx 1:1 -->
  <Transition name="slide-up">
    <div
      v-if="hasActiveDownloads"
      class="sf-toast-wrap"
      @click="$emit('click')"
    >
      <button class="sf-toast-btn">
        <div class="sf-toast-inner">
          <!-- Download icon — animates when downloading -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="sf-icon"
            :class="{ 'sf-icon--bounce': queueInfo.is_downloading }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>

          <div class="sf-toast-stats">
            <p class="sf-stat-main">{{ queueInfo.total_downloaded.toFixed(2) }} MB</p>
            <p v-if="queueInfo.current_speed > 0" class="sf-stat-sub">
              {{ queueInfo.current_speed.toFixed(2) }} MB/s
            </p>
          </div>

          <!-- Chevron right -->
          <svg xmlns="http://www.w3.org/2000/svg" class="sf-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useDownloadStore } from '../stores/useDownloadStore';

defineEmits<{ click: [] }>();

const store = useDownloadStore();
const queueInfo = computed(() => store.queueInfo);

const hasActiveDownloads = computed(() =>
  queueInfo.value.queue.some(item => item.status === 'queued' || item.status === 'downloading')
);

// Poll the queue every 500ms when the toast is visible — mirrors original useEffect interval
let pollInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  store.setupListeners();
  pollInterval = setInterval(() => store.fetchQueue(), 500);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.sf-toast-wrap {
  position: fixed;
  bottom: 1rem;
  left: calc(56px + 1rem);
  z-index: 50;
}

.sf-toast-btn {
  cursor: pointer;
  border-radius: 0.5rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  padding: 0.75rem;
  color: hsl(var(--foreground));
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  transition: background 0.15s;
}

.sf-toast-btn:hover {
  background: hsl(var(--muted));
}

.sf-toast-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sf-icon {
  width: 1rem;
  height: 1rem;
  color: hsl(220 90% 56%);  /* blue-600 */
}

.sf-icon--bounce {
  animation: bounce 1s infinite;
}

.sf-toast-stats {
  display: flex;
  flex-direction: column;
  min-width: 80px;
}

.sf-stat-main {
  font-size: 0.875rem;
  font-weight: 500;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
}

.sf-stat-sub {
  font-size: 0.75rem;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
}

.sf-chevron {
  width: 1rem;
  height: 1rem;
  color: hsl(var(--muted-foreground));
  margin-left: 0.25rem;
}

/* Slide-up transition — mirrors animate-in slide-in-from-bottom-5 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
</style>
