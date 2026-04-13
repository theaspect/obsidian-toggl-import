# Project Research Summary

**Project:** Obsidian Toggl Import Plugin
**Domain:** Obsidian Community Plugin + External REST API Integration (Toggl Track v9)
**Researched:** 2026-04-09
**Confidence:** MEDIUM

## Executive Summary

This project is a focused Obsidian community plugin that fetches time entries from the Toggl Track API v9 and inserts them into the active daily note at the cursor position. The established pattern for this class of plugin is well-documented: TypeScript + esbuild (matching the official `obsidian-sample-plugin` scaffold), Obsidian's `requestUrl` function for all HTTP (not native `fetch`), and the `Plugin`/`PluginSettingTab`/`addCommand` lifecycle APIs. The plugin is intentionally narrow in scope — read-only import, command-triggered, active-file date source — which keeps complexity low and the implementation achievable in a few focused phases.

The recommended approach is to build in strict dependency order: types and scaffold first, then settings data model, then the pure formatting logic (no Obsidian imports), then the Toggl API client, then editor insertion, and finally wire everything together in `main.ts`. This order keeps each module independently testable and avoids the most common failure mode (a fat `main.ts` with untestable business logic). The Toggl API integration uses HTTP Basic Auth with `btoa()` — no OAuth, no external libraries, no bundle weight beyond the `obsidian` package itself.

The dominant risks are all correctness issues invisible in happy-path testing: UTC-to-local timezone handling for date range queries and time display, null-stop running entries crashing the formatter, re-run producing duplicate insertions, and CORS failures if `fetch` is used instead of `requestUrl`. Every one of these must be addressed at the phase where the relevant component is first written — retrofitting is expensive.

---

## Key Findings

### Recommended Stack

Zero runtime dependencies beyond the Obsidian plugin ecosystem. TypeScript 5.x with strict mode, esbuild as the bundler, and Node 18+ as the build runtime are the complete stack. Obsidian's `requestUrl` covers all HTTP needs; `btoa()` covers Basic Auth encoding; native `Date` and `Intl.DateTimeFormat` cover all timezone formatting.

**Adding any HTTP library (axios, node-fetch) or date library (moment, luxon, day.js) is an explicit anti-pattern** — bundle weight with no functional benefit.

| Technology | Version | Role |
|------------|---------|------|
| TypeScript | ~5.3 (strict) | Plugin language |
| obsidian npm package | ~1.5.x | API types and base classes |
| esbuild | ~0.20.x | Bundler — official sample plugin standard |
| Node.js | >=18.x | Build runtime |
| Toggl Track API v9 | — | Basic Auth: `btoa(token + ":api_token")` |

**Verify before coding:** Run `npm show obsidian dist-tags` and `npm show esbuild dist-tags` — version numbers were not verified against the live registry.

### Expected Features

**Table stakes (must have):**
- API token settings field — hard dependency for everything
- "Import Toggl Entries" command palette entry
- Date derived from active note filename (yyyy-mm-dd) — strict regex validation before any API call
- Fetch entries from Toggl API v9 with local-timezone-aware date range
- Insert at cursor position via `editor.replaceRange`
- Markdown table output and plain text delimited output
- Column selection (description, start time, duration, tags, project)
- Configurable delimiter for plain text
- Error/empty state notices for every failure mode (401, no entries, non-date filename, no active file, network error, 429)
- Timezone-aware time display (UTC-to-local conversion)
- Reimport appends not replaces — requires deduplication strategy decided before writing insert logic

**Differentiators (should have):**
- Column ordering (drag/reorder) — most import plugins offer on/off but not reordering
- Format preview in settings
- Human-readable duration formatting (`1h 23m` not raw seconds)

**Anti-features (do not build):**
- Auto-import on note open — creates duplicates and silent background API calls
- Bidirectional sync — fundamentally different product
- Multiple workspace support — defer until demand confirmed
- Per-note format override — one global format in settings

### Architecture Approach

The plugin follows the standard Obsidian thin-plugin delegation pattern. `TogglImportPlugin` in `main.ts` is the lifecycle anchor only (~80 lines), delegating to four specialist modules.

| Component | File | Role |
|-----------|------|------|
| `TogglImportPlugin` | main.ts | Lifecycle entry point; registers command and settings tab; stays thin |
| `TogglApiClient` | toggl-client.ts | All Toggl HTTP via `requestUrl`; timezone-aware date range; running-entry filtering |
| `EntryFormatter` | formatter.ts | Pure function; zero Obsidian imports; `TogglTimeEntry[]` + config → string |
| `NoteEditor` | editor.ts | Date extraction from filename; cursor insertion via `editor.replaceRange` |
| `TogglSettingTab` | settings.ts | Settings UI — API token, format selector, column picker, delimiter |

**Critical API constraint:** Use `requestUrl` from the `obsidian` package for all external HTTP. Native `fetch` fails in Electron's renderer process due to CORS/CSP. This is non-negotiable.

### Critical Pitfalls

| # | Pitfall | Phase to Address |
|---|---------|-----------------|
| 1 | **UTC timezone naive date filtering** — `T00:00:00Z` query misses entries for non-UTC users | Phase: API Client |
| 2 | **Running entry null-stop crash** — Active timers have `stop: null` and `duration < 0` | Phase: API Client |
| 3 | **`fetch` instead of `requestUrl`** — CORS failure in Electron renderer | Phase: Scaffolding |
| 4 | **Duplicate entries on re-run** — Unconditional append inserts entries twice | Phase: Command |
| 5 | **Settings schema migration** — New fields without `Object.assign({}, DEFAULT_SETTINGS, ...)` breaks installs | Phase: Scaffolding |
| 6 | **Manifest version mismatch** — Most common community plugin review rejection | Phase: Release |
| 7 | **API token in synced vault** — Warn users `data.json` is included in Obsidian Sync | Phase: Settings |
| 8 | **429 silent failure** — Rate limit returns non-2xx; must surface as notice | Phase: API Client |
| 9 | **Filename false positives** — Non-date files should show an error, not make API calls | Phase: Command |
| 10 | **Project name resolution cost** — `project_id` in entries requires a second `/me/projects` call | Phase: API Client |

---

## Roadmap Implications

Suggested phases: **6**

### Phase 1 — Project Scaffolding and Types
Compilable plugin skeleton loading in Obsidian, esbuild dev/prod build, `requestUrl` HTTP abstraction, `DEFAULT_SETTINGS` merge pattern, correct `manifest.json` (`isDesktopOnly: true`), and shared type definitions.
**Addresses pitfalls:** 3 (requestUrl), 5 (settings migration), partial 6 (manifest setup)

### Phase 2 — Settings Data Model and UI
Functional settings tab: API token field (with sync-risk warning), format selector (table/text), column picker (ordered array), delimiter field, `loadSettings`/`saveSettings` working.
**Addresses pitfalls:** 5 (DEFAULT_SETTINGS), 7 (token sync warning)

### Phase 3 — Toggl API Client
`fetchTimeEntries(apiToken, localDate)` via `requestUrl` with Basic Auth; local-timezone-aware date range construction; running-entry filtering; project name resolution via secondary call; error handling for 401, 429, network failure.
**Addresses pitfalls:** 1 (UTC timezone), 2 (null-stop), 8 (429), 10 (project names)
**Needs research:** Verify current endpoint paths, `start_date`/`end_date` timezone behavior, and running-entry encoding against live Toggl v9 docs before writing.

### Phase 4 — Entry Formatter
`formatEntries(entries, config)` producing GFM table or delimiter-separated plain text; human-readable duration (`1h 23m`); columns driven by ordered settings array. Zero Obsidian imports — pure function, fast testing surface.
**No pitfalls** — lowest-risk phase by design.

### Phase 5 — Command Implementation and Editor Integration
"Import Toggl Entries" command via `editorCallback`; strict filename validation (regex) as first step; cursor-position insertion; sentinel-block deduplication (idempotent re-run); empty-state and success notices.
**Addresses pitfalls:** 4 (duplicate entries), 9 (filename false positives)

### Phase 6 — Release Packaging
GitHub Actions release workflow attaching `main.js`, `manifest.json`, `styles.css` to tagged releases; `versions.json` maintained; plugin `id` confirmed unique against community registry.
**Addresses pitfalls:** 6 (manifest version mismatch)
**Needs research:** Verify current community plugin submission requirements against `obsidianmd/obsidian-releases` before this phase.

---

## Open Questions

1. **npm version numbers** — Resolve during Phase 1 scaffolding with `npm show <package> dist-tags`
2. **Toggl v9 `start_date`/`end_date` timezone behavior** — Confirm offset ISO 8601 strings accepted before Phase 3
3. **Deduplication strategy** — Sentinel-block (replace on re-run) vs true append-only. Resolve before Phase 5 — these require different implementations
4. **Project name resolution** — Confirm `/me/projects` endpoint and whether caching is needed

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core patterns HIGH; npm version numbers need live verification |
| Features | MEDIUM | Feature set clear; community registry not surveyed directly |
| Architecture | MEDIUM-HIGH | Obsidian Plugin API stable since v1.0; core hooks well-established |
| Pitfalls | HIGH | UTC timezone, null-stop, requestUrl are established community knowledge |

**Overall:** MEDIUM — sufficient to plan and begin implementation.

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
