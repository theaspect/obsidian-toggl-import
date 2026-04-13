# Phase 2: Settings - Research

**Researched:** 2026-04-10
**Domain:** Obsidian Plugin Settings API (`PluginSettingTab`, `Setting`)
**Confidence:** HIGH

## Summary

Phase 2 implements the plugin settings UI. All decisions are locked in CONTEXT.md — the Obsidian Plugin API for settings is straightforward and well-defined. The `PluginSettingTab` abstract class is extended, its `display()` method renders UI with `Setting` components, and state is saved via the plugin's existing `saveSettings()` method.

The main technical nuance is the conditional delimiter field: when the format dropdown changes to `"table"`, the delimiter row must disappear; when it changes to `"plaintext"`, it reappears. The standard pattern for this in Obsidian plugins is to clear `containerEl` and call `this.display()` again (a full re-render on change). This is verified against the actual obsidian.d.ts types in the installed package.

The `Setting` class API is fully verified from the installed `obsidian@1.12.3` types. No external libraries are needed — everything required (`App`, `PluginSettingTab`, `Setting`) is in the `obsidian` npm package already installed.

**Primary recommendation:** Implement `TogglImportSettingTab` in `src/settings.ts` using the verified `Setting` API, with full re-render on format change for conditional delimiter display.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Settings tab lives in `src/settings.ts` as a `TogglImportSettingTab extends PluginSettingTab` class — not inline in `main.ts`. Phase 1 already left a `// Phase 2: register settings tab` comment in `onload()`.
- **D-02:** `main.ts` is updated to import `TogglImportSettingTab` and call `this.addSettingTab(new TogglImportSettingTab(this.app, this))` in `onload()`.
- **D-03:** Token input is **masked** (HTML `input type="password"`) — protects against shoulder-surfing in the settings panel.
- **D-04:** Warning about `data.json` plaintext storage (SET-02) displayed as `setDesc()` text inline under the token field — no separate row needed, visible within the field's own description area.
- **D-05:** Output format rendered as a dropdown (`Setting.addDropdown()`) with options "Markdown table" → `"table"` and "Plain text" → `"plaintext"`. Matches the `outputFormat: 'table' | 'plaintext'` type in `TogglImportSettings`.
- **D-06:** Delimiter field is **conditional** — only rendered when `outputFormat === 'plaintext'`. When the user changes format to "table", the delimiter row is hidden (re-render the settings container on change). When "plain text" is selected, the delimiter field appears below the format selector.
- **D-07:** Five individual `Setting.addToggle()` items under a "Columns" section header — one per column: Description, Start time, Duration, Tags, Project. Labels use human-readable names matching the keys in `TogglImportSettings.columns`. No ordering UI in Phase 2 (drag-and-drop is v2, COL-01).

### Claude's Discretion

- Exact section header text and divider placement
- Whether to use `containerEl.createEl('h3', ...)` or a disabled `Setting` for section headers
- Error feedback if token field is empty (warn or silent — Phase 5 handles actual validation)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SET-01 | User can enter a Toggl API token in plugin settings | `Setting.addText()` with `inputEl.type = 'password'`; `onChange` mutates `plugin.settings.apiToken` then calls `saveSettings()` |
| SET-02 | Settings display a warning that the API token is stored in `data.json` (included in Obsidian Sync) | `Setting.setDesc()` accepts plain string; place warning text as the description of the token field (D-04) |
| SET-03 | User can select output format: Markdown table or plain text | `Setting.addDropdown()` with `addOption('table', 'Markdown table')` and `addOption('plaintext', 'Plain text')`; `onChange` triggers full re-render for conditional delimiter |
| SET-04 | User can select which columns to include: description, start time, duration, tags, project (any combination) | Five `Setting.addToggle()` items under a Columns heading; each mutates `plugin.settings.columns.<key>` and calls `saveSettings()` |
| SET-05 | User can set a custom delimiter for plain text format (default: pipe `\|`) | `Setting.addText()` only rendered when `outputFormat === 'plaintext'`; default from `DEFAULT_SETTINGS.delimiter` already set to `'|'` |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| obsidian | 1.12.3 (installed) | `PluginSettingTab`, `Setting`, `App` | Only supported API for Obsidian plugins; all settings UI goes through this package |
| TypeScript | 6.0.2 (installed) | Type-safe plugin code | Required by project; strict null checks catch API misuse |

[VERIFIED: npm registry — `npm view obsidian version` returned `1.12.3`]
[VERIFIED: package.json — typescript 6.0.2 installed]

### Supporting

No additional libraries needed. The Obsidian API provides all required UI components:
- `Setting.addText()` for token and delimiter inputs
- `Setting.addDropdown()` for format selection
- `Setting.addToggle()` for column checkboxes
- `Setting.setHeading()` for section headers
- `Setting.setDesc()` for warning text

[VERIFIED: obsidian.d.ts in node_modules]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Setting.setHeading()` | `containerEl.createEl('h3', ...)` | Both work; `setHeading()` is the official API since 0.9.16 and matches Obsidian's native styling without raw DOM manipulation. |
| Full re-render (`display()`) for conditional | DOM show/hide via CSS | Full re-render is simpler and the documented community pattern; DOM manipulation is fragile if element refs are lost. |

**Installation:** Nothing to install — `obsidian` package already present.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main.ts          # Plugin entrypoint — add settings tab registration here (D-02)
└── settings.ts      # TogglImportSettingTab class — new file this phase (D-01)
```

### Pattern 1: PluginSettingTab class skeleton

**What:** Extend `PluginSettingTab`, implement `display()`, clear on re-render.

**When to use:** Every time settings need to be re-rendered (initial open, format change triggers conditional show/hide).

```typescript
// Source: obsidian.d.ts PluginSettingTab + SettingTab definitions (local node_modules)
import { App, PluginSettingTab, Setting } from 'obsidian';
import TogglImportPlugin from './main';

export class TogglImportSettingTab extends PluginSettingTab {
	plugin: TogglImportPlugin;

	constructor(app: App, plugin: TogglImportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();  // Required at top of display() to avoid duplicate rendering
		// ... render settings
	}
}
```

[VERIFIED: obsidian.d.ts — `SettingTab.containerEl: HTMLElement`, `PluginSettingTab` constructor signature `(app: App, plugin: Plugin)`]

### Pattern 2: Masked text input (API token)

**What:** Use `Setting.addText()`, then access the returned component's `inputEl` to change `type` to `"password"`.

**When to use:** Any sensitive field that should not be visible by default.

```typescript
// Source: obsidian.d.ts AbstractTextComponent.inputEl + TextComponent
new Setting(containerEl)
	.setName('API token')
	.setDesc('Your Toggl Track API token. Warning: stored in plain text in data.json — included in Obsidian Sync.')
	.addText(text => text
		.setPlaceholder('Enter your API token')
		.setValue(this.plugin.settings.apiToken)
		.onChange(async (value) => {
			this.plugin.settings.apiToken = value;
			await this.plugin.saveSettings();
		})
		.then(component => {
			component.inputEl.type = 'password';
		})
	);
```

[VERIFIED: obsidian.d.ts — `AbstractTextComponent.inputEl: T` (HTMLInputElement for TextComponent); `Setting.then(cb)` returns `this` for chaining, `since 0.9.20`]

### Pattern 3: Dropdown with conditional re-render

**What:** `addDropdown()` onChange calls `this.display()` to re-render the tab; delimiter field only rendered inside an `if` block.

**When to use:** Any setting whose value controls the visibility of other settings.

```typescript
// Source: obsidian.d.ts DropdownComponent.addOption(), .onChange()
new Setting(containerEl)
	.setName('Output format')
	.addDropdown(drop => drop
		.addOption('table', 'Markdown table')
		.addOption('plaintext', 'Plain text')
		.setValue(this.plugin.settings.outputFormat)
		.onChange(async (value: 'table' | 'plaintext') => {
			this.plugin.settings.outputFormat = value;
			await this.plugin.saveSettings();
			this.display();  // Re-render to show/hide delimiter field
		})
	);

// Conditional delimiter — only rendered when plaintext selected
if (this.plugin.settings.outputFormat === 'plaintext') {
	new Setting(containerEl)
		.setName('Delimiter')
		.addText(text => text
			.setValue(this.plugin.settings.delimiter)
			.onChange(async (value) => {
				this.plugin.settings.delimiter = value;
				await this.plugin.saveSettings();
			})
		);
}
```

[VERIFIED: obsidian.d.ts — `DropdownComponent.addOption(value, display)`, `.setValue()`, `.onChange(callback)`]

### Pattern 4: Section heading

**What:** `new Setting(containerEl).setName('Columns').setHeading()` — renders a styled section header without a control.

**When to use:** Grouping related settings visually. `setHeading()` is preferred over raw `createEl` as it uses Obsidian's native heading style.

```typescript
// Source: obsidian.d.ts Setting.setHeading() since 0.9.16
new Setting(containerEl).setName('Columns').setHeading();
```

[VERIFIED: obsidian.d.ts — `Setting.setHeading(): this`, `since 0.9.16`]

### Pattern 5: Toggle for column selection

**What:** `Setting.addToggle()` for each of the five boolean column flags.

```typescript
// Source: obsidian.d.ts ToggleComponent.setValue(), .onChange()
new Setting(containerEl)
	.setName('Description')
	.addToggle(toggle => toggle
		.setValue(this.plugin.settings.columns.description)
		.onChange(async (value) => {
			this.plugin.settings.columns.description = value;
			await this.plugin.saveSettings();
		})
	);
```

[VERIFIED: obsidian.d.ts — `ToggleComponent.setValue(on: boolean)`, `.onChange(callback: (value: boolean) => any)`]

### Pattern 6: Registering the settings tab in main.ts

**What:** Replace the Phase 2 comment stub with actual registration.

```typescript
// src/main.ts onload() — replaces the "// Phase 2: register settings tab" comment
import { TogglImportSettingTab } from './settings';

// inside onload():
this.addSettingTab(new TogglImportSettingTab(this.app, this));
```

[VERIFIED: obsidian.d.ts — `Plugin.addSettingTab(settingTab: PluginSettingTab): void`, line 4816; main.ts stub comment confirmed at line 34]

### Anti-Patterns to Avoid

- **Not calling `containerEl.empty()` at the top of `display()`:** Causes duplicate settings to stack on every re-render (e.g., when format changes trigger `this.display()`). Always clear first.
- **Storing a ref to the delimiter `Setting` and toggling `.settingEl.style.display`:** Fragile; `display()` re-render is simpler and the standard pattern.
- **Importing from `obsidian/obsidian` or path imports:** Always import from `'obsidian'` — the package root.
- **Using `createEl('h3')` for section headers instead of `setHeading()`:** Works but bypasses Obsidian's native styling and accessibility attributes. `setHeading()` has been available since 0.9.16, well before `minAppVersion: "1.0.0"`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent settings storage | Custom JSON file I/O | `Plugin.loadData()` / `Plugin.saveData()` | Already implemented in `main.ts`; handles `data.json` location, atomic writes, and Obsidian Sync compatibility |
| Settings UI layout | Raw DOM construction | `Setting` class | Handles label, description, control layout, and Obsidian theme compatibility automatically |
| Password masking | Custom CSS overlay | `inputEl.type = 'password'` | One-line native HTML; browser-native show/hide toggle available on some OS |

---

## Common Pitfalls

### Pitfall 1: TypeScript error on `outputFormat` assignment from dropdown string

**What goes wrong:** `DropdownComponent.onChange` provides a plain `string`, not `'table' | 'plaintext'`. Assigning it directly to `plugin.settings.outputFormat` triggers a TS type error.

**Why it happens:** `onChange(callback: (value: string) => any)` — the callback type is `string`, not the union.

**How to avoid:** Cast in the callback: `async (value) => { this.plugin.settings.outputFormat = value as 'table' | 'plaintext'; ... }`.

**Warning signs:** TypeScript error: `Type 'string' is not assignable to type '"table" | "plaintext"'`.

[VERIFIED: obsidian.d.ts — DropdownComponent.onChange signature confirmed as `(value: string) => any`]

### Pitfall 2: Re-render loop when dropdown onChange triggers display()

**What goes wrong:** If `display()` is called before `saveSettings()` resolves, the settings object may not yet reflect the new value, causing the conditional block to render based on the old format.

**Why it happens:** `saveSettings()` is async; calling `this.display()` synchronously after mutating but before awaiting the save is fine (mutation is synchronous), but ordering matters for clarity.

**How to avoid:** Mutate `this.plugin.settings.outputFormat` first (synchronous), then call `this.display()`, then `await this.plugin.saveSettings()` — or `await saveSettings()` first, then `this.display()`. Either order works; mutation-then-display is most predictable.

### Pitfall 3: Exporting TogglImportPlugin from main.ts

**What goes wrong:** The settings tab imports `TogglImportPlugin` as its type for the `plugin` property. If `main.ts` doesn't export the class (only exports it as `default`), TypeScript can't use it in a named import.

**Why it happens:** `export default class TogglImportPlugin` — default exports need `import TogglImportPlugin from './main'` not `import { TogglImportPlugin } from './main'`.

**How to avoid:** In `settings.ts`, use `import TogglImportPlugin from './main'` (default import). Confirmed: `main.ts` uses `export default class TogglImportPlugin`.

[VERIFIED: src/main.ts line 29 — `export default class TogglImportPlugin extends Plugin`]

### Pitfall 4: `TogglImportSettings` and `DEFAULT_SETTINGS` import paths

**What goes wrong:** Both are named exports from `main.ts`, but `settings.ts` may not need to import them if it only accesses settings through `this.plugin.settings`.

**How to avoid:** `settings.ts` does NOT need to import `TogglImportSettings` or `DEFAULT_SETTINGS` directly. Access settings via `this.plugin.settings` (live object). The type `TogglImportSettings` may be imported for type annotations if needed — it is a named export from `main.ts`.

[VERIFIED: src/main.ts lines 3-14, 16-27 — both are named exports]

---

## Code Examples

Verified patterns from actual obsidian.d.ts (v1.12.3):

### Complete TogglImportSettingTab skeleton

```typescript
// src/settings.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import TogglImportPlugin from './main';

export class TogglImportSettingTab extends PluginSettingTab {
	plugin: TogglImportPlugin;

	constructor(app: App, plugin: TogglImportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// --- API Token ---
		new Setting(containerEl)
			.setName('Toggl API token')
			.setDesc('Stored in plain text in data.json — included in Obsidian Sync.')
			.addText(text => text
				.setPlaceholder('Enter your API token')
				.setValue(this.plugin.settings.apiToken)
				.onChange(async (value) => {
					this.plugin.settings.apiToken = value;
					await this.plugin.saveSettings();
				})
				.then(c => { c.inputEl.type = 'password'; })
			);

		// --- Output Format ---
		new Setting(containerEl)
			.setName('Output format')
			.addDropdown(drop => drop
				.addOption('table', 'Markdown table')
				.addOption('plaintext', 'Plain text')
				.setValue(this.plugin.settings.outputFormat)
				.onChange(async (value) => {
					this.plugin.settings.outputFormat = value as 'table' | 'plaintext';
					this.display();
					await this.plugin.saveSettings();
				})
			);

		// --- Delimiter (conditional) ---
		if (this.plugin.settings.outputFormat === 'plaintext') {
			new Setting(containerEl)
				.setName('Delimiter')
				.setDesc('Character(s) used to separate columns in plain text output.')
				.addText(text => text
					.setValue(this.plugin.settings.delimiter)
					.onChange(async (value) => {
						this.plugin.settings.delimiter = value;
						await this.plugin.saveSettings();
					})
				);
		}

		// --- Columns ---
		new Setting(containerEl).setName('Columns').setHeading();

		const columns: Array<{ key: keyof typeof this.plugin.settings.columns; label: string }> = [
			{ key: 'description', label: 'Description' },
			{ key: 'startTime',   label: 'Start time' },
			{ key: 'duration',    label: 'Duration' },
			{ key: 'tags',        label: 'Tags' },
			{ key: 'project',     label: 'Project' },
		];

		for (const col of columns) {
			new Setting(containerEl)
				.setName(col.label)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.columns[col.key])
					.onChange(async (value) => {
						this.plugin.settings.columns[col.key] = value;
						await this.plugin.saveSettings();
					})
				);
		}
	}
}
```

### Registration in main.ts

```typescript
// src/main.ts — inside onload(), replaces the Phase 2 comment
import { TogglImportSettingTab } from './settings';
// ...
async onload(): Promise<void> {
	await this.loadSettings();
	this.addSettingTab(new TogglImportSettingTab(this.app, this));
	// Phase 5: register import command
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — no test infrastructure exists yet |
| Config file | None |
| Quick run command | `npm run build` (type-check via `tsc --noEmit`) |
| Full suite command | `npm run build` |

No vitest or jest is configured. Per CLAUDE.md: "vitest is the modern standard... if tests are added later, prefer vitest." Phase 2 is a pure UI wiring phase with no extractable pure logic — all behavior is DOM + Obsidian API interaction, which requires a headless Obsidian environment to unit test. Manual verification is appropriate for this phase.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SET-01 | Token input appears in settings tab | manual | — | — |
| SET-02 | Warning text visible under token field | manual | — | — |
| SET-03 | Format dropdown changes outputFormat | manual | — | — |
| SET-04 | Each toggle persists column state | manual | — | — |
| SET-05 | Delimiter field appears/hides with format | manual | — | — |
| (all) | Code compiles without TypeScript errors | build | `npm run build` | ✅ existing |

### Sampling Rate

- **Per task commit:** `npm run build` (type-check)
- **Per wave merge:** `npm run build`
- **Phase gate:** `npm run build` green + manual smoke test of settings UI before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/settings.ts` — new file, all five requirements; created in Wave 1 (not pre-existing)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build (esbuild) | ✓ | (project already building) | — |
| obsidian npm package | Settings API types | ✓ | 1.12.3 | — |
| TypeScript | Type checking | ✓ | 6.0.2 | — |

[VERIFIED: package.json and npm view]

No missing dependencies.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | API token is user-supplied credential, but no auth flow in this phase |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Single-user plugin |
| V5 Input Validation | partial | Token and delimiter are free-form strings; no validation required in this phase (Phase 5 handles token validation) |
| V6 Cryptography | no | Token stored in plain text by design; warning displayed per SET-02 |

### Known Threat Patterns for Obsidian Plugin Settings

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API token leakage via Obsidian Sync | Information Disclosure | Warn user in SET-02 (D-04); `input type="password"` prevents shoulder-surfing |
| XSS via `setDesc()` with user-controlled text | Tampering | `setDesc()` accepts `string | DocumentFragment` — warning text is hardcoded, not user-controlled; no risk here |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Full re-render via `this.display()` is the standard community pattern for conditional settings | Architecture Patterns, Pitfall 2 | If Obsidian has a built-in show/hide API that's preferred, the re-render approach still works but may be less idiomatic |
| A2 | `Setting.then()` chaining works to access `inputEl` after `addText()` | Code Examples | If `then()` callback timing differs, `inputEl.type` assignment could fail silently — fallback: store the component reference in `let` outside the callback |

**Both assumptions are LOW risk**: A1 is the pattern documented in the obsidian-sample-plugin and community plugins. A2 is verified against the `then(cb: (setting: this) => any): this` signature in obsidian.d.ts — `then` is a synchronous chaining helper, not async, so `inputEl` is available when called.

---

## Open Questions

1. **Section header style: `setHeading()` vs `createEl('h3')`**
   - What we know: `setHeading()` is official API (since 0.9.16), verified in obsidian.d.ts. `createEl` is raw DOM manipulation.
   - What's unclear: Which renders more consistently with Obsidian's current theme system (including v1.6+ color themes).
   - Recommendation: Claude's discretion — use `setHeading()` as it's the official API; the planner should default to this.

2. **Empty token field feedback**
   - What we know: CONTEXT.md says "error feedback if token field is empty — warn or silent — Phase 5 handles actual validation."
   - What's unclear: Whether a visual indicator (e.g., red border) is desired vs. no feedback until import is attempted.
   - Recommendation: Silent — no validation in Phase 2. Phase 5 handles token validity checks.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/obsidian/obsidian.d.ts` (v1.12.3) — verified `PluginSettingTab`, `SettingTab`, `Setting`, `TextComponent`, `DropdownComponent`, `ToggleComponent` APIs with line numbers
- `src/main.ts` — verified existing `TogglImportSettings`, `DEFAULT_SETTINGS`, `TogglImportPlugin`, `saveSettings()`, `onload()` stub comment
- `package.json` — verified installed versions (obsidian 1.12.3, TypeScript 6.0.2, esbuild 0.28.0)
- npm registry — `npm view obsidian version` returned `1.12.3` (current)

### Secondary (MEDIUM confidence)
- `.planning/phases/02-settings/02-CONTEXT.md` — all D-01 through D-07 decisions, user-confirmed in discuss session
- `.planning/phases/02-settings/02-DISCUSSION-LOG.md` — confirmation of masked token and conditional delimiter decisions

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed packages verified against npm registry and local node_modules
- Architecture: HIGH — all API signatures verified from installed obsidian.d.ts
- Pitfalls: HIGH — derived from TypeScript types and verified code structure
- Decisions: HIGH — all locked in CONTEXT.md from user discussion session

**Research date:** 2026-04-10
**Valid until:** 2026-06-10 (obsidian API is stable; would only change on major Obsidian version bump)
