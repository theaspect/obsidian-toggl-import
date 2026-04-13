# Phase 3: API Client - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-10
**Phase:** 03-api-client
**Mode:** discuss
**Areas discussed:** Timezone boundaries, Project name resolution, Error handling contract, Workspace ID acquisition

## Gray Areas Presented

| # | Area | Options Offered |
|---|------|----------------|
| 1 | Timezone date boundaries | A: UTC midnight / B: Local midnight → UTC |
| 2 | Project name resolution | A: Batch per import / B: Session cache / C: Skip for Phase 3 |
| 3 | Error handling contract | A: Throw errors / B: Result union type |
| 4 | Workspace ID acquisition | A: Fetch `/me` per import / B: Session cache / C: Store in settings |

## Decisions Made

### 1. Timezone Date Boundaries
- **Chosen:** B — Local midnight → UTC
- **Rationale:** Correct for all timezones; Option A silently wrong for non-UTC users

### 2. Project Name Resolution
- **Chosen:** B — Session cache (fetch once per Obsidian session, reuse in-memory)
- **Rationale:** Efficient after first import; matches session lifetime; stale names acceptable

### 3. Error Handling Contract
- **Chosen:** A — Throw errors
- **Rationale:** Simple, idiomatic TypeScript; single caller (Command phase) uses try/catch

### 4. Workspace ID Acquisition
- **Chosen:** C — Store in settings
- **Rationale:** Auto-populate on first import via `/me`, then persist; avoids repeated `/me` calls across sessions

## No Corrections

All decisions made by user selection — no assumption overrides needed.
