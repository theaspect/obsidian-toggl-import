# Phase 3: API Client - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

The plugin can fetch correctly scoped time entries from Toggl for a given local date, filter out running entries, and resolve project names. This phase delivers the API client module only — formatting output is Phase 4, wiring the command is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Timezone Date Boundaries
- **D-01:** Translate the note's `yyyy-mm-dd` filename to API date params using **local midnight → UTC**: `new Date('YYYY-MM-DDT00:00:00').toISOString()` for start, `new Date('YYYY-MM-DDT23:59:59').toISOString()` for end. This correctly scopes the fetch to the user's local calendar day regardless of timezone.

### Project Name Resolution
- **D-02:** Fetch all projects from the workspace **once per Obsidian session** and cache the result as an in-memory `Map<number, string>` (project ID → name). Reuse the cache on subsequent imports within the same session. Stale project names (e.g. renamed mid-session) are acceptable — the cache is not persisted across restarts.
- **D-03:** Project fetch endpoint: `/workspaces/{workspaceId}/projects` (requires workspace ID from D-05/D-06). Entries with no project (`project_id: null`) resolve to an empty string or `—`.

### Error Handling Contract
- **D-04:** The API client **throws `Error`** with a descriptive human-readable message on failure. The Command phase (Phase 5) wraps all API calls in `try/catch` and passes `error.message` to `new Notice(...)`. Specific errors to throw:
  - 401: `'Toggl API error: invalid API token (401)'`
  - 429: `'Toggl API error: rate limited — try again in a moment (429)'`
  - Other non-2xx: `'Toggl API error: {status} {statusText}'`
  - Network failure: rethrow with `'Toggl API error: network request failed'`

### Workspace ID
- **D-05:** Add `workspaceId: number` (default `0`) to `TogglImportSettings` and `DEFAULT_SETTINGS` in `src/main.ts`.
- **D-06:** On first import (when `settings.workspaceId === 0`), call `/me` to fetch `default_workspace_id`, store it via `saveSettings()`. On subsequent imports, use the persisted value — no `/me` call needed.

### Running Entry Filtering
- **D-07:** Exclude running entries by filtering: `entry.duration < 0 || entry.stop == null`. Both conditions indicate an active timer per Toggl API docs. Filtering is silent — no notice to user (per CMD-08).

### Claude's Discretion
- File name for API client module (`src/api.ts` is a reasonable default)
- Exact TypeScript interface shape for `TimeEntry` (derive from Toggl API response)
- Whether to export a class or standalone functions from the module
- Internal structure of the session cache (module-level variable vs. plugin property)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Import Command — CMD-04, CMD-08 (fetch and running-entry filter)
- `.planning/REQUIREMENTS.md` §Output Format — FMT-04 (start time in local timezone)

### Existing Code
- `src/main.ts` — `TogglImportSettings` interface and `DEFAULT_SETTINGS` to be extended with `workspaceId: number`; `requestUrl` import pattern to follow
- `src/settings.ts` — Reference for code style (tabs, class structure)

### Roadmap
- `.planning/ROADMAP.md` §Phase 3 — Success criteria: 4 testable conditions

### API Reference
- `CLAUDE.md` §Toggl Track API v9 — Auth method (Basic Auth + btoa), base URL, `/me/time_entries` params, time entry response shape

No external specs beyond CLAUDE.md — API details and decisions fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main.ts`: `TogglImportSettings` interface — Phase 3 extends it with `workspaceId: number`
- `src/main.ts`: `saveSettings()` — API client calls this after auto-populating `workspaceId`
- `src/main.ts`: `requestUrl` is the HTTP abstraction to use (no native fetch — locked in Phase 1)

### Established Patterns
- HTTP Basic Auth: `btoa(token + ':api_token')` → `Authorization: Basic <encoded>` (from CLAUDE.md)
- Tabs for indentation, same as `main.ts` and `settings.ts`
- `export default class` or named exports — follow whichever matches the module's shape

### Integration Points
- `src/main.ts` `TogglImportSettings`: add `workspaceId: number` field + default `0`
- `src/main.ts` `DEFAULT_SETTINGS`: add `workspaceId: 0`
- Phase 5 (Command): receives `TimeEntry[]` from this module and passes to formatter
- Phase 4 (Formatter): receives `TimeEntry[]` with `project_name` already resolved (string, not ID)

</code_context>

<specifics>
## Specific Ideas

- Workspace ID auto-populate: check `plugin.settings.workspaceId === 0` at the top of the fetch function; if so, call `/me`, extract `default_workspace_id`, call `saveSettings()` before proceeding
- Project session cache lives at module level (or as a closure variable) — not in plugin settings, not on disk
- Date boundary construction: `new Date(date + 'T00:00:00').toISOString()` and `new Date(date + 'T23:59:59').toISOString()` where `date` is the raw `yyyy-mm-dd` string from the note filename

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-api-client*
*Context gathered: 2026-04-10*
