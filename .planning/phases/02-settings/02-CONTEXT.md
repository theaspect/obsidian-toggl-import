# Phase 2: Settings - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can configure all plugin options — API token, output format, columns, and delimiter — and those settings persist across Obsidian restarts. This phase delivers the settings UI only; the API client, formatter, and import command are separate phases.

</domain>

<decisions>
## Implementation Decisions

### File Structure
- **D-01:** Settings tab lives in `src/settings.ts` as a `TogglImportSettingTab extends PluginSettingTab` class — not inline in `main.ts`. Phase 1 already left a `// Phase 2: register settings tab` comment in `onload()`.
- **D-02:** `main.ts` is updated to import `TogglImportSettingTab` and call `this.addSettingTab(new TogglImportSettingTab(this.app, this))` in `onload()`.

### API Token Field
- **D-03:** Token input is **masked** (HTML `input type="password"`) — protects against shoulder-surfing in the settings panel.
- **D-04:** Warning about `data.json` plaintext storage (SET-02) displayed as `setDesc()` text inline under the token field — no separate row needed, visible within the field's own description area.

### Format Selection
- **D-05:** Output format rendered as a dropdown (`Setting.addDropdown()`) with options "Markdown table" → `"table"` and "Plain text" → `"plaintext"`. Matches the `outputFormat: 'table' | 'plaintext'` type in `TogglImportSettings`.

### Delimiter Field
- **D-06:** Delimiter field is **conditional** — only rendered when `outputFormat === 'plaintext'`. When the user changes format to "table", the delimiter row is hidden (re-render the settings container on change). When "plain text" is selected, the delimiter field appears below the format selector.

### Column Toggles
- **D-07:** Five individual `Setting.addToggle()` items under a "Columns" section header — one per column: Description, Start time, Duration, Tags, Project. Labels use human-readable names matching the keys in `TogglImportSettings.columns`. No ordering UI in Phase 2 (drag-and-drop is v2, COL-01).

### Claude's Discretion
- Exact section header text and divider placement
- Whether to use `containerEl.createEl('h3', ...)` or a disabled `Setting` for section headers
- Error feedback if token field is empty (warn or silent — Phase 5 handles actual validation)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Settings — SET-01 through SET-05 (all 5 settings requirements are in scope for this phase)

### Existing Code
- `src/main.ts` — `TogglImportSettings` interface and `DEFAULT_SETTINGS` constant that the settings tab reads/writes; `onload()` stub comment for settings tab registration

### Roadmap
- `.planning/ROADMAP.md` §Phase 2 — Success criteria: 5 testable conditions for this phase

No external specs — requirements fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main.ts` exports `TogglImportSettings` (interface) and `DEFAULT_SETTINGS` — settings tab imports these directly
- `src/main.ts` exports `TogglImportPlugin` (default) — settings tab constructor receives plugin instance as `plugin: TogglImportPlugin` for calling `plugin.saveSettings()`

### Established Patterns
- `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` merge pattern in `loadSettings()` — new fields added to `DEFAULT_SETTINGS` automatically get defaults without breaking existing installs
- Tabs for indentation (Obsidian plugin convention, used in `src/main.ts`)
- `import { Plugin } from 'obsidian'` — settings tab will use `import { App, PluginSettingTab, Setting } from 'obsidian'`

### Integration Points
- `main.ts` `onload()` must call `this.addSettingTab(...)` — this is the only change to `main.ts` in Phase 2
- Settings tab saves via `this.plugin.saveSettings()` — already implemented in `main.ts`
- `this.plugin.settings` is the live settings object — mutate directly, then call `saveSettings()`

</code_context>

<specifics>
## Specific Ideas

- Delimiter field uses conditional rendering: on format dropdown change, call `display()` (or the equivalent re-render) to show/hide the delimiter row — this is the standard Obsidian pattern for conditional settings
- Token input masked via `inputEl.type = 'password'` after `Setting.addText()` returns the component

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-settings*
*Context gathered: 2026-04-10*
