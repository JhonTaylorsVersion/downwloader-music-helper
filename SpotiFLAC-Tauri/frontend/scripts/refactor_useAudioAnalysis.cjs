const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/modules/spotiflac/composables/useAudioAnalysis.ts');
let code = fs.readFileSync(targetFile, 'utf8');

// Imports
code = code.replace(/import \{ useState, useCallback, useRef, useEffect, type MutableRefObject \} from "react";/, 'import { ref, watch, onUnmounted, type Ref } from "vue";\nimport { invoke } from "@tauri-apps/api/core";');

// MutableRefObject -> Ref
code = code.replace(/MutableRefObject/g, 'Ref');

// State -> Ref
code = code.replace(/const \[analyzing, setAnalyzing\] = useState\(false\);/, 'const analyzing = ref(false);');
code = code.replace(/const \[analysisProgress, setAnalysisProgress\] = useState<ProgressState>\(DEFAULT_PROGRESS_STATE\);/, 'const analysisProgress = ref<ProgressState>(DEFAULT_PROGRESS_STATE);');
code = code.replace(/const \[result, setResult\] = useState<AnalysisResult \| null>\(\(\) => sessionResult\);/, 'const result = ref<AnalysisResult | null>(sessionResult);');
code = code.replace(/const \[selectedFilePath, setSelectedFilePath\] = useState\(\(\) => sessionSelectedFilePath\);/, 'const selectedFilePath = ref<string>(sessionSelectedFilePath);');
code = code.replace(/const \[error, setError\] = useState<string \| null>\(\(\) => sessionError\);/, 'const error = ref<string | null>(sessionError);');
code = code.replace(/const \[spectrumLoading, setSpectrumLoading\] = useState\(false\);/, 'const spectrumLoading = ref(false);');
code = code.replace(/const \[spectrumProgress, setSpectrumProgress\] = useState<ProgressState>\(DEFAULT_PROGRESS_STATE\);/, 'const spectrumProgress = ref<ProgressState>(DEFAULT_PROGRESS_STATE);');

code = code.replace(/const samplesRef = useRef<Float32Array \| null>\(sessionSamples\);/, 'const samplesRef = ref<Float32Array | null>(sessionSamples);');
code = code.replace(/const currentAnalysisKeyRef = useRef\(sessionCurrentAnalysisKey\);/, 'const currentAnalysisKeyRef = ref(sessionCurrentAnalysisKey);');
code = code.replace(/const analysisTokenRef = useRef<CancelToken \| null>\(null\);/, 'const analysisTokenRef = ref<CancelToken | null>(null);');
code = code.replace(/const spectrumTokenRef = useRef<CancelToken \| null>\(null\);/, 'const spectrumTokenRef = ref<CancelToken | null>(null);');

// UseCallbacks are just normal arrow functions in Vue
code = code.replace(/const setResultWithSession = useCallback\(\(next: AnalysisResult \| null\) => \{/g, 'const setResultWithSession = (next: AnalysisResult | null) => {');
code = code.replace(/const setSelectedFilePathWithSession = useCallback\(\(next: string\) => \{/g, 'const setSelectedFilePathWithSession = (next: string) => {');
code = code.replace(/const setErrorWithSession = useCallback\(\(next: string \| null\) => \{/g, 'const setErrorWithSession = (next: string | null) => {');
code = code.replace(/const setCurrentAnalysisKey = useCallback\(\(analysisKey: string\) => \{/g, 'const setCurrentAnalysisKey = (analysisKey: string) => {');

code = code.replace(/const storeSuccessfulAnalysis = useCallback\((.*?)\) => \{/gi, 'const storeSuccessfulAnalysis = $1 => {');
code = code.replace(/\}, \[setCurrentAnalysisKey, setErrorWithSession, setResultWithSession, setSelectedFilePathWithSession\]\);/g, '};');

code = code.replace(/const analyzeFile = useCallback\(async (.*?)\) => \{/gi, 'const analyzeFile = async $1 => {');
code = code.replace(/\}, \[setCurrentAnalysisKey, setErrorWithSession, setResultWithSession, setSelectedFilePathWithSession, storeSuccessfulAnalysis\]\);/g, '};');

code = code.replace(/const analyzeFilePath = useCallback\(async (.*?)\) => \{/gi, 'const analyzeFilePath = async $1 => {');
code = code.replace(/const loadStoredAnalysis = useCallback\((.*?)\) => \{/gi, 'const loadStoredAnalysis = $1 => {');
code = code.replace(/const clearStoredAnalysis = useCallback\((.*?)\) => \{/gi, 'const clearStoredAnalysis = $1 => {');
code = code.replace(/\}, \[\]\);/g, '};');

code = code.replace(/const cancelAnalysis = useCallback\(\(\) => \{/g, 'const cancelAnalysis = () => {');
code = code.replace(/const reAnalyzeSpectrum = useCallback\(async \((.*?)\) => \{/g, 'const reAnalyzeSpectrum = async ($1) => {');
code = code.replace(/\}, \[result, setResultWithSession\]\);/g, '};');

code = code.replace(/const clearResult = useCallback\(\(\) => \{/g, 'const clearResult = () => {');

// Value replacements
code = code.replace(/setAnalysisProgress\(/g, 'analysisProgress.value = (');
code = code.replace(/setResult\(/g, 'result.value = (');
code = code.replace(/setSelectedFilePath\(/g, 'selectedFilePath.value = (');
code = code.replace(/setError\(/g, 'error.value = (');
code = code.replace(/setSpectrumLoading\(/g, 'spectrumLoading.value = (');
code = code.replace(/setSpectrumProgress\(/g, 'spectrumProgress.value = (');
code = code.replace(/setAnalyzing\(/g, 'analyzing.value = (');

// Wait... setAnalysisProgress((prev) => ...)
code = code.replace(/analysisProgress\.value = \(\(prev\) => prev.percent > 0\s*\?\s*\{([^]*?)\}\s*:\s*DEFAULT_PROGRESS_STATE\)/g, 'analysisProgress.value = analysisProgress.value.percent > 0 ? {$1} : DEFAULT_PROGRESS_STATE');

// .current to .value
code = code.replace(/samplesRef\.current/g, 'samplesRef.value');
code = code.replace(/currentAnalysisKeyRef\.current/g, 'currentAnalysisKeyRef.value');
code = code.replace(/analysisTokenRef\.current/g, 'analysisTokenRef.value');
code = code.replace(/spectrumTokenRef\.current/g, 'spectrumTokenRef.value');
code = code.replace(/tokenRef\.current/g, 'tokenRef.value');

// Wails calls -> invoke for Audio Analysis
// `const readFileAsBase64 = (window as WailsWindow).go?.main?.App?.ReadFileAsBase64;` 
// `await readFileAsBase64(filePath)` -> `await invoke("read_file_as_base64", { path: filePath })`
code = code.replace(/const readFileAsBase64 = \(window as WailsWindow\)\.go\?\.main\?\.App\?\.ReadFileAsBase64;\s*if \(\!readFileAsBase64\) \{\s*throw new Error\("ReadFileAsBase64 backend method is unavailable"\);\s*\}/g, 'const readFileAsBase64 = async (path: string) => await invoke<string>("read_file_as_base64", { path });');

code = code.replace(/const decodeAudioForAnalysis = \(window as WailsWindow\)\.go\?\.main\?\.App\?\.DecodeAudioForAnalysis;\s*if \(\!decodeAudioForAnalysis\) \{\s*throw err;\s*\}/g, 'const decodeAudioForAnalysis = async (path: string) => await invoke<BackendAnalysisDecodeResponse>("decode_audio_for_analysis", { path });');

// useEffect -> onUnmounted
code = code.replace(/useEffect\(\(\) => \{\s*return \(\) => \{\s*cancelToken\(analysisTokenRef\);\s*cancelToken\(spectrumTokenRef\);\s*\};\s*\}, \[\]\);/g, 'onUnmounted(() => {\n        cancelToken(analysisTokenRef);\n        cancelToken(spectrumTokenRef);\n    });');

fs.writeFileSync(targetFile, code, 'utf8');
console.log("Refactored useAudioAnalysis.ts to Vue 3 successfully.");
