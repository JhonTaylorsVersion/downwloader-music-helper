import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { toastWithSound as toast } from '../utils/toast-with-sound';

export function useHistory() {
    const fetchHistory = ref<any[]>([]);

    const loadHistory = async () => {
        try {
            const history = await invoke<any[]>('get_fetch_history');
            fetchHistory.value = history;
        } catch (err) {
            console.error("Failed to load fetch history:", err);
        }
    };

    const deleteFetchHistoryItem = async (id: string) => {
        try {
            await invoke('delete_fetch_history_item', { id });
            fetchHistory.value = fetchHistory.value.filter(item => item.id !== id);
            toast.success("History item removed");
        } catch (err) {
            toast.error("Failed to delete item");
        }
    };

    onMounted(loadHistory);

    return {
        fetchHistory,
        loadHistory,
        deleteFetchHistoryItem
    };
}
