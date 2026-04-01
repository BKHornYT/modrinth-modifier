# Modrinth Modifier — Claude Instructions

## Project Overview
**Modrinth Modifier** is a utility/mod manager app for the Modrinth launcher. Currently in **beta**.

Current features:
- **Playtime Editor** — view and edit playtime on all Modrinth profiles via SQLite; per-profile Reset button; thin relative playtime bars; total footer with live updates
- **Launcher Tweaks** — page for modifying real Modrinth launcher settings (playtime hide/restore backed up to modifier_backup.json)

Planned features (sidebar shows "Soon"):
- Mod Manager — inject JS mods into a copy of the Modrinth launcher
- Settings

**Key technical constraint:** Modrinth App is a compiled Tauri binary — web assets are baked into the .exe, no loose CSS/JS files to inject. The only external data we can modify is `app.db` and any config JSON files in `%APPDATA%\Roaming\ModrinthApp\`.

GitHub: https://github.com/BKHornYT/modrinth-modifier
License: GNU AGPL v3 (allows copying from Modrinth's AGPL-licensed launcher UI — modrinth/code)
Current released version: `v1.0.4-beta` (released as stable/latest, file name retains "beta")
In-progress (not yet released): `v1.0.5-beta`

## Rules
- Always keep this `CLAUDE.md` up to date whenever purpose, stack, structure, or key decisions change.
- Always update `task.md` when actively working.
- Always update `changes.md` after every change.
- **Every git push must include a version bump** — increment patch by 1 each time (1.0.1 → 1.0.2 → 1.0.3). Never skip numbers. Update both `package.json` and `scripts/installer.nsi`.
- **Before any UI changes:** copy current `src/` to `backup/vX.X.X/` first. Only publish to GitHub when the new version works.

## UI Design
- Ported directly from Modrinth App (`modrinth/code`, AGPL v3)
- Layout: `app-grid-layout` (64px icon navbar + statusbar + content with `border-top-left-radius: 20px`)
- Design tokens: exact dark mode surface/text/radius/shadow values from `packages/assets/styles/variables.scss`
- Component styles: `.btn`, `.card`, inputs from `packages/assets/styles/classes.scss`

## Stack / Tech
- **Electron 33** — desktop app framework
- **sql.js** — pure WASM SQLite, reads/writes Modrinth's `app.db`
- **HTML/CSS/JS** — frontend (dark theme, frameless, custom titlebar, sidebar nav)
- **@electron/packager** — bundles to `dist/Modrinth Modifier-win32-x64/`
- **NSIS** (`C:\Program Files (x86)\NSIS\`) — produces the Windows installer via `scripts/installer.nsi`

## File Structure
```
src/
  main.js         — Electron main, IPC (profiles, playtime, version, icon path)
  preload.js      — contextBridge API surface
  index.html      — Sidebar layout, titlebar (version badge + BETA badge), page shells
  renderer.js     — Profile list render, edit panel, save/reset logic, nav switching, launcher tweaks toggle
assets/
  icon.png        — App icon (user's recolored Modrinth logo)
  icon.ico        — ICO for packager + NSIS
  icon.svg        — Original Modrinth SVG
backup/
  vX.X.X/        — Snapshot of src/ before changes (manual safety net)
scripts/
  installer.nsi   — NSIS installer script
  make-installer.js — Runs makensis, supports both winget+choco NSIS paths
package.json      — deps + scripts
.github/workflows/release.yml — Auto-build + release on vX.X.X tag push
```

## Build & Release Process
```bash
npm run build      # packages + creates dist/installer/ModrinthModifier-setup.exe
npm start          # dev mode
```

**To release a new version:**
1. Back up `src/` to `backup/vX.X.X/`
2. Make changes, test locally with `npm start`
3. Bump version in `package.json`
4. Tag format: `vX.X.X-beta` for beta, `vX.X.X` for stable
5. `git tag vX.X.X-beta && git push origin vX.X.X-beta`
6. GitHub Actions builds the installer and creates a GitHub Release automatically
7. Tags containing "beta" or "alpha" are auto-marked as pre-release

**Auto-update:** The app checks GitHub's latest release API on startup and shows a download banner if a newer version is available.

## Key Technical Notes
- Modrinth DB: `%APPDATA%\Roaming\ModrinthApp\app.db` — `profiles` table, `submitted_time_played` + `recent_time_played` columns (seconds)
- sql.js reads the whole DB into memory, modifies, writes back — Modrinth must be closed
- After every DB write, `app.db-wal` and `app.db-shm` are deleted — otherwise SQLite replays the WAL on next open and overwrites changes
- Hide/restore playtime backs up original values to `modifier_backup.json` next to `app.db`; presence of this file = hidden state
- Icon is loaded via `file://` IPC call (`get-icon-path`) since `../assets/` doesn't resolve inside asar
- NSIS installer: user-level install (no UAC), installs to `%LOCALAPPDATA%\Modrinth Modifier`, desktop + Start Menu shortcuts, Add/Remove Programs entry
- electron-builder was abandoned — its winCodeSign download fails on Windows without Developer Mode (symlink permission issue)
- GitHub Actions workflow has `permissions: contents: write` — required to create releases
- Beta badge shown in titlebar; version pulled from `package.json` via `app.getVersion()` IPC
