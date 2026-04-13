# Phase 5: Command - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-12
**Phase:** 05-command
**Mode:** discuss
**Areas analyzed:** Re-import behavior, Insertion padding, Success feedback, Empty token guard

## Assumptions / Starting Points

Based on codebase analysis before discussion:
- `main.ts` has `// Phase 5: register import command` stub — command goes in `onload()`
- `api.ts` error contract already defined (throws human-readable Error messages)
- `formatter.ts` returns `""` for empty entries — Phase 5 handles the CMD-06 notice
- STATE.md explicitly flagged "deduplication strategy" as a Phase 5 blocker

## Assumptions Presented

| Area | Question | Options Offered | Confidence |
|------|----------|-----------------|------------|
| Re-import | Insert at cursor vs sentinel-block | Cursor insert / Sentinel marker | Likely |
| Insertion padding | Raw insert vs trailing newline vs surround | Trailing \n / Raw / Blank lines | Likely |
| Success feedback | Notice vs silent | Notice with count / Silent | Likely |
| Empty token | Proactive check vs let API fail | Proactive hint / Let 401 fire | Likely |

## Decisions Made

| Area | Decision | Notes |
|------|----------|-------|
| Re-import behavior | Insert at cursor (always) | Satisfies REIMP-01 trivially — no replacement ever occurs |
| Insertion padding | Trailing `\n` | One newline appended after formatted block |
| Success feedback | Show "Imported N entries" notice | Count gives useful confirmation |
| Empty token guard | Proactive check with settings hint | Avoids network call; more actionable message |

## Corrections Made

No corrections — all recommended options confirmed.

## Prior Context Applied

From Phase 3 (API Client):
- Error handling contract (D-04): API throws `Error` with human-readable messages; Phase 5 catches and passes to `new Notice()` — confirmed unchanged

From Phase 4 (Formatter):
- Empty entries returns `""` (D-02); Phase 5 handles CMD-06 notice — confirmed unchanged
