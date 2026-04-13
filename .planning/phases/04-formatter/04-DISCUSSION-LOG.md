# Phase 4: Formatter - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-10
**Phase:** 04-formatter
**Mode:** discuss
**Areas discussed:** Start time format, Duration edge cases, Column ordering

## Gray Areas Presented

### Start Time Format
| Option | Selected |
|--------|----------|
| HH:MM 24-hour | ✓ |
| h:MM AM/PM 12-hour | — |
| System locale (toLocaleTimeString) | — |

### Duration Edge Cases
| Option | Selected |
|--------|----------|
| Compact: drop zero units | ✓ |
| Always show both units | — |
| Show seconds for sub-minute | — |

### Column Ordering
| Option | Selected |
|--------|----------|
| Description → Start → Duration → Tags → Project | — |
| Description → Start → Duration → Project → Tags | ✓ (corrected via user note) |
| Project → Description → Start → Duration → Tags | — |

## Corrections Made

### Column Ordering
- **Original proposal:** Description → Start → Duration → Tags → Project
- **User correction:** Swap tags and project — final order is Description → Start → Duration → Project → Tags
- **Reason:** User prefers project before tags

## Decided Without Discussion

- Module structure: `src/formatter.ts`, pure `formatEntries()` function
- Empty entries: return `""` (Phase 5 handles CMD-06 notice)
- GFM table alignment: standard `---` separators
- Tags rendering: comma-separated list (FMT-05 requirement)
