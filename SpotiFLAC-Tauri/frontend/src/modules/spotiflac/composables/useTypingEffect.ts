import { ref, watch, onUnmounted } from 'vue';

export function useTypingEffect(texts: string[], typingSpeed: number = 50, deletingSpeed: number = 50, pauseDuration: number = 1500) {
    const displayedText = ref('');
    const isDeleting = ref(false);
    const textIndex = ref(0);
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
        const currentText = texts[textIndex.value % texts.length];

        if (isDeleting.value) {
            displayedText.value = displayedText.value.substring(0, displayedText.value.length - 1);
        } else {
            displayedText.value = currentText.substring(0, displayedText.value.length + 1);
        }

        if (!isDeleting.value && displayedText.value === currentText) {
            timer = setTimeout(() => {
                isDeleting.value = true;
                tick();
            }, pauseDuration);
        } else if (isDeleting.value && displayedText.value === '') {
            isDeleting.value = false;
            textIndex.value = (textIndex.value + 1) % texts.length;
            timer = setTimeout(tick, typingSpeed);
        } else {
            timer = setTimeout(tick, isDeleting.value ? deletingSpeed : typingSpeed);
        }
    };

    watch(() => texts, () => {
        clearTimeout(timer);
        displayedText.value = '';
        isDeleting.value = false;
        textIndex.value = 0;
        tick();
    }, { immediate: true, deep: true });

    onUnmounted(() => {
        clearTimeout(timer);
    });

    return displayedText;
}
