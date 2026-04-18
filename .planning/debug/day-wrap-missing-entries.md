---
status: fixing
trigger: "Next-day entries (after 00:00 local but before wrap time) still not appearing in import. User (UTC+7) reports the day wrap feature isn't working. Also: settings description doesn't state the time is in local timezone."
created: 2026-04-18
updated: 2026-04-18
---

# Debug Session: day-wrap-missing-entries

## Symptoms

- **Expected:** When dayWrapTime = 03:30 and importing June 15, entries from June 16 00:00–03:29 LOCAL appear
- **Actual:** Those entries are not shown
- **Error messages:** None — silent omission
- **Timeline:** New feature (260418-f3a); user in UTC+7
- **Reproduction:** Set dayWrapTime to 03:30, have entries in the early hours of the next local day, run import

## Evidence

- timestamp: 2026-04-18
  finding: >
    Code trace (UTC+7, importing June 15, wrap 03:30):
    start = June 14 17:00 UTC (local midnight), end = June 15 20:30 UTC (local next-day wrap).
    Entry at June 16 02:00 local = June 15 19:00 UTC → IN API range.
    Filter: entryDate='2024-06-16' !== date='2024-06-15' → else branch → 120 < 210 → INCLUDED.
    Logic is correct. API range and filter are both right.

- timestamp: 2026-04-18
  finding: >
    Two real issues identified:
    1. Filter else-branch includes entries from ANY non-target date before wrap time (incl. dates 2+ days out).
       Should explicitly check entryDate === nextDay. Defensive fix — doesn't affect correctness for normal API responses but makes intent clear.
    2. Settings description says nothing about local timezone. User confused whether time is UTC or local.
       The description must explicitly state the time is in machine local time.

## Current Focus

hypothesis: Settings description confusion + overly broad else-branch in filter are the two issues. Core logic is correct; user may also not have rebuilt/reloaded plugin.
test: npm test after fixes
expecting: 82 tests pass; settings description updated
next_action: Apply both fixes

## Eliminated

- hypothesis: API range is wrong
  reason: Traced through UTC+7 scenario — start and end dates are correct local-time conversions

- hypothesis: Filter excludes valid next-day entries
  reason: entryDate === nextDay check works correctly; else branch correctly returns startLocalMinutes < wrapMinutes

## Resolution

root_cause: >
  1. Filter else-branch is too broad (any non-target date) — should be explicit nextDay check.
  2. Settings description does not mention local timezone — user cannot tell if wrap time is UTC or local.
fix: pending
verification: pending
files_changed:
  - src/api.ts (filter explicit nextDay check)
  - src/settings.ts (description update)
