---
phase: 03-api-client
plan: 02
subsystem: api
tags: [toggl, requestUrl, vitest, tdd, typescript, basic-auth]

requires:
  - phase: 03-01
    provides: vitest infrastructure, 14 failing API client tests

provides:
  - src/api.ts with fetchTimeEntries and TimeEntry exports
  - Toggl API client with Basic Auth, project caching, running entry filtering
  - workspaceId: number field in TogglImportSettings and DEFAULT_SETTINGS
  - All 14 API tests passing (GREEN phase complete)

affects: [04-formatter, 05-command]

tech-stack:
  added: []
  patterns:
    - "togglGet<T> generic HTTP helper with throw: false and structured error messages"
    - "Module-level Map<number, string> project cache (volatile, resets on plugin reload)"
    - "vi.hoisted() pattern for mock variable hoisting in vitest"

key-files:
  created:
    - src/api.ts
  modified:
    - src/main.ts
    - tests/api.test.ts

key-decisions:
  - "Fixed vi.hoisted pattern in tests/api.test.ts — mockRequestUrl must be declared via vi.hoisted() so it is available when vi.mock factory is hoisted to module top"
  - "Exported _resetProjectCache() for test isolation (not needed by current tests but available)"
  - "throw: false on all requestUrl calls — mandatory per RESEARCH.md to avoid Obsidian throwing on non-2xx"

patterns-established:
  - "requestUrl pattern: always set throw: false, then check resp.status manually"
  - "Error message contract: static strings with status codes only, never interpolate token"
  - "Date boundary: new Date(date + 'T00:00:00').toISOString() for local-midnight-to-UTC"

requirements-completed: [CMD-04, CMD-08, FMT-04]

duration: 12min
completed: 2026-04-10
---

# Phase 03 Plan 02: Toggl API Client Implementation (GREEN) Summary

**src/api.ts implements full Toggl v9 API client: Basic Auth, local-date boundaries, session-cached project names, running entry filtering, and structured error messages — all 14 TDD tests passing GREEN.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-10T15:20:00Z
- **Completed:** 2026-04-10T15:32:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `TogglImportSettings` with `workspaceId: number` (default 0) and matched DEFAULT_SETTINGS
- Created `src/api.ts` (116 lines) with full Toggl API client implementation
- All 14 RED tests from Plan 01 now pass GREEN
- Build produces clean main.js (2.3kb) with zero type errors

## Task Commits

1. **Task 1: Extend TogglImportSettings with workspaceId** - `60aad26` (feat)
2. **Task 2: Implement src/api.ts — Toggl API client module** - `f0107c4` (feat)

## Files Created/Modified

- `src/api.ts` — Full Toggl API client: fetchTimeEntries, TimeEntry interface, togglGet helper, project cache, auth header
- `src/main.ts` — Added workspaceId: number to interface and DEFAULT_SETTINGS
- `tests/api.test.ts` — Fixed vi.hoisted() pattern so mockRequestUrl is available at mock factory time

## Decisions Made

- Used `vi.hoisted()` in tests to fix mockRequestUrl hoisting — this is the correct vitest pattern when a mock variable is referenced in a `vi.mock()` factory that gets hoisted above the variable declaration
- Exported `_resetProjectCache()` from api.ts for future test isolation needs (not currently called by tests, but makes module testable without restart)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.hoisted pattern in tests/api.test.ts**
- **Found during:** Task 2 (running the test suite for the first time)
- **Issue:** `const mockRequestUrl = vi.fn()` declared at module level, but `vi.mock('obsidian', () => ({ requestUrl: mockRequestUrl }))` is hoisted above it by vitest — causing `ReferenceError: Cannot access 'mockRequestUrl' before initialization`
- **Fix:** Changed to `const { mockRequestUrl } = vi.hoisted(() => ({ mockRequestUrl: vi.fn() }))` so the variable is created in the hoisted scope and available to the mock factory
- **Files modified:** tests/api.test.ts
- **Verification:** All 14 tests pass after fix
- **Committed in:** f0107c4 (Task 2 commit)

**2. [Rule 3 - Blocking] Installed npm dependencies in worktree**
- **Found during:** Task 2 (running vitest for first time)
- **Issue:** Worktree had no node_modules — vitest could not find 'vitest/config' module
- **Fix:** Ran `npm install --legacy-peer-deps` in worktree directory
- **Files modified:** None (node_modules not committed)
- **Verification:** Tests ran successfully after install
- **Committed in:** N/A (node_modules not tracked)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for test execution. The vi.hoisted fix resolves a pre-existing bug in the test file written in Plan 01. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `fetchTimeEntries(plugin, date)` returns `TimeEntry[]` — ready for Phase 4 (formatter) to consume
- `TimeEntry` interface exported: `{ id, description, start, stop, duration, project_name, tags }`
- `start` field preserved as raw UTC ISO string from Toggl API (per FMT-04 — Phase 4 does local conversion)
- Phase 4 can import `TimeEntry` from `src/api.ts` directly
- Phase 5 can import `fetchTimeEntries` from `src/api.ts` and wrap in try/catch for Notice display

---
*Phase: 03-api-client*
*Completed: 2026-04-10*
