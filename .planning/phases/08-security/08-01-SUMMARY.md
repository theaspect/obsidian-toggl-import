---
phase: 08-security
plan: 01
subsystem: auth
tags: [localStorage, obsidian-api, api-token, security, SEC-02]

# Dependency graph
requires: []
provides:
  - "TogglImportPlugin.getApiToken() method (async, reads from app.loadLocalStorage)"
  - "API token stored in device-local localStorage, not data.json"
  - "loadSettings() strips legacy apiToken from data.json on load"
  - "settings.ts token field reads/writes localStorage directly"
  - "manifest.json minAppVersion bumped to 1.8.7"
affects:
  - "08-02 (test connection button — reads token via getApiToken())"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Token read via plugin.getApiToken() async method — all callsites use this indirection"
    - "loadSettings() sanitizes legacy data on load then persists cleaned object (RESEARCH.md Pitfall 5 pattern)"
    - "localStorage key 'toggl-api-token' is the canonical token store"

key-files:
  created:
    - tests/main.test.ts
  modified:
    - src/main.ts
    - src/api.ts
    - src/settings.ts
    - manifest.json
    - tests/api.test.ts
    - tests/command.test.ts

key-decisions:
  - "Use app.loadLocalStorage/saveLocalStorage (Obsidian 1.8.7+) — device-local, not synced"
  - "getApiToken() kept async even though localStorage is sync — future-proof per D-08"
  - "No migration of existing token into localStorage — D-09 explicitly rejects migration"
  - "loadSettings() sanitizes legacy apiToken and calls saveSettings() to persist cleaned form"
  - "minAppVersion bumped to 1.8.7 to reflect localStorage API requirement"

patterns-established:
  - "Token access pattern: always via await plugin.getApiToken(), never direct settings property"
  - "localStorage key naming: 'toggl-api-token' (plugin-id-prefixed)"

requirements-completed:
  - SEC-02

# Metrics
duration: 15min
completed: 2026-04-15
---

# Phase 08 Plan 01: Security — API Token localStorage Migration Summary

**API token migrated from plaintext data.json (Obsidian Sync) to device-local localStorage via app.loadLocalStorage/saveLocalStorage, with legacy field sanitization on load**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-15T02:04:00Z
- **Completed:** 2026-04-15T02:19:30Z
- **Tasks:** 2
- **Files modified:** 6 source files + 1 new test file

## Accomplishments
- Removed `apiToken` from `TogglImportSettings` interface and `DEFAULT_SETTINGS` — token no longer travels in Obsidian Sync via data.json
- Added `async getApiToken()` on `TogglImportPlugin` reading from `app.loadLocalStorage('toggl-api-token')`
- Updated all call sites: `fetchTimeEntries` in api.ts, empty-token guard in editorCallback, settings tab token field
- `loadSettings()` now strips any legacy `apiToken` key from loaded data.json and persists the sanitized form
- Bumped `manifest.json` `minAppVersion` to `"1.8.7"` for localStorage API
- Created `tests/main.test.ts` with 4 new tests covering `getApiToken()` and `loadSettings()` sanitization
- All 53 tests pass (49 original + 4 new)

## Task Commits

1. **Task 1: Refactor src/main.ts, src/api.ts, src/settings.ts, manifest.json** — `746bff0` (feat)
2. **Task 2: Update test mocks, add tests/main.test.ts** — `ce54feb` (test)

## Files Created/Modified
- `src/main.ts` — Removed apiToken from interface/defaults; added getApiToken(); updated empty-token guard; updated loadSettings() to sanitize legacy token
- `src/api.ts` — fetchTimeEntries reads token via `await plugin.getApiToken()` instead of `plugin.settings.apiToken`
- `src/settings.ts` — Token field reads from `loadLocalStorage('toggl-api-token')`, writes via `saveLocalStorage('toggl-api-token', value)`; description updated to "Stored locally on this device — not synced to Obsidian Sync."
- `manifest.json` — `minAppVersion` bumped from `"1.0.0"` to `"1.8.7"`
- `tests/api.test.ts` — `createMockPlugin` uses `getApiToken` stub instead of `settings.apiToken`
- `tests/command.test.ts` — Plugin mock adds `loadLocalStorage`/`saveLocalStorage`; helper uses `getApiToken` stub; empty-token guard test uses `getApiToken` stub
- `tests/main.test.ts` — NEW: 4 tests for `getApiToken()` (returns stored token, returns '' on null) and `loadSettings()` (strips legacy apiToken, preserves other fields)

## Decisions Made
- Used `app.loadLocalStorage` / `app.saveLocalStorage` (on `App`, not `Plugin`) — Obsidian 1.8.7+ requirement
- `getApiToken()` is `async` even though `loadLocalStorage` is synchronous — future-proof per D-08
- No migration of old token from data.json into localStorage — D-09 explicitly rejects migration to avoid surface expansion
- Settings tab `onChange` is non-async (no `saveSettings()` call) — localStorage writes are synchronous

## Deviations from Plan

None — plan executed exactly as written. All RESEARCH.md pitfalls successfully avoided.

## Issues Encountered

None — build and tests passed on first attempt.

## Known Stubs

None — localStorage integration is fully wired. Settings tab reads from and writes to localStorage directly.

## Threat Flags

None — all T-08-01 through T-08-03 mitigations implemented as planned.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 (SEC-01 "Test connection" button) can now read the API token via `plugin.getApiToken()` — the foundation is complete
- All existing tests green; new tests cover the security-critical paths
- `manifest.json` minAppVersion is 1.8.7, which may limit installs on older Obsidian — this is intentional and required

---
*Phase: 08-security*
*Completed: 2026-04-15*
