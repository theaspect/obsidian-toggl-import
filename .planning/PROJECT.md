# Obsidian Toggl Import Plugin

## What This Is

An Obsidian plugin that imports Toggl Track time entries into daily notes with a single command. The active note's filename (yyyy-mm-dd) determines the date, entries are fetched from Toggl's API, and the formatted output is inserted at the cursor. Format is fully configurable — markdown table or delimited plain text, both with the same selectable columns.

## Core Value

One command pulls the day's Toggl entries into your daily note, formatted exactly how you want them — no manual copying.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Plugin settings include a Toggl API token field for authentication
- [ ] Plugin settings include format selection: table or plain text
- [ ] Plugin settings include column selection: description, start time, duration, tags, project (any combination, any order)
- [ ] Plugin settings include a delimiter field for plain text format (space, semicolon, pipe, colon, or any custom string)
- [ ] Command "Import Toggl Entries" reads the active note's filename as a yyyy-mm-dd date
- [ ] Command fetches time entries for that date from Toggl API using the default workspace
- [ ] Entries are inserted at the cursor position in the active note
- [ ] Running the command again appends new entries rather than replacing existing ones
- [ ] Table format renders as a Markdown table with the configured columns
- [ ] Plain text format renders each entry as one line, columns joined by the configured delimiter

### Out of Scope

- Date picker prompt — filename is the date source
- Per-note format override — one global format in settings
- Workspace selection — use the default/first workspace from the API
- Email/password login — API token only
- Automatic import on note open — command-triggered only

## Context

- This is an Obsidian community plugin (not a core plugin)
- Obsidian plugins are written in TypeScript using the Obsidian API
- Toggl Track API v9 is the current REST API; authentication uses HTTP Basic Auth with API token as username and "api_token" as password
- The plugin targets personal use: a single user, single workspace
- Daily notes follow the yyyy-mm-dd filename convention (compatible with Obsidian's Daily Notes core plugin)
- Toggl returns times in UTC; display should account for the user's local timezone

## Constraints

- **Tech Stack**: TypeScript + Obsidian Plugin API — standard for all Obsidian plugins
- **Auth**: Toggl API token via HTTP Basic Auth — no OAuth required
- **Scope**: Single workspace (default), no multi-user support
- **Compatibility**: Must work on Obsidian desktop (Windows, Mac, Linux); mobile is out of scope

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Filename drives the date | No extra prompt needed; aligns with daily note conventions | — Pending |
| Insert at cursor, not append | User controls placement; works with any note structure | — Pending |
| Reimport appends rather than replaces | Prevents accidental data loss if run twice | — Pending |
| API token only (no OAuth) | Toggl API supports token auth natively; simpler than OAuth flow | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*
