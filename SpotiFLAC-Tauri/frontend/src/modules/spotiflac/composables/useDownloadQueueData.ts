import { computed } from "vue";
import { useDownloadStore } from "../stores/useDownloadStore";

export function useDownloadQueueData() {
    const store = useDownloadStore();

    const queueInfo = computed(() => {
        let queued_count = 0;
        let completed_count = 0;
        let failed_count = 0;
        let skipped_count = 0;
        let total_downloaded = 0;
        let current_speed = 0;

        for (const item of store.queue) {
            if (item.status === 'Queued') queued_count++;
            if (item.status === 'Completed') completed_count++;
            if (item.status === 'Failed') failed_count++;
            if (item.status === 'Skipped') skipped_count++;
            if (item.status === 'Downloading') {
                current_speed += item.speed_mbps || 0;
            }
            total_downloaded += item.progress_mb || 0;
        }

        return {
            is_downloading: store.queue.some(i => i.status === 'Downloading'),
            queue: store.queue,
            current_speed,
            total_downloaded,
            session_start_time: 0,
            queued_count,
            completed_count,
            failed_count,
            skipped_count,
        };
    });

    return queueInfo;
}
