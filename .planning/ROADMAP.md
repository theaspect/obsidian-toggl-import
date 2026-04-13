# Roadmap: Obsidian Toggl Import Plugin

## Overview

Six phases build the plugin in strict dependency order: scaffolding establishes the compilable skeleton and build tooling; settings delivers the configuration UI; the API client handles authenticated Toggl fetching with correct timezone handling; the formatter produces pure output strings; the command wires all modules together into a working end-to-end flow; and release packaging publishes the plugin via GitHub Actions. Each phase is independently verifiable before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Scaffolding** - Compilable plugin skeleton with build tooling and manifest
- [ ] **Phase 2: Settings** - Settings UI with API token, format, columns, and delimiter fields
- [ ] **Phase 3: API Client** - Toggl API fetching with timezone-aware date ranges and running-entry filtering
- [ ] **Phase 4: Formatter** - Pure entry formatting to Markdown table and plain text
- [ ] **Phase 5: Command** - Import command wiring all modules together with full error handling
- [ ] **Phase 6: Release** - GitHub Actions release workflow publishing plugin assets

## Phase Details

### Phase 1: Scaffolding
**Goal**: A compilable Obsidian plugin skeleton loads in Obsidian with correct build tooling, manifest, and shared type definitions in place
**Depends on**: Nothing (first phase)
**Requirements**: REL-01, REL-02
**Success Criteria** (what must be TRUE):
  1. Running `npm run build` produces `main.js` without errors
  2. Obsidian loads the plugin from the vault's `.obsidian/plugins/` directory without errors
  3. `manifest.json` contains a unique plugin id, valid `minAppVersion`, and `isDesktopOnly: true`
  4. `requestUrl` is used as the HTTP abstraction (no native fetch calls exist in the codebase)
  5. `DEFAULT_SETTINGS` merge pattern is in place so new settings fields never break existing installs
**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md — Build tooling, plugin skeleton, and compilation verification

### Phase 2: Settings
**Goal**: Users can configure all plugin options — API token, output format, columns, and delimiter — and those settings persist across Obsidian restarts
**Depends on**: Phase 1
**Requirements**: SET-01, SET-02, SET-03, SET-04, SET-05
**Success Criteria** (what must be TRUE):
  1. User can enter and save a Toggl API token in plugin settings
  2. Settings displays a visible warning that the API token is stored in `data.json` and included in Obsidian Sync
  3. User can switch between Markdown table and plain text output formats
  4. User can enable or disable any combination of columns: description, start time, duration, tags, project
  5. User can set a custom delimiter for plain text format (default is pipe `|`)
**Plans:** 1 plan
**UI hint**: yes

Plans:
- [ ] 02-01-PLAN.md — Settings tab UI with token, format, delimiter, and column toggles

### Phase 3: API Client
**Goal**: The plugin can fetch correctly scoped time entries from Toggl for a given local date, filter out running entries, and resolve project names
**Depends on**: Phase 2
**Requirements**: CMD-04, CMD-08, FMT-04
**Success Criteria** (what must be TRUE):
  1. `fetchTimeEntries` returns completed entries for the correct local calendar date (UTC boundaries translated correctly)
  2. Running entries (active timers with `duration < 0` or `stop: null`) are silently excluded from returned entries
  3. Each entry's start time is available in the user's local timezone
  4. 401, 429, and network failure responses return structured errors rather than crashing
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Test infrastructure (vitest) and failing unit tests for API client
- [x] 03-02-PLAN.md — Toggl API client implementation (src/api.ts + workspaceId setting)

### Phase 4: Formatter
**Goal**: The formatter produces correct Markdown table and plain text output from time entries using the configured columns and delimiter
**Depends on**: Phase 3
**Requirements**: FMT-01, FMT-02, FMT-03, FMT-05
**Success Criteria** (what must be TRUE):
  1. Markdown table output renders as a valid GFM table with the configured columns as headers
  2. Plain text output renders one entry per line with columns joined by the configured delimiter
  3. Duration values display as human-readable format (e.g. `1h 23m`) rather than raw seconds
  4. Entries with multiple tags render the tags column as a comma-separated list
**Plans**: TBD

### Phase 5: Command
**Goal**: The "Import Toggl Entries" command is available in the command palette and inserts correctly formatted entries at the cursor, handling all error and edge cases
**Depends on**: Phase 4
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-05, CMD-06, CMD-07, REIMP-01
**Success Criteria** (what must be TRUE):
  1. "Import Toggl Entries" appears in the Obsidian command palette and can be run
  2. Running the command on a `yyyy-mm-dd` named note inserts formatted entries at the cursor position
  3. Running the command on a note with a non-date filename shows an error notice and makes no API call
  4. API failures (invalid token, network error, rate limit) show a descriptive error notice
  5. Running the command when no entries exist for that date shows an informative notice
  6. Running the command a second time on the same note appends new entries rather than replacing existing content
**Plans**: TBD

### Phase 6: Release
**Goal**: The plugin can be published to GitHub as a tagged release with all required assets attached, ready for community plugin submission
**Depends on**: Phase 5
**Requirements**: REL-03
**Success Criteria** (what must be TRUE):
  1. Pushing a git tag triggers the GitHub Actions workflow automatically
  2. The release includes `main.js`, `manifest.json`, and `styles.css` as downloadable assets
  3. `versions.json` is maintained and consistent with `manifest.json`
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffolding | 0/1 | Planning complete | - |
| 2. Settings | 0/1 | Planning complete | - |
| 3. API Client | 0/2 | Planning complete | - |
| 4. Formatter | 0/? | Not started | - |
| 5. Command | 0/? | Not started | - |
| 6. Release | 0/? | Not started | - |
