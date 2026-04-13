# Phase 4: Formatter - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

The formatter produces correct Markdown table and plain text output from `TimeEntry[]` using the configured columns and delimiter. This phase is a pure transformation layer only — no API calls, no Obsidian API, no file I/O. The command wiring happens in Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Module Structure
- **D-01:** Formatter lives in `src/formatter.ts` and exports a single pure function: `formatEntries(entries: TimeEntry[], settings: TogglImportSettings): string`. No class needed — stateless transformation.
- **D-02:** Empty entries input (`entries.length === 0`) returns an empty string `""`. Phase 5 handles the "no entries" notice (CMD-06); the formatter does not.

### Column Ordering
- **D-03:** Fixed canonical column order: **Description → Start → Duration → Project → Tags**. Only enabled columns are included. This order applies to both Markdown table headers and plain text fields. (v2 drag-and-drop reordering is COL-01 — out of scope for this phase.)

### Start Time Format
- **D-04:** Start time rendered as **HH:MM 24-hour** in the user's local timezone. Implementation: manual construction via `getHours()` and `getMinutes()` on `new Date(entry.start)` — e.g., `String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')`. Avoids locale unpredictability of `toLocaleTimeString()`.

### Duration Format
- **D-05:** Duration uses **compact display — drop zero units**:
  - `3600s` → `1h`
  - `5400s` → `1h 30m`
  - `90s` → `1m`
  - `45s` (sub-minute) → `0m`
  - Algorithm: `hours = Math.floor(secs / 3600)`, `mins = Math.floor((secs % 3600) / 60)`. If hours > 0 and mins > 0: `${hours}h ${mins}m`. If hours > 0 and mins === 0: `${hours}h`. If hours === 0: `${mins}m`.

### Markdown Table (FMT-01)
- **D-06:** GFM table with enabled columns as headers, standard left-align separator (`---`). No padding or alignment beyond what GFM requires.
- **D-07:** Column header strings (matching D-03 order): `Description`, `Start`, `Duration`, `Project`, `Tags`.

### Plain Text (FMT-02)
- **D-08:** One entry per line, enabled column values joined by `settings.delimiter`. No header row — plain text is data-only.

### Tags Column (FMT-05)
- **D-09:** Tags rendered as comma-separated list: `tag1, tag2`. Empty tags array renders as empty string `""`.

### Claude's Discretion
- Whether to export helper functions (`formatDuration`, `formatStartTime`) or keep them private
- Exact test file name and structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Output Format — FMT-01, FMT-02, FMT-03, FMT-05 (all 4 formatter requirements are in scope)

### Existing Code
- `src/api.ts` — `TimeEntry` interface (the formatter's input type); exports: `{ id, description, start, stop, duration, project_name, tags[] }`
- `src/main.ts` — `TogglImportSettings` interface (the formatter's config input): `{ outputFormat, columns, delimiter }`

### Roadmap
- `.planning/ROADMAP.md` §Phase 4 — Success criteria: 4 testable conditions

No external specs — requirements and decisions fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/api.ts` `TimeEntry` interface — import directly into `src/formatter.ts`
- `src/main.ts` `TogglImportSettings` interface — import directly for typed settings parameter
- `tests/api.test.ts` — reference for vitest test patterns (vi.hoisted, describe/it/expect) to follow in `tests/formatter.test.ts`

### Established Patterns
- Tabs for indentation (all existing source files)
- Named exports (not default exports) for standalone functions — consistent with `fetchTimeEntries` in `api.ts`
- Pure functions preferred where state is not needed

### Integration Points
- **Input:** `TimeEntry[]` from `src/api.ts` (already normalized — `project_name` is a string, `tags` is `string[]`, not null)
- **Output:** `string` passed to Phase 5 command for cursor insertion
- Phase 5 will call `formatEntries(entries, plugin.settings)` directly — no intermediate adapter needed

</code_context>

<specifics>
## Specific Ideas

- Start time: manual `padStart` approach for HH:MM guarantees consistent output in tests regardless of test runner locale
- Duration compact format confirmed with examples: `1h`, `30m`, `0m`, `1h 30m`
- Column order confirmed as: Description, Start, Duration, Project, Tags (tags/project swapped from initial proposal)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-formatter*
*Context gathered: 2026-04-10*
