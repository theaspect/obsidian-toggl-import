# Phase 2: Settings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-10
**Phase:** 02-settings
**Mode:** discuss
**Areas discussed:** Delimiter field visibility, API token masking

## Gray Areas Presented

| Area | Question | Options |
|------|----------|---------|
| Delimiter field | Always visible or conditional on format? | Conditional / Always visible |
| Token field | Masked (password) or plain text? | Masked / Plain text |

## Decisions Made

### Delimiter field visibility
- **Question:** Should the delimiter field be visible at all times, or only appear when "plain text" format is selected?
- **User chose:** Conditional (Recommended) — delimiter hidden when table format is selected

### API token masking
- **Question:** Should the Toggl API token input be masked (like a password) or shown as plain text?
- **User chose:** Masked (Recommended) — input type=password

## Pre-decided (no discussion needed)

- File structure: `src/settings.ts` as `PluginSettingTab` subclass — standard Obsidian pattern, implied by Phase 1 stub comment
- Column UI: 5 individual toggles — directly mapped from `TogglImportSettings.columns` keys
- Warning display: inline `setDesc()` under token field — standard Obsidian settings pattern
- Format control: `addDropdown()` — matches `'table' | 'plaintext'` union type
- No column ordering UI — drag-and-drop is v2 (COL-01), out of scope here
