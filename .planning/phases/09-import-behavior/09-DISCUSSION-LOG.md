# Phase 9: Import Behavior - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-15
**Phase:** 09-import-behavior
**Mode:** discuss
**Areas discussed:** Sort placement, Sort order setting (scope expansion), Filename prefix matching, Error message wording

## Gray Areas Presented

| Area | Selected? |
|------|-----------|
| Sort placement | Yes |
| Filename prefix matching | Yes |
| Error message wording | Yes |

## Discussion Summary

### Sort Placement
- **Decision:** Sort inside `fetchTimeEntries` in `api.ts`
- **User input:** Confirmed option 1 (api.ts)

### Sort Order Setting (Scope Expansion)
- **Original OOS status:** v1.1 requirements explicitly listed "Sort order setting (asc/desc toggle)" as out of scope
- **User decision:** Expand Phase 9 to include the sort order setting — overrides OOS list
- **Decision:** Add `sortOrder: 'asc' | 'desc'` to `TogglImportSettings`, default `'asc'`, with a dropdown in the settings tab

### Sort Order UI
- **Decision:** Dropdown (addDropdown) with "Ascending (oldest first)" / "Descending (newest first)"
- **Rationale:** Consistent with existing output format dropdown pattern

### Filename Prefix Matching
- **Decision:** Regex prefix capture `^(\d{4}-\d{2}-\d{2})`, format-only validation
- **User clarification:** Regex is fine; show a Notice with the expected format when it doesn't match

### Error Message
- **Decision:** `"Note filename must start with a valid date (expected: yyyy-mm-dd, e.g. 2026-01-15 or 2026-01-15 Daily Note)."`
- **Derived from:** User clarified the message should say format is incorrect and show expected format

## Corrections Made

### Sort Order Setting
- **Original assumption:** IMP-01 = ascending only (per OOS list)
- **User correction:** Include configurable sort order in this phase
- **Reason:** User explicitly chose to override the out-of-scope decision

## Deferred
- Calendar-range validation on extracted date — user chose format-only
