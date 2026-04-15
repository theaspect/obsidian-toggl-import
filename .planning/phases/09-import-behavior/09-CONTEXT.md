# Phase 9: Import Behavior - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Sort imported entries by start time and allow the import command to parse the date from note filenames that start with a yyyy-mm-dd prefix (e.g. "2026-12-31 Daily.md"). A sort order setting (asc/desc) is explicitly included in scope per user decision, overriding the v1.1 out-of-scope list. No other behavioral changes.

</domain>

<decisions>
## Implementation Decisions

### Sort Order (IMP-01)
- **D-01:** Sort is applied inside `fetchTimeEntries` in `api.ts` — always sorted before returning to callers. Use `.sort((a, b) => a.start.localeCompare(b.start))` for ascending (ISO strings sort correctly lexicographically).
- **D-02:** Sort direction is configurable. Add `sortOrder: 'asc' | 'desc'` to `TogglImportSettings`, default `'asc'`. `fetchTimeEntries` receives the plugin and reads `plugin.settings.sortOrder` to determine direction.
- **D-03:** Sort order UI in settings tab: a dropdown (addDropdown) with two options — "Ascending (oldest first)" and "Descending (newest first)". Consistent with the existing output format dropdown.

### Filename Date Prefix (IMP-02)
- **D-04:** Change the filename regex from exact match (`/^\d{4}-\d{2}-\d{2}$/`) to prefix capture (`/^(\d{4}-\d{2}-\d{2})/`). Extract the captured group as the date string passed to `fetchTimeEntries`.
- **D-05:** Validation is format-only (regex pattern match). No calendar-range checks (month ≤ 12, etc.) — if the extracted date is nonsensical, the Toggl API returns no results naturally.
- **D-06:** Updated error notice when filename doesn't match: `"Note filename must start with a valid date (expected: yyyy-mm-dd, e.g. 2026-01-15 or 2026-01-15 Daily Note)."`

### Claude's Discretion
- Exact placement of the sort order setting within the settings tab (after the delimiter field is sensible)
- Whether to reverse the sort in-place or by reversing the sort comparator
- Test data arrangement for sort order tests

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §IMP-01, §IMP-02 — acceptance criteria for this phase

### Source files to modify
- `src/api.ts` — `fetchTimeEntries` function (add sort, read `sortOrder` setting)
- `src/main.ts` — `TogglImportSettings` interface (add `sortOrder`), `DEFAULT_SETTINGS` (add default), filename regex (lines ~57-60)
- `src/settings.ts` — settings tab UI (add sort order dropdown)

### Test files to update
- `tests/api.test.ts` — add sort order tests; existing tests pass `plugin` mock
- `tests/command.test.ts` — add prefix filename tests; update error message assertions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `addDropdown` pattern already used in `src/settings.ts` for output format — clone this pattern for sort order dropdown
- `plugin.settings.outputFormat` access pattern — same for `plugin.settings.sortOrder`

### Established Patterns
- TDD RED→GREEN: write failing tests first, then implement (v1.0 Key Decision)
- Settings fields follow `TogglImportSettings` interface → `DEFAULT_SETTINGS` → `addDropdown/addText` in settings tab
- Notices use `new Notice('message')` — already imported in `main.ts`

### Integration Points
- `src/main.ts:57` — filename regex is the exact line to change for IMP-02
- `src/api.ts` end of `fetchTimeEntries` — add sort before the `return` statement
- `src/settings.ts` — add sort order setting after the delimiter field

</code_context>

<specifics>
## Specific Ideas

- Sort order dropdown labels: "Ascending (oldest first)" and "Descending (newest first)"
- Error message: "Note filename must start with a valid date (expected: yyyy-mm-dd, e.g. 2026-01-15 or 2026-01-15 Daily Note)."
- Sort order setting overrides the v1.1 out-of-scope list — user explicitly chose to include it

</specifics>

<deferred>
## Deferred Ideas

- Calendar-range validation on extracted date (month ≤ 12, day ≤ 31) — user chose format-only; API handles bad dates naturally

</deferred>

---

*Phase: 09-import-behavior*
*Context gathered: 2026-04-15*
