# SpotiFLAC Tauri Parity Checklist

Last updated: 2026-04-18

Source of truth for parity:
- `C:\Proyectos\SpotiFLAC-main\frontend\src\App.tsx`
- `C:\Proyectos\SpotiFLAC-main\frontend\src\hooks\useMetadata.ts`
- `C:\Proyectos\SpotiFLAC-main\frontend\src\components\SearchBar.tsx`
- `C:\Proyectos\SpotiFLAC-main\backend\spotify_metadata.go`
- `C:\Proyectos\SpotiFLAC-main\app.go`

## Phase 1

- [x] Frontend build passes with `npm run build`
- [x] TypeScript config no longer fails on deprecated `baseUrl`
- [x] Core Tauri `invoke` calls that were still reparsing JSON now consume real return types
- [x] FFmpeg install flow reads `{ success, error }` correctly
- [x] `get_current_ip_info` is consumed as an object, not reparsed
- [x] `check_track_availability` is consumed as an object, not reparsed
- [x] Missing shell commands used by sidebar/header are registered in Tauri
- [x] Fetch history payload shape is aligned between Vue and Rust

## Phase 2

- [x] `useMetadata` in Vue now mirrors the original hook more closely
- [x] Main shell recovered album confirmation and VPN failure dialogs
- [x] Main search/fetch page now wires album/artist click handlers closer to the original flow
- [x] `get_spotify_metadata` supports `track`, `album`, `playlist`, and `artist`
- [x] Rust metadata response shape matches original `frontend/src/types/api.ts`
- [ ] Main app shell fully reproduces original page orchestration from `App.tsx`
- [x] Unsaved settings dialog exists and works
- [ ] Search/fetch flow behaves the same as the original shell for every entity type
- [ ] Artist click resolves and opens discography flow with real backend metadata
- [ ] Album, playlist, and artist pages render from real backend payloads

## Phase 3

- [x] Tauri settings defaults now match the original `frontend/src/lib/settings.ts`
- [x] Settings normalization/migration logic matches the original legacy contracts
- [x] Template parsing fallback values match the original settings helper
- [x] App shell now blocks navigation away from Settings when there are unsaved changes
- [x] History page can restore cached fetch payloads back into the main view
- [x] History page opens original URLs through the Tauri shell command instead of raw `window.open`

## Phase 4

- [x] `create_m3u8_file` now matches the original helper more closely
- [x] M3U8 files use sanitized playlist names like the original app
- [x] M3U8 contents prefer relative paths when tracks live under the output folder
- [x] Batch download flow now triggers M3U8 creation when the setting is enabled
- [x] Playlist batch naming respects playlist owner naming preference for auxiliary files

## Structural follow-up

- [x] `spotiflac-core-rs` is moved inside `SpotiFLAC-Tauri`
- [x] No cross-import/runtime dependency remains on the legacy app
- [x] No React/JSX leftovers remain in Vue templates
- [x] `create_m3u8_file` matches original behavior

## Phase 5

- [x] Workspace structure is internally consistent for the Tauri/Vue app
- [x] Duplicate settings state path was removed in favor of a single source of truth
- [x] Legacy React/Wails runtime references are no longer present in the active Tauri frontend
- [x] Structural checklist now reflects the real workspace layout
