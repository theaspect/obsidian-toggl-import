---
created: 2026-04-16T15:51:46.418Z
title: Add day-break cutoff time setting
area: general
files:
  - src/main.ts
  - src/api.ts
---

## Problem

Toggl entries that span midnight or happen late at night get attributed to the wrong day. For example, a session started at 23:30 and ending at 00:30 belongs to the "yesterday" block in a daily note, not today's. Similarly, a user who works late (e.g. until 01:00) wants those entries to appear in the previous day's note.

Currently the plugin determines the date strictly from the active note's filename (yyyy-mm-dd) and queries Toggl for that calendar day (`T00:00:00` to `T23:59:59`). There is no concept of a day boundary other than midnight.

## Solution

Add a `dayBreak` (or `dayStartTime`) setting — a configurable HH:MM cutoff (e.g. `"00:00"` to keep current behaviour, `"07:00"` for a 7am start). When set to a non-midnight value:

- The date range sent to the Toggl API shifts: fetch from `{date}T{dayBreak}` to `{date+1}T{dayBreak}` instead of `T00:00:00` to `T23:59:59`
- Entries that cross the boundary are attributed to the day whose "logical day" they fall in (i.e. an entry at 01:30 with dayBreak=07:00 belongs to the *previous* day's note, so the user would open yesterday's note to see it)

Key files to change:
- `src/main.ts` — add `dayBreak: string` to `TogglImportSettings` with default `"00:00"`, wire into the fetch call
- `src/api.ts` — adjust `start_date` / `end_date` query parameters based on the dayBreak offset
- `src/settings.ts` — add a text field for the cutoff time (HH:MM format, with validation)
- `tests/` — add tests for date range calculation with non-midnight dayBreak values
