---
phase: 05
plan: 01
subsystem: command
tags: [tdd, tests, command, red-phase]
dependency_graph:
  requires: []
  provides: [tests/command.test.ts]
  affects: [src/main.ts]
tech_stack:
  added: []
  patterns: [vi.hoisted + vi.mock pattern, vitest TDD RED phase]
key_files:
  created:
    - tests/command.test.ts
  modified: []
decisions:
  - "9 test cases covering CMD-01, CMD-02, CMD-03, CMD-03b/D-04, CMD-05 (x2), CMD-06, CMD-07/REIMP-01"
  - "Used vi.hoisted + vi.mock pattern matching tests/api.test.ts exactly"
  - "loadPluginAndGetCallback() helper centralizes plugin instantiation and command spec extraction"
metrics:
  duration_seconds: 49
  completed_date: "2026-04-12"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
requirements: [CMD-01, CMD-02, CMD-03, CMD-05, CMD-06, CMD-07, REIMP-01]
---

# Phase 05 Plan 01: Command Test Scaffold Summary

**One-liner:** Failing vitest test suite for Import Toggl Entries command covering all 7 Phase 5 requirements (RED state, 9 tests, 0 passing).

## What Was Built

Created `tests/command.test.ts` — the Wave 0 test scaffold for Phase 5. This is the RED step of TDD: the test file locks the behavioral contract for the import command before any implementation is written in Plan 02.

## Test File Created

**`tests/command.test.ts`** — 9 test cases, all failing (RED):

| Test | Requirement | What it Asserts |
|------|-------------|-----------------|
| CMD-01: registers Import Toggl Entries command | CMD-01 | `addCommand` called once with `id='import-toggl-entries'`, `name='Import Toggl Entries'`, `editorCallback` is a function |
| CMD-02: reads active note basename as date | CMD-02 | `fetchTimeEntries` called with `(plugin, '2024-06-15')` when basename is `'2024-06-15'` |
| CMD-03: rejects non-date filename | CMD-03 | Notice shown with date validation message; no API call when basename is `'not-a-date'` |
| CMD-03: null active file | CMD-03 | Notice shown with date validation message; no API call when `getActiveFile()` returns null |
| CMD-03b / D-04: empty token guard | D-04 | Notice shown for empty API token; fires before date check; no API call |
| CMD-05: API error surfaces as Notice | CMD-05 | Error message from rejected fetchTimeEntries shown in Notice; no `replaceSelection` |
| CMD-05: non-Error rejection | CMD-05 | Generic 'Toggl API error: unknown error' shown for non-Error rejects |
| CMD-06: empty entries notice | CMD-06 | 'No entries found for this date.' shown; no `replaceSelection` |
| CMD-07 / REIMP-01: insert at cursor | CMD-07, REIMP-01 | `replaceSelection` called once with formatted text + `'\n'`; Notice shows entry count |

## Confirmed RED State

All 9 tests fail. The first failure (`CMD-01`) shows the root cause:

```
AssertionError: expected "vi.fn()" to be called once, but got 0 times
  at tests/command.test.ts:83:26
```

`main.ts` has `// Phase 5: register import command` as a placeholder comment — `addCommand` is never invoked during `onload()`, so all tests cascade from this missing implementation.

## Mock Pattern

Follows `tests/api.test.ts` exactly:
- `vi.hoisted(...)` declares all 6 mock functions before `vi.mock()` factory runs
- `vi.mock('obsidian', ...)` — Plugin base class with wired `app.workspace.getActiveFile` and `addCommand`
- `vi.mock('../src/api', ...)` — Intercepts `fetchTimeEntries` (T-05-01: no real network calls)
- `vi.mock('../src/formatter', ...)` — Intercepts `formatEntries`
- `vi.mock('../src/settings', ...)` — Stubs `TogglImportSettingTab` (imported during `onload()`)
- All imports after mocks

**Deviations from api.test.ts pattern:** None — exact same structure, extended for command-specific mocks.

## Helper Utilities

**`loadPluginAndGetCallback()`** — async helper that:
1. Constructs `new TogglImportPlugin()`
2. Sets `plugin.settings` with test token, table format, all columns, workspaceId 42
3. Calls `await plugin.onload()`
4. Extracts `editorCallback` from `mockAddCommand.mock.calls[0][0]`
5. Returns `{ plugin, spec, editorCallback, editor }` for test use

## No Regressions

Existing 40 tests in `api.test.ts` and `formatter.test.ts` continue to pass:

```
Test Files  2 passed (2)
     Tests  40 passed (40)
```

## Deviations from Plan

None — plan executed exactly as written. The mock structure, test names, and assertion messages match the plan specification.

## Known Stubs

None — test file only, no UI or data stubs.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced.

## Self-Check: PASSED

- `tests/command.test.ts` exists: FOUND
- Commit `fa24d5b` exists: FOUND
- Existing 40 tests still pass: CONFIRMED
- 9 new tests fail RED: CONFIRMED
