---
phase: 08-security
plan: 02
subsystem: auth
tags: [obsidian-api, test-connection, settings-ui, notice, SEC-01]

# Dependency graph
requires:
  - phase: 08-01
    provides: "API token in localStorage via app.loadLocalStorage('toggl-api-token')"
provides:
  - "Test connection button in settings tab calling togglGet against GET /me"
  - "togglGet and BASE exported from api.ts for use by settings.ts"
  - "5 unit tests covering SEC-01 success, failure, and in-flight disable paths"
affects:
  - "08-verify (full SEC-01/SEC-02 verification)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ButtonComponent.setDisabled(true) before first await to prevent re-entrancy (Pitfall 4)"
    - "Hoisted-mock pattern in vitest — vi.hoisted captures button onClick for async testing"
    - "FakeSetting.addButton interception captures handler for direct invocation in tests"

key-files:
  created:
    - tests/settings.test.ts
  modified:
    - src/api.ts
    - src/settings.ts

key-decisions:
  - "Export togglGet and BASE from api.ts without changing implementation — only visibility"
  - "Read token via this.plugin.app.loadLocalStorage directly (not via getApiToken()) — simpler, sync, no extra hop"
  - "Notice error text comes directly from err.message when err instanceof Error, falls back to generic string"

patterns-established:
  - "Test connection button pattern: disable → try (await) → Notice success/error → finally re-enable"
  - "Settings test pattern: hoisted fakeButton captures onClick ref, tests invoke it directly after tab.display()"

requirements-completed:
  - SEC-01

# Metrics
duration: 10min
completed: 2026-04-15
---

# Phase 08 Plan 02: Security — Test Connection Button Summary

**SEC-01 Test connection button added to settings tab: calls togglGet(/me), shows Connected as [fullname] or error Notice, disables during in-flight request; 5 unit tests verify all paths**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-15T02:22:00Z
- **Completed:** 2026-04-15T02:32:00Z
- **Tasks:** 2
- **Files modified:** 2 source files + 1 new test file

## Accomplishments
- Exported `togglGet` and `BASE` from `src/api.ts` (were module-private)
- Added Notice + ButtonComponent imports to `settings.ts`; imported `togglGet`, `BASE` from `./api`
- Inserted "Test connection" Setting row between API token field and Output format in `settings.ts`
- Button handler: disables before await, calls `togglGet<{ fullname }>(/me, token)`, shows `Connected as [fullname]` on success or error message on failure, re-enables in finally
- Created `tests/settings.test.ts` with 5 tests covering all SEC-01 paths
- Full suite: 58 tests passing (53 baseline from Plan 01 + 5 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Export togglGet+BASE and add Test connection button** — `46fc801` (feat)
2. **Task 2: Add tests/settings.test.ts for SEC-01** — `5f20795` (test)

## Files Created/Modified
- `src/api.ts` — Added `export` keyword to `BASE` const and `togglGet` function
- `src/settings.ts` — Added Notice, ButtonComponent imports; added togglGet, BASE imports from ./api; inserted Test connection Setting row after API token field
- `tests/settings.test.ts` — NEW: 5 unit tests (success, 401 failure, disable-success cycle, disable-failure cycle, non-Error fallback)

## Decisions Made
- Used `this.plugin.app.loadLocalStorage('toggl-api-token')` directly in onClick rather than routing through `getApiToken()` — both are acceptable per plan (D-02), direct read is simpler and avoids async indirection in the button handler setup
- Error fallback message is `'Toggl API error: unknown error'` for non-Error rejections — keeps the Toggl prefix consistent with all other error messages

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — build and tests passed on first attempt.

## Known Stubs

None — the Test connection button is fully wired: reads from localStorage, calls togglGet, surfaces a real Notice.

## Threat Flags

None — T-08-09 mitigation confirmed: `onClick` handler only re-emits `err.message` from `togglGet`; the token is never included in error text. T-08-11 mitigation confirmed: `setDisabled(true)` fires before `await` (enforced by Test 3).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- SEC-01 (Test connection button) and SEC-02 (localStorage migration from Plan 01) are both complete
- Phase 08 is ready for `/gsd-verify-work 8`
- All 58 tests green; build clean with zero TypeScript errors

---
*Phase: 08-security*
*Completed: 2026-04-15*
