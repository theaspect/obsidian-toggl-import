# Feature Research

**Domain:** Obsidian plugin — external service import into daily notes (Toggl Track)
**Researched:** 2026-04-09
**Confidence:** MEDIUM (training data through Aug 2025; external search unavailable; knowledge of Obsidian plugin ecosystem and Toggl API is solid but community plugin survey is from training data only)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| API token settings field | Every service-connected plugin has auth config; without it the plugin can't work | LOW | Standard Obsidian settings tab with a password-type text field. Must be persisted via `loadData/saveData`. |
| Command palette entry | All Obsidian plugins expose functionality as commands; users expect to trigger import via Cmd/Ctrl+P | LOW | Single command: "Import Toggl Entries". Registered with `addCommand`. |
| Date derived from active note filename | Daily note plugins uniformly use `yyyy-mm-dd` filenames; users expect the plugin to know "what day this is" without asking | LOW | Parse `this.app.workspace.getActiveFile().basename`. Fail gracefully if filename isn't a valid date. |
| Insert at cursor | Standard insertion pattern for note-aware plugins; users expect output to go where they're working | LOW | Use `editor.replaceRange` at current cursor position. |
| Markdown table output | Obsidian renders markdown; table is the expected "structured data" output format | MEDIUM | Build table string with `\|` delimiters and header separator row. |
| Configurable columns | Users have different workflows; description-only vs full detail; no one-size fits all | MEDIUM | Settings UI with ordered, toggleable column list. Applies to both table and plain text. |
| Error feedback when API fails | Silently doing nothing on a bad token or network failure is confusing; users need a signal | LOW | `new Notice("Toggl: ...")` toasts are the standard Obsidian feedback pattern. Cover: bad token (401), no entries (empty), network failure, non-date filename. |
| Empty state handling | If no entries exist for the date, the plugin must communicate that clearly — inserting nothing silently is broken | LOW | Show a Notice: "No Toggl entries for [date]". Do not insert anything. |
| Plain text (delimited) output | Some users write notes in plain text or use non-table formats; format flexibility is expected for any "insert" plugin | MEDIUM | Single line per entry, columns joined by delimiter. Delimiter configurable. |
| Configurable delimiter | Directly coupled to plain text format; pipe, comma, semicolon, tab are all in use | LOW | Simple text input in settings. Default to `\|`. |
| Settings persist across restarts | Fundamental expectation for any plugin with configuration | LOW | `loadData/saveData` in `onload` / settings change handler. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Column ordering control | Most import plugins offer column on/off but not reordering; ordered columns match user's personal logging style | MEDIUM | Drag-to-reorder list in settings, or up/down arrow buttons. Stored as an ordered array of column keys. |
| Reimport appends rather than replaces | Protects against accidental data loss when command is run twice on a note that already has entries | LOW | Before inserting, don't erase what's already there — just append. Decision already validated in PROJECT.md. |
| Timezone-aware time display | Toggl returns UTC; naive plugins show UTC times which confuse users outside UTC | MEDIUM | Convert UTC timestamps to local time using `new Date().toLocaleTimeString()` or explicit offset. Must account for DST. This is an invisible correctness differentiator — users notice only when it's wrong. |
| Format preview in settings | Users don't know what a setting change looks like until they run the command; live preview reduces trial-and-error | MEDIUM | Render a static sample row in the settings tab using current settings state. No real API call needed. |
| Human-readable duration format | Toggl returns durations in seconds; `1h 23m` is far more readable than `4980s` or even `01:23:00` | LOW | Pure formatting: `Math.floor(seconds/3600)h Math.floor((seconds%3600)/60)m`. No dependencies. |
| Project name in output | Toggl entries are often categorized by project; surfacing project name in the daily note provides context at a glance | LOW | Already a planned column. Differentiator vs simpler tools that only show description+duration. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Date picker / prompt on import | Users want to import entries for yesterday or a custom date | Violates the plugin's core design principle (filename = date); adds UI complexity; creates a code path that duplicates the core flow with a different date source; users can just open the target daily note instead | Document clearly: open the daily note for the date you want, then run the command |
| Auto-import on note open | Users want entries to appear automatically when they open a daily note | Fires silently in the background; makes API calls the user didn't explicitly request; can hit rate limits; inserts duplicate entries if user opens note multiple times; hard to undo | Provide a hotkey binding for the command so "quick import" is a single keypress |
| Per-note format override | Power users want different formats in different notes | Massively increases settings complexity; requires frontmatter parsing or note metadata; creates state management burden; most users have one workflow | One global format in settings is the right default; revisit only with strong user demand |
| Workspace picker | Multi-workspace users want to choose which workspace | Adds a settings dropdown + API call to fetch workspaces; increases surface area; most users have one workspace | Default to the first/default workspace from the API; document the limitation |
| Real-time / live timer display | Timer-app feel inside Obsidian | Obsidian is a note-taking app, not a timer UI; requires polling or websocket; high complexity, low note-taking value | Out of scope; this is an import tool, not a Toggl client |
| Edit entries from Obsidian | Users want to push changes back to Toggl | Bidirectional sync is a fundamentally different product; requires conflict resolution, write API scope, and much higher complexity | Read-only import is the right v1 scope; clearly label as "import" not "sync" |
| Multi-service support (Clockify, Harvest, etc.) | Users with multiple time trackers want one plugin | Turns a focused plugin into a framework; each service has different auth, data models, and edge cases | Stay Toggl-specific; keep scope tight |
| Undo/history of past imports | Users want to see what was imported and roll back | Requires local state storage, diff logic, and UI for history; high complexity | The "append not replace" behavior already mitigates the worst case; Obsidian's own undo (Ctrl+Z) handles accidental inserts |

---

## Feature Dependencies

```
[API token setting]
    └──requires──> [All API calls] (no token = no data)

[Column selection setting]
    └──requires──> [Format output] (columns drive what fields are fetched/displayed)
        └──requires──> [API token setting]

[Plain text format]
    └──requires──> [Delimiter setting] (delimiter is only meaningful for plain text)

[Column ordering]
    └──enhances──> [Column selection setting] (ordering is a superset of on/off)

[Format preview in settings]
    └──depends on──> [Column selection setting]
    └──depends on──> [Format selection setting]
    └──depends on──> [Delimiter setting]

[Timezone-aware display]
    └──enhances──> [Start time column] (only matters when start time is shown)

[Reimport appends]
    └──enhances──> [Core insert at cursor] (behavior modifier, not a new feature)
```

### Dependency Notes

- **API token requires everything:** No token, no API calls. Auth must be the first thing users configure; settings tab should make this obvious (place token field at the top, show a warning if blank when command is run).
- **Column selection drives format output:** The columns setting is the single most important configuration surface — it affects both table and plain text. Column logic must be implemented before either format renderer.
- **Delimiter is only meaningful in plain text mode:** Hide or gray out the delimiter field when table format is selected. Reduces cognitive load.
- **Format preview depends on all three format settings:** Implement preview last, after column selection, format toggle, and delimiter are all stable.
- **Column ordering enhances column selection:** These can be built together or separately. If building separately, implement column on/off first, add ordering in a second pass.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] API token settings field — without this nothing works
- [ ] "Import Toggl Entries" command — the core action
- [ ] Parse date from active note filename — date source
- [ ] Fetch entries from Toggl API v9 for that date — data retrieval
- [ ] Insert at cursor position — placement
- [ ] Markdown table format with configured columns — primary output format
- [ ] Plain text delimited format with configured columns — secondary output format
- [ ] Column selection (description, start time, duration, tags, project) — format control
- [ ] Configurable delimiter for plain text — format control
- [ ] Error/empty state notices — correctness
- [ ] Timezone-aware time display — correctness (Toggl returns UTC; wrong times are immediately visible)
- [ ] Reimport appends not replaces — data safety

### Add After Validation (v1.x)

Features to add once core is working and user feedback exists.

- [ ] Column ordering (drag/reorder) — trigger: user requests for custom column order
- [ ] Format preview in settings — trigger: user confusion about what settings produce
- [ ] Human-readable duration formatting — trigger: if not included in v1 and users complain about raw seconds

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Live settings preview with real sample data — requires stable settings API
- [ ] Support for multiple workspaces — defer until user demand confirmed
- [ ] Hotkey suggestions / onboarding notice for first-time users — polish pass

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| API token field | HIGH | LOW | P1 |
| Import command | HIGH | LOW | P1 |
| Date from filename | HIGH | LOW | P1 |
| Toggl API fetch | HIGH | MEDIUM | P1 |
| Insert at cursor | HIGH | LOW | P1 |
| Markdown table output | HIGH | MEDIUM | P1 |
| Plain text output | HIGH | LOW | P1 |
| Column selection | HIGH | MEDIUM | P1 |
| Configurable delimiter | MEDIUM | LOW | P1 |
| Error / empty state notices | HIGH | LOW | P1 |
| Timezone-aware time display | HIGH | MEDIUM | P1 |
| Reimport appends | MEDIUM | LOW | P1 |
| Column ordering (reorder) | MEDIUM | MEDIUM | P2 |
| Format preview in settings | MEDIUM | MEDIUM | P2 |
| Human-readable duration | MEDIUM | LOW | P2 |
| Workspace picker | LOW | MEDIUM | P3 |
| Auto-import on open | LOW | HIGH | P3 — anti-feature |
| Bidirectional sync | LOW | HIGH | P3 — out of scope |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have / future consideration

---

## Competitor Feature Analysis

Note: The following is based on training data knowledge of the Obsidian plugin ecosystem through August 2025. External plugin registry search was unavailable during this research session. Confidence: MEDIUM.

| Feature | obsidian-toggl-integration (community) | Generic import plugins (e.g., Day Planner) | Our Approach |
|---------|----------------------------------------|---------------------------------------------|--------------|
| Auth | API token in settings | N/A (local data) | API token in settings — same pattern |
| Trigger | Command + optional auto-import | Command or scheduled | Command only — explicit, no background calls |
| Date source | Active file or date picker | Active file date | Active file filename only — no picker |
| Output format | Markdown table | Markdown/plain | Both table and plain text, user-selectable |
| Column control | Limited | N/A | Ordered, selectable columns per user preference |
| Timezone handling | Varies (often UTC displayed as-is) | N/A | Explicit local timezone conversion |
| Reimport behavior | Often replaces | Varies | Appends — data-safe default |
| Workspace | Single (default) | N/A | Single (default) — matches most users' reality |

---

## Settings UX Considerations

This section addresses the downstream consumer's specific focus on settings UX, format flexibility, error handling, and date handling quirks.

### Settings UX

- **Token field placement:** Put the API token field first and prominently. If blank, every command run fails — make the gap obvious.
- **Token masking:** Use `type="password"` equivalent (Obsidian's `addText` with masked input or a toggle). Prevents shoulder-surfing, aligns with security expectations.
- **Format toggle:** Radio buttons or a dropdown between "Table" and "Plain text". When "Table" is selected, gray out the delimiter field. This avoids "why does delimiter do nothing?" confusion.
- **Column list:** Checkboxes for on/off. If ordering is added, use draggable rows or up/down buttons. Store as an ordered array of column keys — makes rendering trivial.
- **Validation feedback:** Show a small "Test connection" button near the token field if feasible, or surface a notice on first successful import. Reduces "did I enter this right?" anxiety.

### Format Flexibility

- **Table format:** Standard GFM table with `| col | col |` header and `|---|---|` separator. Obsidian renders this natively.
- **Plain text format:** One entry per line. Columns joined by delimiter. No header row. Users who want headers can add them manually above the inserted block.
- **Both formats** should skip columns that are empty (e.g., no tags → omit tags cell rather than insert blank). This is a UX polish detail — defer to v1.x if needed.

### Error Handling

| Error Condition | User-visible message | Technical notes |
|----------------|---------------------|-----------------|
| No API token configured | "Toggl: No API token set. Configure it in Settings." | Check before API call, not after 401 |
| Invalid/expired token | "Toggl: Authentication failed. Check your API token." | 401 from Toggl API |
| Active note has no date filename | "Toggl: Active note filename is not a date (expected yyyy-mm-dd)." | Regex check on basename |
| No active note open | "Toggl: No active note." | `getActiveFile()` returns null |
| No entries for the date | "Toggl: No entries found for [date]." | Empty array response — not an error, but communicate it |
| Network failure / timeout | "Toggl: Network error. Check your connection." | Catch fetch errors |
| Toggl API rate limit (429) | "Toggl: Rate limited. Try again in a moment." | Rare for personal use but handle gracefully |

### Date Handling Quirks

- **Toggl API date range:** Toggl's `/time_entries` endpoint takes `start_date` and `end_date` as ISO 8601 strings. To fetch a full day, use `start_date=yyyy-mm-ddT00:00:00+HH:MM` and `end_date=yyyy-mm-ddT23:59:59+HH:MM` in local timezone — **not UTC** — otherwise entries near midnight get cut off or duplicated across days.
- **UTC → local conversion:** Toggl stores and returns `start` and `stop` in UTC. Convert to local using `new Date(utcString).toLocaleTimeString()` or a timezone-aware approach. The user's system timezone is the correct target — do not introduce a settings field for timezone (adds complexity, gets out of sync with system).
- **Ongoing/running timers:** An active timer has `duration: -1 * unix_start_timestamp` (negative value convention). If a timer is running at import time, either skip it or show it as "in progress" with no end time. Displaying a negative duration confuses users. Recommended: skip running timers in v1, document the behavior.
- **Entries crossing midnight:** If a user runs a timer that crosses midnight, Toggl may split it or include it only on the start date. For a daily note import, filter by the date of `start` in local time, not by whether the entry's duration falls within the day.

---

## Sources

- Obsidian Plugin API documentation (training knowledge, through Aug 2025) — MEDIUM confidence
- Toggl Track API v9 documentation (training knowledge, through Aug 2025) — MEDIUM confidence
- Obsidian community plugin patterns observed across ecosystem (training knowledge) — MEDIUM confidence
- PROJECT.md requirements for this project — HIGH confidence (primary source)
- External search unavailable during this session; community plugin registry not surveyed directly

---
*Feature research for: Obsidian Toggl Track import plugin*
*Researched: 2026-04-09*
