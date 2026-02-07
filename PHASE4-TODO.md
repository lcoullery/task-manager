# Phase 4: Production Hardening

## Pure Electron (electron/ files only)

- [x] **Window state persistence** - Save/restore window size and position between sessions (store in `app.getPath('userData')`)
- [x] **Application menu** - Add File, Edit, View, Help menus
- [x] **Single instance lock** - Prevent multiple app instances from launching simultaneously

## Crosses into server/web side

- [x] **Data directory management** - Pass `DATA_DIR` env variable from Electron to server so data is stored in `%APPDATA%/task-manager/` instead of inside the install folder. Prevents data loss on uninstall.
- [x] **Update notifications** - Detect `window.electronAPI` in frontend and disable web-based manual updates (Electron uses its own updater)
