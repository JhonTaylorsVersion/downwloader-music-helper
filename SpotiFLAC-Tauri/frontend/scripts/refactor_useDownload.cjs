const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/modules/spotiflac/composables/useDownload.ts');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Imports
code = code.replace(/import \{ useState, useRef \} from "react";/, 'import { ref } from "vue";\nimport { invoke } from "@tauri-apps/api/core";\nimport { useSettingsStore } from "../stores/useSettingsStore";');

// 2. Remove Wails commands
code = code.replace(/const CheckFilesExistence = .*?;\n/g, '');
code = code.replace(/const SkipDownloadItem = .*?;\n/g, '');
code = code.replace(/const CreateM3U8File = .*?;\n/g, '');
code = code.replace(/const GetTrackISRC = .*?;\n/g, '');

// 3. getSettings() -> useSettingsStore().settings
code = code.replace(/getSettings\(\)/g, 'useSettingsStore().settings');

// 4. useState hooks -> ref
code = code.replace(/const \[downloadProgress, setDownloadProgress\] = useState<number>\(0\);/, 'const downloadProgress = ref<number>(0);');
code = code.replace(/const \[isDownloading, setIsDownloading\] = useState\(false\);/, 'const isDownloading = ref(false);');
code = code.replace(/const \[downloadingTrack, setDownloadingTrack\] = useState<string \| null>\(null\);/, 'const downloadingTrack = ref<string | null>(null);');
code = code.replace(/const \[bulkDownloadType, setBulkDownloadType\] = useState<"all" \| "selected" \| null>\(null\);/, 'const bulkDownloadType = ref<"all" | "selected" | null>(null);');
code = code.replace(/const \[downloadedTracks, setDownloadedTracks\] = useState<Set<string>>\(new Set\(\)\);/, 'const downloadedTracks = ref<Set<string>>(new Set());');
code = code.replace(/const \[failedTracks, setFailedTracks\] = useState<Set<string>>\(new Set\(\)\);/, 'const failedTracks = ref<Set<string>>(new Set());');
code = code.replace(/const \[skippedTracks, setSkippedTracks\] = useState<Set<string>>\(new Set\(\)\);/, 'const skippedTracks = ref<Set<string>>(new Set());');
code = code.replace(/const \[currentDownloadInfo, setCurrentDownloadInfo\] = useState<\{[^{}]+\} \| null>\(null\);/, 'const currentDownloadInfo = ref<{ name: string; artists: string; } | null>(null);');

// 5. useRef -> ref
code = code.replace(/const shouldStopDownloadRef = useRef\(false\);/, 'const shouldStopDownloadRef = ref(false);');

// 6. Fix Set functions
code = code.replace(/setDownloadProgress\((.*?)\)/g, 'downloadProgress.value = $1');
code = code.replace(/setIsDownloading\((.*?)\)/g, 'isDownloading.value = $1');
code = code.replace(/setDownloadingTrack\((.*?)\)/g, 'downloadingTrack.value = $1');
code = code.replace(/setBulkDownloadType\((.*?)\)/g, 'bulkDownloadType.value = $1');
code = code.replace(/setCurrentDownloadInfo\((.*?)\)/g, 'currentDownloadInfo.value = $1');

code = code.replace(/setDownloadedTracks\(\(prev\) => new Set\(prev\)\.add\((.*?)\)\)/g, 'downloadedTracks.value.add($1); downloadedTracks.value = new Set(downloadedTracks.value)');
code = code.replace(/setFailedTracks\(\(prev\) => new Set\(prev\)\.add\((.*?)\)\)/g, 'failedTracks.value.add($1); failedTracks.value = new Set(failedTracks.value)');
code = code.replace(/setSkippedTracks\(\(prev\) => new Set\(prev\)\.add\((.*?)\)\)/g, 'skippedTracks.value.add($1); skippedTracks.value = new Set(skippedTracks.value)');
code = code.replace(/setDownloadedTracks\(new Set\(\)\)/g, 'downloadedTracks.value = new Set()');
code = code.replace(/setFailedTracks\(new Set\(\)\)/g, 'failedTracks.value = new Set()');
code = code.replace(/setSkippedTracks\(new Set\(\)\)/g, 'skippedTracks.value = new Set()');
code = code.replace(/setFailedTracks\(\(prev\) => {\s*const newSet = new Set\(prev\);\s*newSet\.delete\((.*?)\);\s*return newSet;\s*}\)/g, 'failedTracks.value.delete($1); failedTracks.value = new Set(failedTracks.value)');

// 7. shouldStopDownloadRef.current -> shouldStopDownloadRef.value
code = code.replace(/shouldStopDownloadRef\.current/g, 'shouldStopDownloadRef.value');

// 8. Invoke translations
code = code.replace(/await CheckFilesExistence\(outputDir, settings\.downloadPath, (.*?)\)/g, 'await invoke("check_files_existence", { outputDir, rootDir: settings.downloadPath, tracks: $1 })');
code = code.replace(/await GetTrackISRC\((.*?)\)/g, 'await invoke("get_track_isrc", { spotifyId: $1 })');
code = code.replace(/SkipDownloadItem\((.*?),\s*(.*?)\)/g, 'invoke("skip_download_item", { itemId: $1, filePath: $2 })');

// GetStreamingURLs Fix
code = code.replace(/const \{ GetStreamingURLs \} = await import\("\.\.\/\.\.\/wailsjs\/go\/main\/App"\);\s*const urlsJson = await GetStreamingURLs\((.*?),\s*(.*?)\)/g, 'const urlsJson = await invoke("get_streaming_urls", { spotifyId: $1, region: $2 }) as string');

// AddToDownloadQueue Fix
code = code.replace(/const \{ AddToDownloadQueue \} = await import\("\.\.\/\.\.\/wailsjs\/go\/main\/App"\);\s*/g, '');
code = code.replace(/await AddToDownloadQueue\((.*?),\s*(.*?),\s*(.*?),\s*(.*?)\)/g, 'await invoke("add_to_download_queue", { id: $1, trackName: $2, artistName: $3, albumName: $4 }) as string');

// MarkDownloadItemFailed Fix
code = code.replace(/const \{ MarkDownloadItemFailed \} = await import\("\.\.\/\.\.\/wailsjs\/go\/main\/App"\);\s*/g, '');
code = code.replace(/await MarkDownloadItemFailed\((.*?),\s*(.*?)\)/g, 'await invoke("mark_download_item_failed", { itemId: $1, error: $2 })');

// CreateM3U8File Fix
code = code.replace(/await CreateM3U8File\((.*?),\s*(.*?),\s*(.*?)\)/g, 'await invoke("create_m3u8_file", { playlistName: $1, outputDir: $2, filePaths: $3 })');


fs.writeFileSync(targetFile, code, 'utf8');
console.log("Refactored useDownload.ts to Vue 3 successfully.");
