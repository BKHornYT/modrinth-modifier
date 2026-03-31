# Modrinth Modifier

A utility app for the [Modrinth](https://modrinth.com) launcher.

## Features

- **Playtime Editor** — View and edit playtime across all your Modrinth profiles
- More coming soon

## Download

Head to [Releases](https://github.com/BKHornYT/modrinth-modifier/releases) and download the latest `ModrinthModifier-setup.exe`.

Run the installer — it'll set up the app, add a desktop shortcut, and register it in Add/Remove Programs.

## Requirements

- Windows 10 or later
- [Modrinth App](https://modrinth.com/app) installed

## Building from Source

```bash
npm install
npm run build
```

Requires [NSIS](https://nsis.sourceforge.io/) installed at the default path (`C:\Program Files (x86)\NSIS\`).

Output: `dist/installer/ModrinthModifier-setup.exe`

## Development

```bash
npm start
```

## Roadmap

- [ ] Mod loader — inject JS mods into the Modrinth launcher at runtime
- [ ] Mod manager UI — enable/disable/install mods
- [ ] Theme support
- [ ] More profile utilities
