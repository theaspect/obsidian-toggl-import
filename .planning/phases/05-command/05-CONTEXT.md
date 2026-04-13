# Phase 5: Command - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

The "Import Toggl Entries" command is registered, reads the active note's filename as a date, fetches time entries via the API client, formats them via the formatter, and inserts the result at the cursor. This phase wires together the existing modules (api.ts, formatter.ts) and handles all error and edge cases. No new modules needed — Phase 5 lives in `main.ts`.

</domain>

<decisions>
## Implementation Decisions

### Re-import Behavior (REIMP-01)
- **D-01:** Always insert at cursor — no sentinel block, no deduplication logic. The user controls placement by positioning their cursor before running the command. Satisfies REIMP-01 trivially: nothing is ever replaced because the command only ever inserts. Zero state or marker overhead.

### Insertion Padding
- **D-02:** Append one trailing `\n` after the formatted block. Prevents the inserted block from running into subsequent text and leaves the cursor naturally positioned after the insert. The formatter output itself has no trailing newline, so this single `\n` is the only addition.

### Success Feedback
- **D-03:** Show `new Notice('Imported N entries')` on success. Provides confirmation when running from a keyboard shortcut without watching the note, and tells the user how many entries were found.

### Empty Token Guard
- **D-04:** Before making any API call, check `plugin.settings.apiToken === ''`. If blank, show: `new Notice('Configure your Toggl API token in Settings → Toggl Import first.')` and return immediately. Avoids a network round-trip and gives a more actionable message than a 401.

### Error Handling (carrying forward from Phase 3)
- **D-05:** Wrap `fetchTimeEntries()` in `try/catch`. Pass `error.message` directly to `new Notice(error.message)`. API client already formats the messages (D-04 from Phase 3 context): 401 → `'Toggl API error: invalid API token (401)'`, 429 → rate limit, other → `'Toggl API error: {status}'`, network → `'Toggl API error: network request failed'`.

### Empty Entries Handling (carrying forward from Phase 4)
- **D-06:** `formatEntries()` returns `""` when entries is empty (D-02 from Phase 4 context). Phase 5 checks for this and shows: `new Notice('No entries found for this date.')` — satisfies CMD-06. No insert is performed.

### Date Parsing (CMD-02, CMD-03)
- **D-07:** Read date from `app.workspace.getActiveFile()?.basename`. Validate against `/^\d{4}-\d{2}-\d{2}$/`. If invalid or no active file: `new Notice('Active note filename is not a valid date (expected yyyy-mm-dd).')` and return — no API call made.

### Claude's Discretion
- Command registration: `this.addCommand({ id: 'import-toggl-entries', name: 'Import Toggl Entries', editorCallback: ... })` using `editorCallback` so the command is only available when an editor is active
- Whether to use `editorCallback` or `checkCallback` — `editorCallback` preferred (handles editor availability automatically)
- Exact `Notice` display duration (Obsidian default is fine)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Import Command — CMD-01, CMD-02, CMD-03, CMD-05, CMD-06, CMD-07
- `.planning/REQUIREMENTS.md` §Re-import — REIMP-01

### Existing Code
- `src/main.ts` — `TogglImportPlugin`, `TogglImportSettings`, `DEFAULT_SETTINGS`; `onload()` stub comment `// Phase 5: register import command`
- `src/api.ts` — `fetchTimeEntries(plugin, date): Promise<TimeEntry[]>` — the function to call; error contract: throws `Error` with human-readable messages
- `src/formatter.ts` — `formatEntries(entries, settings): string` — returns `""` for empty entries; returns formatted string otherwise

### Roadmap
- `.planning/ROADMAP.md` §Phase 5 — Success criteria: 6 testable conditions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/api.ts` `fetchTimeEntries(plugin, date)` — call directly with `this` (plugin instance) and the parsed date string
- `src/formatter.ts` `formatEntries(entries, plugin.settings)` — call directly; returns empty string on no entries
- Obsidian `Editor` API (available via `editorCallback`): `editor.replaceSelection(text)` inserts at cursor

### Established Patterns
- `new Notice('...')` — all error/status messages use this; already established in Obsidian plugin pattern
- `app.workspace.getActiveFile()` returns `TFile | null` — null-check required before accessing `.basename`
- `editorCallback: (editor: Editor) => { ... }` — gives direct editor access without extra workspace traversal

### Integration Points
- `main.ts` `onload()`: replace `// Phase 5: register import command` with `this.addCommand({ ... })`
- `fetchTimeEntries` and `formatEntries` are imported at top of `main.ts`
- `editor.replaceSelection(formattedBlock + '\n')` performs the cursor insert (D-02)

</code_context>

<specifics>
## Specific Ideas

- `editorCallback` is the right callback type: it's only enabled when an editor is open, so `app.workspace.getActiveFile()` will always return a file when the callback fires
- Order of checks in the command: (1) empty token guard → (2) date validation → (3) fetch → (4) format + empty check → (5) insert + success notice
- `editor.replaceSelection('')` on an empty selection is effectively `editor.getCursor()` position — use `editor.replaceSelection(text + '\n')` for insert-at-cursor

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-command*
*Context gathered: 2026-04-12*
