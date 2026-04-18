<template>
  <!-- Mirrors DownloadQueue.tsx 1:1 -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="sf-dialog-overlay" @click.self="$emit('close')">
        <div class="sf-dialog" role="dialog" aria-modal="true">

          <!-- Header -->
          <div class="sf-dialog-header">
            <div class="sf-header-row">
              <!-- Title — click resets entire queue (mirrors original onClick={handleReset}) -->
              <h2 class="sf-title" @click="handleReset" title="Click to reset queue">Download Queue</h2>
              <div class="sf-header-actions">
                <button
                  v-if="queueInfo.completed_count > 0 || queueInfo.failed_count > 0 || queueInfo.skipped_count > 0"
                  class="sf-btn-ghost"
                  @click="handleClearHistory"
                >
                  <!-- Trash icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Clear History
                </button>
                <button
                  v-if="queueInfo.failed_count > 0"
                  class="sf-btn-ghost"
                  @click="handleExportFailed"
                >
                  <!-- FileDown icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
                    <polyline points="9 15 12 18 15 15"/>
                  </svg>
                  Export Failures
                </button>
                <button class="sf-btn-icon" @click="$emit('close')">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Status filter chips — clicking toggles filter, mirrors original -->
            <div class="sf-filter-row">
              <div
                class="sf-filter-chip"
                :class="{ 'sf-filter-chip--active': filterStatus === 'queued' }"
                @click="toggleFilter('queued')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span class="text-muted">Queued:</span>
                <span class="font-semibold">{{ queueInfo.queued_count }}</span>
              </div>

              <div
                class="sf-filter-chip"
                :class="{ 'sf-filter-chip--completed': filterStatus === 'completed' }"
                @click="toggleFilter('completed')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span class="text-muted">Completed:</span>
                <span class="font-semibold">{{ queueInfo.completed_count }}</span>
              </div>

              <div
                class="sf-filter-chip"
                :class="{ 'sf-filter-chip--skipped': filterStatus === 'skipped' }"
                @click="toggleFilter('skipped')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <polyline points="9 15 12 18 15 15"/><line x1="12" y1="12" x2="12" y2="18"/>
                </svg>
                <span class="text-muted">Skipped:</span>
                <span class="font-semibold">{{ queueInfo.skipped_count }}</span>
              </div>

              <div
                class="sf-filter-chip"
                :class="{ 'sf-filter-chip--failed': filterStatus === 'failed' }"
                @click="toggleFilter('failed')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span class="text-muted">Failed:</span>
                <span class="font-semibold">{{ queueInfo.failed_count }}</span>
              </div>
            </div>

            <!-- Stats bar -->
            <div class="sf-stats-row">
              <div class="sf-stat">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                  <line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>
                </svg>
                <span class="text-muted">Downloaded:</span>
                <span class="sf-mono">{{ queueInfo.total_downloaded > 0 ? `${queueInfo.total_downloaded.toFixed(2)} MB` : '0.00 MB' }}</span>
              </div>
              <div class="sf-stat">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span class="text-muted">Speed:</span>
                <span class="sf-mono">{{ queueInfo.current_speed > 0 && queueInfo.is_downloading ? `${queueInfo.current_speed.toFixed(2)} MB/s` : '—' }}</span>
              </div>
              <div class="sf-stat">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span class="text-muted">Duration:</span>
                <span class="sf-mono">{{ queueInfo.session_start_time > 0 ? formatDuration(queueInfo.session_start_time) : '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Queue list -->
          <div class="sf-dialog-body custom-scrollbar">
            <div class="sf-queue-list">
              <!-- Empty state -->
              <div v-if="queueInfo.queue.length === 0" class="sf-empty">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <p>No downloads in queue</p>
              </div>

              <!-- Filtered empty state -->
              <div v-else-if="filteredQueue.length === 0" class="sf-empty">
                <p>No downloads with status "{{ filterStatus }}"</p>
                <button class="sf-btn-link" @click="filterStatus = 'all'">Clear filter</button>
              </div>

              <!-- Queue items -->
              <div
                v-else
                v-for="item in filteredQueue"
                :key="item.id"
                class="sf-queue-item"
              >
                <div class="sf-item-icon">
                  <!-- downloading -->
                  <svg v-if="item.status === 'downloading'" class="icon-blue icon-bounce" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <!-- completed -->
                  <svg v-else-if="item.status === 'completed'" class="icon-green" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <!-- failed -->
                  <svg v-else-if="item.status === 'failed'" class="icon-red" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <!-- skipped -->
                  <svg v-else-if="item.status === 'skipped'" class="icon-yellow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/><line x1="12" y1="12" x2="12" y2="18"/>
                  </svg>
                  <!-- queued -->
                  <svg v-else class="icon-muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>

                <div class="sf-item-body">
                  <div class="sf-item-top">
                    <div class="sf-item-names">
                      <p class="sf-track-name">{{ item.track_name }}</p>
                      <p class="sf-artist-name">
                        {{ item.artist_name }}
                        <span v-if="item.album_name"> • {{ item.album_name }}</span>
                      </p>
                    </div>
                    <span class="sf-badge" :class="`sf-badge--${item.status}`">{{ item.status }}</span>
                  </div>

                  <!-- Downloading sub-line -->
                  <div v-if="item.status === 'downloading'" class="sf-item-meta sf-mono">
                    <span>{{ item.progress > 0 ? `${item.progress.toFixed(2)} MB` : queueInfo.is_downloading && queueInfo.current_speed > 0 ? 'Downloading...' : 'Starting...' }}</span>
                    <span>{{ item.speed > 0 ? `${item.speed.toFixed(2)} MB/s` : queueInfo.current_speed > 0 ? `${queueInfo.current_speed.toFixed(2)} MB/s` : '—' }}</span>
                  </div>

                  <!-- Completed sub-line -->
                  <div v-if="item.status === 'completed'" class="sf-item-meta sf-mono">
                    <span>{{ item.progress.toFixed(2) }} MB</span>
                  </div>

                  <!-- Skipped sub-line -->
                  <div v-if="item.status === 'skipped'" class="sf-item-meta">
                    File already exists
                  </div>

                  <!-- Error message -->
                  <div v-if="item.status === 'failed' && item.error_message" class="sf-error-msg">
                    {{ item.error_message }}
                  </div>

                  <!-- File path for completed/skipped -->
                  <div v-if="(item.status === 'completed' || item.status === 'skipped') && item.file_path" class="sf-file-path sf-mono">
                    {{ item.file_path }}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useDownloadStore } from '../stores/useDownloadStore';
import { toastWithSound as toast } from '../utils/toast-with-sound';

const props = defineProps<{ isOpen: boolean }>();
defineEmits<{ close: [] }>();

const store = useDownloadStore();
const queueInfo = computed(() => store.queueInfo);
const filterStatus = ref<string>('all');

const toggleFilter = (status: string) => {
  filterStatus.value = filterStatus.value === status ? 'all' : status;
};

const filteredQueue = computed(() => {
  if (filterStatus.value === 'all') return queueInfo.value.queue;
  return queueInfo.value.queue.filter(item => item.status === filterStatus.value);
});

const formatDuration = (startTimestamp: number): string => {
  if (startTimestamp === 0) return '—';
  const now = Math.floor(Date.now() / 1000);
  const secs = now - startTimestamp;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const handleClearHistory = async () => {
  try {
    await store.clearCompletedDownloads();
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
};

const handleReset = async () => {
  try {
    await store.clearAllDownloads();
    toast.success('Download queue reset');
  } catch (e) {
    console.error('Failed to reset queue:', e);
  }
};

const handleExportFailed = async () => {
  try {
    const message = await store.exportFailedDownloads();
    if (message.startsWith('Successfully')) {
      toast.success(message);
    } else if (message !== 'Export cancelled') {
      toast.info(message);
    }
  } catch (e) {
    toast.error(`Failed to export: ${e}`);
  }
};

// Poll 500ms when dialog is open — mirrors original useEffect with setInterval
let pollInterval: ReturnType<typeof setInterval> | null = null;

watch(() => props.isOpen, (open) => {
  if (open) {
    store.fetchQueue();
    pollInterval = setInterval(() => store.fetchQueue(), 500);
  } else {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }
}, { immediate: true });

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
/* Overlay */
.sf-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: hsl(0 0% 0% / 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dialog container */
.sf-dialog {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  max-width: 1200px;
  width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.sf-dialog-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
}
.sf-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.sf-title {
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s;
}
.sf-title:hover { color: hsl(var(--primary)); }

.sf-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.sf-btn-ghost {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: hsl(var(--foreground));
  cursor: pointer;
  transition: background 0.15s;
}
.sf-btn-ghost:hover { background: hsl(var(--muted)); }
.sf-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: hsl(var(--foreground));
  transition: background 0.15s;
}
.sf-btn-icon:hover { background: hsl(var(--muted)); }

/* Filter chips */
.sf-filter-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
}
.sf-filter-chip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  user-select: none;
  border-radius: 6px;
  padding: 2px 4px;
  transition: all 0.15s;
}
.sf-filter-chip:hover { opacity: 0.8; }
.sf-filter-chip--active { background: hsl(var(--muted)); padding: 2px 8px; box-shadow: 0 0 0 1px hsl(var(--border)); }
.sf-filter-chip--completed { background: hsl(142 76% 36% / 0.1); padding: 2px 8px; box-shadow: 0 0 0 1px hsl(142 76% 36% / 0.2); }
.sf-filter-chip--skipped { background: hsl(48 96% 53% / 0.1); padding: 2px 8px; box-shadow: 0 0 0 1px hsl(48 96% 53% / 0.2); }
.sf-filter-chip--failed { background: hsl(0 72% 51% / 0.1); padding: 2px 8px; box-shadow: 0 0 0 1px hsl(0 72% 51% / 0.2); }

/* Stats bar */
.sf-stats-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
  border-top: 1px solid hsl(var(--border));
}
.sf-stat {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

/* Body */
.sf-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}
.sf-queue-list { display: flex; flex-direction: column; gap: 0.5rem; }

/* Empty state */
.sf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  color: hsl(var(--muted-foreground));
  gap: 0.75rem;
}
.sf-btn-link { background: none; border: none; color: hsl(var(--primary)); cursor: pointer; font-size: 0.875rem; }

/* Queue item */
.sf-queue-item {
  display: flex;
  gap: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 0.75rem;
  transition: background 0.15s;
}
.sf-queue-item:hover { background: hsl(var(--muted) / 0.3); }

.sf-item-icon { margin-top: 2px; }
.sf-item-icon svg { width: 1rem; height: 1rem; }

.sf-item-body { flex: 1; min-width: 0; }
.sf-item-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
.sf-item-names { flex: 1; min-width: 0; }
.sf-track-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sf-artist-name { font-size: 0.875rem; color: hsl(var(--muted-foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Badges */
.sf-badge {
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 9999px;
  border: 1px solid hsl(var(--border));
  white-space: nowrap;
}
.sf-badge--downloading { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: transparent; }
.sf-badge--completed { border-color: hsl(var(--border)); }
.sf-badge--failed { background: hsl(0 72% 51% / 0.15); color: hsl(0 72% 51%); border-color: hsl(0 72% 51% / 0.3); }
.sf-badge--skipped { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); }
.sf-badge--queued { border-color: hsl(var(--border)); }

/* Sub-lines */
.sf-item-meta {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}
.sf-error-msg {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: hsl(0 72% 51%);
  background: hsl(0 72% 51% / 0.08);
  border-radius: 4px;
  padding: 2px 6px;
}
.sf-file-path {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Icons */
.icon-blue   { color: hsl(220 90% 56%); }
.icon-green  { color: hsl(142 76% 36%); }
.icon-red    { color: hsl(0 72% 51%); }
.icon-yellow { color: hsl(48 96% 53%); }
.icon-muted  { color: hsl(var(--muted-foreground)); }
.icon-bounce { animation: bounce 1s infinite; }

/* Helpers */
.text-muted   { color: hsl(var(--muted-foreground)); }
.text-green   { color: hsl(142 76% 36%); }
.text-yellow  { color: hsl(48 96% 53%); }
.text-red     { color: hsl(0 72% 51%); }
.font-semibold { font-weight: 600; }
.sf-mono { font-family: monospace; font-variant-numeric: tabular-nums; }

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 3px; }

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
</style>
