# Obsidian Toggl Import Plugin

## What This Is

An Obsidian plugin that imports Toggl Track time entries into daily notes with a single command. The active note's filename (yyyy-mm-dd) determines the date, entries are fetched from Toggl's API, and the formatted output is inserted at the cursor. Format is fully configurable — markdown table or delimited plain text, both with the same selectable columns.

Shipped v1.0 MVP (2026-04-13): all core features working end-to-end with 49 passing tests and UAT approval.

## Core Value

One command pulls the day's Toggl entries into your daily note, formatted exactly how you want them — no manual copying.

## Requirements

### Validated

- ✓ Plugin settings include a Toggl API token field for authentication — v1.0 (SET-01, masked input with plaintext storage warning)
- ✓ Plugin settings include format selection: table or plain text — v1.0 (SET-03)
- ✓ Plugin settings include column selection: description, start time, duration, tags, project — v1.0 (SET-04)
- ✓ Plugin settings include a delimiter field for plain text format — v1.0 (SET-05, conditional on plain text selection)
- ✓ Command "Import Toggl Entries" reads the active note's filename as a yyyy-mm-dd date — v1.0 (CMD-01, CMD-02)
- ✓ Command fetches time entries for that date from Toggl API using the default workspace — v1.0 (CMD-04, workspace ID auto-populated from /me)
- ✓ Entries are inserted at the cursor position in the active note — v1.0 (CMD-07)
- ✓ Running the command again appends new entries rather than replacing existing ones — v1.0 (REIMP-01)
- ✓ Table format renders as a Markdown table with the configured columns — v1.0 (FMT-01, GFM-compatible)
- ✓ Plain text format renders each entry as one line, columns joined by the configured delimiter — v1.0 (FMT-02)
- ✓ Plugin builds to a single `main.js` via esbuild — v1.0 (REL-01)
- ✓ `manifest.json` correctly structured with unique plugin id, `minAppVersion`, `isDesktopOnly: true` — v1.0 (REL-02)
- ✓ GitHub Actions workflow publishes release assets on git tag — v1.0 (REL-03)

### Active

(None — all v1 requirements shipped. New requirements defined when next milestone begins.)

### Out of Scope

| Feature | Reason |
|---------|--------|
| Date picker | Active note filename is the date source |
| Auto-import on note open | Creates duplicates; silent background API calls |
| Workspace selection | Use default workspace; single-user scope |
| Per-note format override | Global setting only |
| Mobile support | Electron-specific; `isDesktopOnly: true` from day one |
| Bidirectional sync | Fundamentally different product |
| Column reordering (drag-and-drop) | v2 scope (COL-01) |
| Project color, end time columns | v2 scope (COL-02, COL-03) |

## Context

- Shipped v1.0 MVP: 1,036 TypeScript LOC, 78 files, 49 tests passing, UAT approved
- Tech stack: TypeScript + Obsidian Plugin API, esbuild bundler, vitest test runner
- Toggl API v9, Basic Auth with API token, `requestUrl` (Obsidian's HTTP abstraction)
- Running entries (active timers) are silently filtered — not inserted into notes
- GitHub Actions release workflow: push a semver tag (no `v` prefix per Obsidian registry requirement) → assets attached automatically
- Plugin not yet submitted to Obsidian community plugin registry

## Constraints

- **Tech Stack**: TypeScript + Obsidian Plugin API — standard for all Obsidian plugins
- **Auth**: Toggl API token via HTTP Basic Auth — no OAuth required
- **Scope**: Single workspace (default), no multi-user support
- **Compatibility**: Must work on Obsidian desktop (Windows, Mac, Linux); mobile is out of scope

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Filename drives the date | No extra prompt needed; aligns with daily note conventions | ✓ Good — clean UX, no modal needed |
| Insert at cursor, not append | User controls placement; works with any note structure | ✓ Good — validated in UAT |
| Reimport appends rather than replaces | Prevents accidental data loss if run twice | ✓ Good — tested and approved |
| API token only (no OAuth) | Toggl API supports token auth natively; simpler than OAuth flow | ✓ Good — straightforward implementation |
| `requestUrl` over native fetch | Obsidian's abstraction handles CORS and mobile quirks | ✓ Good — correct Obsidian idiom |
| Bare semver tags (no `v` prefix) | Obsidian community validator requires tag == manifest.json version exactly | ✓ Good — confirmed requirement |
| `keyof TogglImportSettings['columns']` type annotation | Avoids TS2683/TS7053 errors in array initializer context | ✓ Good — clean fix |
| Key-based guard in version-bump.mjs | Ensures patch bumps with unchanged minAppVersion still get recorded in versions.json | ✓ Good — prevents silent omissions |
| vitest over Jest | Modern ESM-native test runner, no CJS transform config needed | ✓ Good — smooth TDD workflow |
| TDD RED→GREEN pattern for API client and command | Locks behavioral contract before implementation | ✓ Good — caught integration issues early |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after v1.0 MVP milestone*
