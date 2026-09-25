# Dailies Tracker

[![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-7C3AED.svg)](https://obsidian.md/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933.svg)](https://nodejs.org/)
[![GitHub](https://img.shields.io/badge/GitHub-MrBrims%2Fdailies--tracker-181717.svg)](https://github.com/MrBrims/dailies-tracker)
[![Version](https://img.shields.io/badge/Version-1.0.5-green.svg)](#changelog)

Obsidian plugin that keeps a weekly checkbox table in sync with a plain daily task list: edits to the source list update table rows (without touching existing checkmarks), completed weeks are archived on startup, and table cells are clickable in Live Preview. Build output is copied straight into the vault plugin folder via Make.

**Repository:** [github.com/MrBrims/dailies-tracker](https://github.com/MrBrims/dailies-tracker) · **Author:** [Egor Alexseev](https://github.com/MrBrims)

## Requirements

- [Obsidian](https://obsidian.md/) 1.0+
- Node.js (LTS)
- Make (Git Bash on Windows)

## Get the project from Git

Clone the repository:

```bash
git clone https://github.com/MrBrims/dailies-tracker.git
cd dailies-tracker
```

Build artifacts (`main.js`, `main.js.map`) are gitignored — run `make build` after clone.

Before the first build, set your Obsidian vault path in [`scripts/vault-config.mjs`](scripts/vault-config.mjs) or pass `VAULT_ROOT` when running Make (see [Vault deploy path](#vault-deploy-path)). Default plugin file paths are set in [`scripts/paths-config.mjs`](scripts/paths-config.mjs) (see [Plugin paths](#plugin-paths)).

To update an existing checkout:

```bash
git pull
make build
```

`git pull` does not rebuild the plugin. After pulling TypeScript or build config changes, run `make build` and reload plugins in Obsidian.

## Quick start

After [cloning](#get-the-project-from-git) and configuring your vault path:

```bash
make install   # npm install
make build     # production build and copy to vault
```

Enable **Dailies Tracker** in Obsidian: Settings → Community plugins.

On first load the plugin creates the table file and archive folder if they are missing. Edit the source list; the table syncs automatically when the source file is saved.

## Vault deploy path

Production build copies `main.js`, `manifest.json`, and `styles.css` to:

```text
$(VAULT_ROOT)/.obsidian/plugins/dailies-tracker/
```

Default vault root is set in [`scripts/vault-config.mjs`](scripts/vault-config.mjs):

```text
C:/Users/Egor/Documents/Заметки
```

Override for a single build:

```bash
VAULT_ROOT=/path/to/vault make build
```

After changing TypeScript sources, run `make build` and reload plugins in Obsidian (or use `make dev` during development).

## Plugin paths

Default vault-relative paths for the source list, weekly table, and archive folder are set in [`scripts/paths-config.mjs`](scripts/paths-config.mjs):

| Variable | Default |
| --- | --- |
| `SOURCE_PATH` | `Задачи и заметки/Дейлики и задачи/Дейлики.md` |
| `TABLE_PATH` | `Задачи и заметки/Дейлики и задачи/Таблица дейликов.md` |
| `ARCHIVE_FOLDER` | `Задачи и заметки/Дейлики и задачи/Архив дейликов` |

Values are injected into the plugin bundle at build time via esbuild `define`. Override for a single build:

```bash
SOURCE_PATH="Tasks/Dailies.md" TABLE_PATH="Tasks/Table.md" ARCHIVE_FOLDER="Tasks/Archive" make build
```

Build-time defaults apply on first install (empty `data.json`), as fallbacks when a settings field is cleared, and as placeholders in the settings tab. Saved Obsidian settings always take precedence over build defaults.

## How it works

| File | Role |
| --- | --- |
| Source list | Plain `- item` lines — source of truth; plugin reads on modify |
| Weekly table | Markdown table with Mon–Sun columns and `[ ]` / `[x]` cells |
| Archive | Snapshot of the previous week saved as `YYYY-Www.md` |

**Sync:** when the source file changes, new rows are added and removed rows are dropped; checkmarks on surviving rows are preserved.

**Rotate:** on vault open, if the ISO week changed since the last rotation, the current table is archived and a fresh empty week table is written.

**Checkboxes:** a Live Preview post-processor renders table cells as HTML checkboxes; clicks write back to the file.

**Table view:** the configured table file always opens in Obsidian Reading view (from the command palette, file explorer, or links). When you open another note in the same tab, the editor mode you had before the table is restored; source list and archive notes are unaffected.

## Plugin settings

Configure in Obsidian: Settings → Dailies Tracker. Paths can be changed at any time without rebuilding.

| Setting | Build default |
| --- | --- |
| Source file | See [Plugin paths](#plugin-paths) |
| Table file | See [Plugin paths](#plugin-paths) |
| Archive folder | See [Plugin paths](#plugin-paths) |

## Command palette

| Command | Action |
| --- | --- |
| Dailies: Sync from source | Force sync table from source list |
| Dailies: Rotate week now | Archive current week and reset table |
| Dailies: Open table | Open the weekly table note in Reading view |

## Commands

```bash
make help              # list targets
make install           # npm install
make build             # production build and copy to vault
make dev               # watch mode for development
make deploy            # alias for make build
make clean             # remove main.js and main.js.map
make reinstall         # clean, install, build
make test              # run parser/sync/rotate logic tests
```

## Stack

- TypeScript, esbuild
- Obsidian Plugin API
- Make + Node scripts for vault deploy

## Project Structure

```text
dailies-tracker/
├── src/
│   ├── main.ts              # plugin entry, events, commands
│   ├── settings.ts          # settings tab; defaults from build-time define
│   ├── build-defaults.d.ts  # ambient types for esbuild-injected defaults
│   ├── parser.ts            # parse/serialize list and table
│   ├── sync.ts              # sync table from source
│   ├── rotate.ts            # weekly archive and reset
│   ├── week.ts              # ISO week helpers
│   ├── writer.ts            # debounced vault writes, loop guard
│   ├── toggle.ts            # checkbox toggle in table file
│   ├── table-checkbox.ts    # Live Preview checkbox post-processor
│   └── table-view.ts        # Reading view for table file only
├── scripts/
│   ├── vault-config.mjs     # default VAULT_ROOT
│   ├── paths-config.mjs     # default SOURCE_PATH, TABLE_PATH, ARCHIVE_FOLDER
│   ├── copy-to-vault.mjs    # deploy build artifacts to vault
│   └── test-logic.mjs       # parser/sync/rotate tests
├── esbuild.config.mjs       # bundle config
├── Makefile                 # build and deploy targets
├── manifest.json
├── package.json
└── README.md
```

Build artifacts (`main.js`, `main.js.map`) and the installed plugin copy under `.obsidian/plugins/dailies-tracker/` in the vault live outside this tree.

## Changelog

### 1.0.5

- **FIX**: Restore the previous editor mode on a tab after leaving the weekly table (Reading view no longer sticks to the next file in the same tab)

### 1.0.4

- **NEW**: Weekly table file (`tablePath`) always opens in Reading view; other vault notes keep their usual editor mode

### 1.0.3

- **NEW**: Sync plugin version from README Changelog to `manifest.json` on `make build`
- **TECHNICAL**: Sync `package.json` version and README Version badge during build via `scripts/sync-version.mjs`

### 1.0.2

- **FIX**: Remove deprecated `baseUrl` and update `moduleResolution` to `bundler` for TypeScript 6 compatibility
- **NEW**: Build-time plugin path defaults via `scripts/paths-config.mjs` and Make/env overrides (`SOURCE_PATH`, `TABLE_PATH`, `ARCHIVE_FOLDER`)

### 1.0.1

- **NEW**: Clickable checkboxes in the weekly table via Live Preview post-processor (`src/table-checkbox.ts`, `src/toggle.ts`)

### 1.0.0

- **NEW**: Sync daily task list into a weekly checkbox table on source file modify
- **NEW**: Automatic weekly archive and table reset on vault open when ISO week changes
- **NEW**: Settings tab for source, table, and archive paths
- **NEW**: Command palette actions — sync, rotate, open table
- **NEW**: Make-based build pipeline with vault deploy via `scripts/copy-to-vault.mjs`
- **NEW**: Logic tests in `scripts/test-logic.mjs`
