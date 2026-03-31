# bkrinth — Claude Instructions

## Project Overview
**bkrinth** is a mod manager for the Modrinth launcher app itself (not Minecraft mods).

It works by patching the Modrinth launcher's bundled frontend files (HTML/JS) before launch — injecting mod scripts into the WebView so they run inside the Modrinth UI. The user opens bkrinth, enables/disables mods, then launches Modrinth from bkrinth for the mods to take effect.

Mods are JS files that can modify Modrinth's UI, hook into its frontend logic, add buttons/panels/themes, etc.

## Rules

- Always keep this `CLAUDE.md` up to date. Update it whenever the project's purpose, stack, structure, or key decisions change, so any future session can resume without losing context.
- Always update `task.md` when actively working — record current task, progress, and what's next.
- Always update `changes.md` after every change — include what changed and why.

## Stack / Tech
- **Electron** — desktop app framework
- **sql.js** — pure WASM SQLite (no native compilation needed), reads/writes Modrinth's `app.db`
- **HTML/CSS/JS** — frontend UI (dark theme, frameless window)
- **electron-builder** — packages to a portable `.exe`

## File Structure
```
src/
  main.js       — Electron main process, IPC handlers, SQLite read/write
  preload.js    — Exposes safe API to renderer via contextBridge
  index.html    — UI shell (titlebar, layout)
  renderer.js   — Profile rendering, edit logic, time formatting
assets/
  icon.ico      — App icon (needed for build)
package.json    — Electron + sql.js deps, electron-builder config
```

## Key Decisions & Notes
- Modrinth launcher is a Tauri 2.x app (Rust backend, Vue 3 frontend in a WebView)
- Mods are injected by patching Modrinth's frontend asset files on disk before launch
- Modrinth must be launched *from bkrinth* for mods to be active
- Mods can only affect the frontend (JS/HTML layer) — not the Rust backend
- Modrinth's SQLite DB is at `%APPDATA%\Roaming\ModrinthApp\app.db` (confirmed on user's machine)
- Playtime fields: `submitted_time_played` and `recent_time_played` (both in seconds) in `profiles` table
- First feature built: **Playtime Editor** — lists all profiles, lets user edit playtime in h/m, saves back to db
- sql.js reads entire db into memory, modifies, writes back — Modrinth must be closed when saving
