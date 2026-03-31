# Modrinth Modifier — Claude Instructions

## Project Overview
**Modrinth Modifier** is a utility app for the Modrinth launcher. Currently it features a playtime editor — lists all Modrinth profiles and lets the user edit playtime values directly in the SQLite database. The longer-term goal is a full mod manager that can inject JS mods into the Modrinth launcher.

GitHub: https://github.com/BKHornYT/modrinth-modifier

## Rules

- Always keep this `CLAUDE.md` up to date. Update it whenever the project's purpose, stack, structure, or key decisions change, so any future session can resume without losing context.
- Always update `task.md` when actively working — record current task, progress, and what's next.
- Always update `changes.md` after every change — include what changed and why.

## Stack / Tech
- **Electron 33** — desktop app framework
- **sql.js** — pure WASM SQLite (no native compilation needed), reads/writes Modrinth's `app.db`
- **HTML/CSS/JS** — frontend UI (dark theme, frameless window, custom titlebar)
- **@electron/packager** — packages app into `dist/Modrinth Modifier-win32-x64/`
- **NSIS** (installed at `C:\Program Files (x86)\NSIS\`) — builds the Windows installer via `scripts/installer.nsi`
- **electron-winstaller** — previously used, replaced by NSIS for proper install wizard

## File Structure
```
src/
  main.js         — Electron main process, IPC handlers, SQLite read/write, version
  preload.js      — Exposes API to renderer via contextBridge
  index.html      — UI shell (titlebar with version badge, layout, styles)
  renderer.js     — Profile rendering, edit logic, time formatting, event delegation
assets/
  icon.png        — App icon (user's recolored Modrinth logo)
  icon.ico        — ICO converted from icon.png (used by packager + NSIS)
  icon.svg        — Original Modrinth SVG
scripts/
  installer.nsi   — NSIS script: install wizard, desktop shortcut, Start Menu, Add/Remove Programs
  make-installer.js — Node script that runs makensis to produce the installer exe
package.json      — deps + build scripts
```

## Build Process
```
npm run build
```
1. `electron-packager` → `dist/Modrinth Modifier-win32-x64/`
2. `makensis scripts/installer.nsi` → `dist/installer/ModrinthModifier-setup.exe`

To run in dev: `npm start`

## Key Decisions & Notes
- App name: **Modrinth Modifier** (was "bkrinth" during planning)
- Modrinth's SQLite DB is at `%APPDATA%\Roaming\ModrinthApp\app.db` (confirmed on user's machine)
- Playtime fields: `submitted_time_played` and `recent_time_played` (both in seconds) in `profiles` table
- sql.js reads entire db into memory, modifies, writes back — Modrinth must be closed when saving
- Installer uses NSIS (not electron-builder) — electron-builder failed due to Windows symlink permissions blocking winCodeSign extraction
- Installer runs as user-level (no UAC), installs to `%LOCALAPPDATA%\Modrinth Modifier`
- Version shown in titlebar, pulled from `package.json` via `app.getVersion()` IPC
- Modrinth launcher is Tauri 2.x (Rust + Vue 3 WebView) — future mod injection plan is to copy launcher to a temp location and patch frontend assets there, then launch the copy
