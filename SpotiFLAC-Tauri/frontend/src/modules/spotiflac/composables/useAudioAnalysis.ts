import { ref, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import type { AnalysisResult } from "../types/api";
import { logger } from "../utils/logger";
import { toastWithSound as toast } from "../utils/toast-with-sound";
import {
    analyzeAudioArrayBuffer,
    analyzeAudioFile,
    analyzeDecodedSamples,
    analyzeSpectrumFromSamples,
    parseAudioMetadataFromInput,
    pcm16MonoArrayBufferToFloat32Samples,
    type AnalysisProgress,
    type FrontendAnalysisPayload,
    type ParsedAudioMetadata,
} from "../utils/flac-analysis";
import { loadAudioAnalysisPreferences } from "../utils/audio-analysis-preferences";

type WindowFunction = "hann" | "hamming" | "blackman" | "rectangular";

function toWindowFunction(value: string): WindowFunction {
    switch (value) {
        case "hamming":
        case "blackman":
        case "rectangular":
            return value;
        case "hann":
        default:
            return "hann";
    }
}

function fileNameFromPath(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
}

function nextUiTick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

async function base64ToArrayBuffer(base64: string, shouldCancel?: () => boolean): Promise<ArrayBuffer> {
    const clean = base64.includes(",") ? base64.split(",")[1] : base64;
    const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
    const outputLength = Math.floor((clean.length * 3) / 4) - padding;
    const bytes = new Uint8Array(outputLength);
    const chunkSize = 4 * 16384;
    let writeOffset = 0;
    for (let offset = 0; offset < clean.length; offset += chunkSize) {
        if (shouldCancel?.()) {
            throw new Error("Analysis cancelled");
        }
        const chunk = clean.slice(offset, Math.min(clean.length, offset + chunkSize));
        const binary = atob(chunk);
        for (let i = 0; i < binary.length; i++) {
            bytes[writeOffset++] = binary.charCodeAt(i);
        }
        if ((offset / chunkSize) % 4 === 0) {
            await nextUiTick();
        }
    }
    return bytes.buffer;
}

// Module-level session state (mirrors original React module-level vars)
let sessionResult: AnalysisResult | null = null;
let sessionSelectedFilePath = "";
let sessionError: string | null = null;
let sessionSamples: Float32Array | null = null;
let sessionCurrentAnalysisKey = "";
const sessionSamplesByKey = new Map<string, Float32Array>();

interface ProgressState {
    percent: number;
    message: string;
}

const DEFAULT_PROGRESS_STATE: ProgressState = {
    percent: 0,
    message: "Preparing analysis...",
};

interface CancelToken {
    cancelled: boolean;
}

export interface AnalyzeExecutionOptions {
    analysisKey?: string;
    displayPath?: string;
    suppressToast?: boolean;
}

export interface AnalyzeExecutionOutcome {
    result: AnalysisResult | null;
    error: string | null;
    cancelled: boolean;
}

interface BackendAnalysisDecodeResponse {
    pcm_base64: string;
    sample_rate: number;
    channels: number;
    bits_per_sample: number;
    duration: number;
    bitrate_kbps?: number;
    bit_depth?: string;
}

function cancelTokenFn(tokenRef: { value: CancelToken | null }): void {
    if (tokenRef.value) {
        tokenRef.value.cancelled = true;
        tokenRef.value = null;
    }
}

function createToken(tokenRef: { value: CancelToken | null }): CancelToken {
    cancelTokenFn(tokenRef);
    const token: CancelToken = { cancelled: false };
    tokenRef.value = token;
    return token;
}

function isCancelledError(error: unknown): boolean {
    return error instanceof Error && error.message === "Analysis cancelled";
}

function toProgressState(progress: AnalysisProgress): ProgressState {
    return {
        percent: Math.round(Math.max(0, Math.min(100, progress.percent))),
        message: progress.message,
    };
}

function isDecodeFailure(error: unknown): boolean {
    return error instanceof Error && /decode/i.test(error.message);
}

function mergeBackendDecodedMetadata(parsed: ParsedAudioMetadata, decoded: BackendAnalysisDecodeResponse): ParsedAudioMetadata {
    const sampleRate = decoded.sample_rate > 0 ? decoded.sample_rate : parsed.sampleRate;
    const bitsPerSample = decoded.bits_per_sample > 0 ? decoded.bits_per_sample : parsed.bitsPerSample;
    const duration = decoded.duration > 0 ? decoded.duration : parsed.duration;
    return {
        ...parsed,
        sampleRate,
        channels: decoded.channels > 0 ? decoded.channels : parsed.channels,
        bitsPerSample,
        totalSamples: duration > 0 && sampleRate > 0 ? Math.floor(duration * sampleRate) : parsed.totalSamples,
        duration,
        bitrateKbps: decoded.bitrate_kbps ?? parsed.bitrateKbps,
    };
}

export function useAudioAnalysis() {
    const analyzing = ref(false);
    const analysisProgress = ref<ProgressState>(DEFAULT_PROGRESS_STATE);
    const result = ref<AnalysisResult | null>(sessionResult);
    const selectedFilePath = ref<string>(sessionSelectedFilePath);
    const error = ref<string | null>(sessionError);
    const spectrumLoading = ref(false);
    const spectrumProgress = ref<ProgressState>(DEFAULT_PROGRESS_STATE);

    const samplesRef = ref<Float32Array | null>(sessionSamples);
    const currentAnalysisKeyRef = ref(sessionCurrentAnalysisKey);
    const analysisTokenRef = ref<CancelToken | null>(null);
    const spectrumTokenRef = ref<CancelToken | null>(null);

    onUnmounted(() => {
        cancelTokenFn(analysisTokenRef);
        cancelTokenFn(spectrumTokenRef);
    });

    const setResultWithSession = (next: AnalysisResult | null) => {
        sessionResult = next;
        result.value = next;
    };

    const setSelectedFilePathWithSession = (next: string) => {
        sessionSelectedFilePath = next;
        selectedFilePath.value = next;
    };

    const setErrorWithSession = (next: string | null) => {
        sessionError = next;
        error.value = next;
    };

    const setCurrentAnalysisKey = (analysisKey: string) => {
        currentAnalysisKeyRef.value = analysisKey;
        sessionCurrentAnalysisKey = analysisKey;
    };

    const storeSuccessfulAnalysis = (analysisKey: string, displayPath: string, payload: FrontendAnalysisPayload) => {
        sessionSamplesByKey.set(analysisKey, payload.samples);
        samplesRef.value = payload.samples;
        sessionSamples = payload.samples;
        setCurrentAnalysisKey(analysisKey);
        setResultWithSession(payload.result);
        setSelectedFilePathWithSession(displayPath);
        setErrorWithSession(null);
    };

    const analyzeFile = async (file: File, options?: AnalyzeExecutionOptions): Promise<AnalyzeExecutionOutcome> => {
        if (!file) {
            const errorMessage = "No file provided";
            setErrorWithSession(errorMessage);
            return { result: null, error: errorMessage, cancelled: false };
        }
        const token = createToken(analysisTokenRef);
        const analysisKey = options?.analysisKey || file.name;
        const displayPath = options?.displayPath || file.name;
        cancelTokenFn(spectrumTokenRef);
        analyzing.value = true;
        analysisProgress.value = { percent: 1, message: "Preparing file..." };
        setErrorWithSession(null);
        setResultWithSession(null);
        setSelectedFilePathWithSession(displayPath);
        setCurrentAnalysisKey(analysisKey);
        try {
            logger.info(`Analyzing audio file (frontend): ${displayPath}`);
            const start = Date.now();
            const prefs = loadAudioAnalysisPreferences();
            const payload = await analyzeAudioFile(file, {
                fftSize: prefs.fftSize,
                windowFunction: prefs.windowFunction,
            }, (progress) => {
                if (token.cancelled) return;
                analysisProgress.value = toProgressState(progress);
            }, () => token.cancelled);
            if (token.cancelled) return { result: null, error: null, cancelled: true };
            storeSuccessfulAnalysis(analysisKey, displayPath, payload);
            const elapsed = ((Date.now() - start) / 1000).toFixed(2);
            logger.success(`Audio analysis completed in ${elapsed}s`);
            return { result: payload.result, error: null, cancelled: false };
        } catch (err) {
            if (isCancelledError(err)) return { result: null, error: null, cancelled: true };
            const errorMessage = err instanceof Error ? err.message : "Failed to analyze audio file";
            logger.error(`Analysis error: ${errorMessage}`);
            setErrorWithSession(errorMessage);
            analysisProgress.value = { percent: 0, message: "Analysis failed" };
            if (!options?.suppressToast) {
                toast.error("Audio Analysis Failed", { description: errorMessage });
            }
            return { result: null, error: errorMessage, cancelled: false };
        } finally {
            if (analysisTokenRef.value === token) {
                analysisTokenRef.value = null;
                analyzing.value = false;
            }
        }
    };

    const analyzeFilePath = async (filePath: string, options?: AnalyzeExecutionOptions): Promise<AnalyzeExecutionOutcome> => {
        if (!filePath) {
            const errorMessage = "No file path provided";
            setErrorWithSession(errorMessage);
            return { result: null, error: errorMessage, cancelled: false };
        }
        const token = createToken(analysisTokenRef);
        const analysisKey = options?.analysisKey || filePath;
        const displayPath = options?.displayPath || filePath;
        cancelTokenFn(spectrumTokenRef);
        analyzing.value = true;
        analysisProgress.value = { percent: 1, message: "Reading file from disk..." };
        setErrorWithSession(null);
        setResultWithSession(null);
        setSelectedFilePathWithSession(displayPath);
        setCurrentAnalysisKey(analysisKey);
        try {
            logger.info(`Analyzing audio file (frontend from path): ${filePath}`);
            const start = Date.now();
            const prefs = loadAudioAnalysisPreferences();
            const readFileAsBase64 = async (path: string) => await invoke<string>("read_file_as_base64", { path });
            let base64Data = await readFileAsBase64(filePath);
            if (token.cancelled) return { result: null, error: null, cancelled: true };
            analysisProgress.value = { percent: 10, message: "File loaded" };
            const arrayBuffer = await base64ToArrayBuffer(base64Data, () => token.cancelled);
            base64Data = "";
            if (token.cancelled) return { result: null, error: null, cancelled: true };
            analysisProgress.value = { percent: 15, message: "Preparing audio buffer..." };
            const fileName = fileNameFromPath(filePath);
            const input = { fileName, fileSize: arrayBuffer.byteLength, arrayBuffer };
            const analysisParams = {
                fftSize: prefs.fftSize,
                windowFunction: prefs.windowFunction,
            } as const;
            const updateProgress = (progress: AnalysisProgress) => {
                if (token.cancelled) return;
                const mappedPercent = 10 + (progress.percent * 0.9);
                analysisProgress.value = {
                    percent: Math.round(Math.max(0, Math.min(100, mappedPercent))),
                    message: progress.message,
                };
            };
            let payload: FrontendAnalysisPayload;
            try {
                payload = await analyzeAudioArrayBuffer(input, analysisParams, updateProgress, () => token.cancelled);
            } catch (err) {
                if (!isDecodeFailure(err)) throw err;
                const decodeAudioForAnalysis = async (path: string) =>
                    await invoke<BackendAnalysisDecodeResponse>("decode_audio_for_analysis", { path });
                logger.warning(`Browser decoder failed for ${fileName}; trying FFmpeg fallback`);
                analysisProgress.value = { percent: 18, message: "Browser decoder failed, trying FFmpeg fallback..." };
                const decoded = await decodeAudioForAnalysis(filePath);
                if (token.cancelled) return { result: null, error: null, cancelled: true };
                analysisProgress.value = { percent: 24, message: "Decoding audio with FFmpeg..." };
                const pcmBase64 = decoded.pcm_base64 || "";
                if (!pcmBase64) throw new Error("FFmpeg analysis decode returned no PCM data");
                const pcmBuffer = await base64ToArrayBuffer(pcmBase64, () => token.cancelled);
                if (token.cancelled) return { result: null, error: null, cancelled: true };
                const parsedMetadata = parseAudioMetadataFromInput(input);
                const mergedMetadata = mergeBackendDecodedMetadata(parsedMetadata, decoded);
                const samples = pcm16MonoArrayBufferToFloat32Samples(pcmBuffer);
                payload = await analyzeDecodedSamples(input, mergedMetadata, samples, analysisParams, updateProgress, () => token.cancelled, mergedMetadata.duration);
            }
            if (token.cancelled) return { result: null, error: null, cancelled: true };
            storeSuccessfulAnalysis(analysisKey, displayPath, payload);
            const elapsed = ((Date.now() - start) / 1000).toFixed(2);
            logger.success(`Audio analysis completed in ${elapsed}s`);
            return { result: payload.result, error: null, cancelled: false };
        } catch (err) {
            if (isCancelledError(err)) return { result: null, error: null, cancelled: true };
            const errorMessage = err instanceof Error ? err.message : "Failed to analyze audio file";
            logger.error(`Analysis error: ${errorMessage}`);
            setErrorWithSession(errorMessage);
            analysisProgress.value = { percent: 0, message: "Analysis failed" };
            if (!options?.suppressToast) {
                toast.error("Audio Analysis Failed", { description: errorMessage });
            }
            return { result: null, error: errorMessage, cancelled: false };
        } finally {
            if (analysisTokenRef.value === token) {
                analysisTokenRef.value = null;
                analyzing.value = false;
            }
        }
    };

    const loadStoredAnalysis = (analysisKey: string, nextResult: AnalysisResult, displayPath: string) => {
        setCurrentAnalysisKey(analysisKey);
        samplesRef.value = sessionSamplesByKey.get(analysisKey) ?? null;
        sessionSamples = samplesRef.value;
        setResultWithSession(nextResult);
        setSelectedFilePathWithSession(displayPath);
        setErrorWithSession(null);
    };

    const clearStoredAnalysis = (analysisKey?: string) => {
        if (analysisKey) {
            sessionSamplesByKey.delete(analysisKey);
            if (currentAnalysisKeyRef.value === analysisKey) {
                currentAnalysisKeyRef.value = "";
                sessionCurrentAnalysisKey = "";
                samplesRef.value = null;
                sessionSamples = null;
            }
            return;
        }
        sessionSamplesByKey.clear();
        currentAnalysisKeyRef.value = "";
        sessionCurrentAnalysisKey = "";
        samplesRef.value = null;
        sessionSamples = null;
    };

    const cancelAnalysis = () => {
        cancelTokenFn(analysisTokenRef);
        analyzing.value = false;
        analysisProgress.value = analysisProgress.value.percent > 0
            ? { percent: analysisProgress.value.percent, message: "Analysis stopped" }
            : DEFAULT_PROGRESS_STATE;
    };

    const reAnalyzeSpectrum = async (fftSize: number, windowFunction: string) => {
        if (!result.value || !samplesRef.value) return null;
        const token = createToken(spectrumTokenRef);
        spectrumLoading.value = true;
        spectrumProgress.value = { percent: 0, message: "Preparing FFT..." };
        try {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            const spectrum = await analyzeSpectrumFromSamples(samplesRef.value, result.value.sample_rate, {
                fftSize,
                windowFunction: toWindowFunction(windowFunction),
            }, (progress) => {
                if (token.cancelled) return;
                spectrumProgress.value = toProgressState(progress);
            }, () => token.cancelled);
            if (token.cancelled) return null;
            const nextResult = { ...result.value, spectrum };
            setResultWithSession(nextResult);
            return nextResult;
        } catch (err) {
            if (isCancelledError(err)) return null;
            const errorMessage = err instanceof Error ? err.message : "Failed to re-analyze spectrum";
            logger.error(`Spectrum re-analysis error: ${errorMessage}`);
            spectrumProgress.value = { percent: 0, message: "Spectrum analysis failed" };
            toast.error("Spectrum Analysis Failed", { description: errorMessage });
            return null;
        } finally {
            if (spectrumTokenRef.value === token) {
                spectrumTokenRef.value = null;
                spectrumLoading.value = false;
            }
        }
    };

    const clearResult = () => {
        cancelTokenFn(analysisTokenRef);
        cancelTokenFn(spectrumTokenRef);
        analyzing.value = false;
        setResultWithSession(null);
        setErrorWithSession(null);
        setSelectedFilePathWithSession("");
        spectrumLoading.value = false;
        analysisProgress.value = DEFAULT_PROGRESS_STATE;
        spectrumProgress.value = DEFAULT_PROGRESS_STATE;
        currentAnalysisKeyRef.value = "";
        sessionCurrentAnalysisKey = "";
        samplesRef.value = null;
        sessionSamples = null;
    };

    return {
        analyzing,
        analysisProgress,
        result,
        error,
        selectedFilePath,
        spectrumLoading,
        spectrumProgress,
        analyzeFile,
        analyzeFilePath,
        cancelAnalysis,
        loadStoredAnalysis,
        clearStoredAnalysis,
        reAnalyzeSpectrum,
        clearResult,
    };
}
