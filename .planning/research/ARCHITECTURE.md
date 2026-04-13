# Architecture Research

**Domain:** Obsidian community plugin — external API integration with configurable text formatting
**Researched:** 2026-04-09
**Confidence:** MEDIUM (training data; web tools unavailable for live verification. Obsidian plugin API has been stable since v1.0; core patterns unlikely to have changed.)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       Obsidian Runtime                            │
│  (manages plugin lifecycle, exposes App/Vault/Editor/Workspace)   │
├──────────────────────────────────────────────────────────────────┤
│                     TogglImportPlugin (main.ts)                   │
│   extends Plugin — entry point, owns settings, registers hooks    │
│                                                                   │
│   ┌──────────────────┐      ┌────────────────────────────────┐   │
│   │  SettingsManager  │      │        CommandHandler           │   │
│   │  (load/save data) │      │  (addCommand → importEntries)  │   │
│   └────────┬─────────┘      └──────────────┬─────────────────┘   │
│            │                               │                     │
│   ┌────────▼─────────┐      ┌──────────────▼─────────────────┐   │
│   │  TogglSettingTab  │      │         TogglApiClient          │   │
│   │  (UI in Settings) │      │  (requestUrl → Toggl API v9)   │   │
│   └──────────────────┘      └──────────────┬─────────────────┘   │
│                                            │                     │
│                             ┌──────────────▼─────────────────┐   │
│                             │         EntryFormatter          │   │
│                             │  (table or delimited plain text) │  │
│                             └──────────────┬─────────────────┘   │
│                                            │                     │
│                             ┌──────────────▼─────────────────┐   │
│                             │         NoteEditor              │   │
│                             │  (reads filename, inserts text)  │  │
│                             └────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                            │
                              ┌─────────────▼────────────┐
                              │   Toggl Track API v9       │
                              │  GET /me/time_entries      │
                              │  Basic Auth (token:        │
                              │  "api_token")              │
                              └───────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `TogglImportPlugin` (main.ts) | Lifecycle entry point. Calls `loadSettings`, registers the command and settings tab in `onload`, saves settings in `onunload`. | Extends Obsidian `Plugin` class |
| `SettingsManager` | Load/save plugin data via `this.loadData()` / `this.saveData()`. Owns the `PluginSettings` interface. | Plain functions or a thin class, called from `Plugin` |
| `TogglSettingTab` | Renders the settings UI (API token, format, columns, delimiter). Calls `plugin.saveSettings()` on change. | Extends Obsidian `PluginSettingTab` |
| `TogglApiClient` | Constructs and fires HTTP requests to Toggl API v9. Handles auth header, UTC date range construction, response parsing. | Standalone class or module; uses `requestUrl` |
| `EntryFormatter` | Transforms `TogglTimeEntry[]` into a formatted string (markdown table or delimited plain text) given column config. | Pure function or stateless class — no Obsidian imports needed |
| `NoteEditor` | Extracts yyyy-mm-dd from the active file's basename, inserts formatted string at cursor position. | Module of thin helpers over `editor.replaceRange` / `editor.getCursor` |

---

## Recommended Project Structure

```
/
├── main.ts               # Plugin entry point — TogglImportPlugin class
├── settings.ts           # PluginSettings interface + TogglSettingTab class + load/save helpers
├── toggl-client.ts       # TogglApiClient — HTTP calls to Toggl API v9
├── formatter.ts          # EntryFormatter — pure formatting logic (table / delimited)
├── editor.ts             # NoteEditor helpers — date extraction, cursor insertion
├── types.ts              # Shared TypeScript types (TogglTimeEntry, PluginSettings, etc.)
├── manifest.json         # Obsidian plugin manifest (id, name, version, minAppVersion)
├── package.json
├── tsconfig.json
└── esbuild.config.mjs    # Build script (esbuild is the community standard bundler)
```

### Structure Rationale

- **main.ts only:** The Plugin class should be thin — delegate everything to the modules above. This makes each module independently testable.
- **settings.ts combined:** Settings interface, defaults, load/save helpers, and the SettingTab class share tight coupling; keeping them together reduces cross-file imports.
- **formatter.ts pure:** Zero Obsidian imports. This makes it the easiest module to unit-test without a mock environment.
- **types.ts separate:** Toggl API response shapes and internal types shared across modules without circular deps.
- **No src/ subdirectory:** The Obsidian plugin sample repo places files at root. Matches community conventions and the default esbuild config.

---

## Architectural Patterns

### Pattern 1: Thin Plugin Class (Delegation Pattern)

**What:** `TogglImportPlugin.onload()` does only three things — load settings, register command, register settings tab — then delegates everything else to specialist modules.

**When to use:** Always. The Plugin class is the Obsidian lifecycle anchor, not a business logic host.

**Trade-offs:** Slightly more files, but each module is independently testable and replaceable.

**Example:**
```typescript
export default class TogglImportPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: 'import-toggl-entries',
      name: 'Import Toggl Entries',
      editorCallback: (editor, view) => importTogglEntries(editor, view, this),
    });
    this.addSettingTab(new TogglSettingTab(this.app, this));
  }

  async onunload() {
    // No cleanup needed for this plugin; no persistent listeners
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

### Pattern 2: requestUrl for All External HTTP

**What:** Use Obsidian's built-in `requestUrl` (from `obsidian` package) instead of `fetch` or Node's `http` for all outbound HTTP.

**When to use:** Any call leaving the Obsidian process — required for desktop (Electron) compatibility and to avoid CORS issues in the renderer process.

**Trade-offs:** `requestUrl` is synchronous-style async, returns `RequestUrlResponse` (not a standard `Response`). Must read `.json`, `.text`, `.arrayBuffer` directly on the response object, not via `.json()` method. Less familiar but more reliable cross-platform.

**Example:**
```typescript
import { requestUrl } from 'obsidian';

export async function fetchTimeEntries(
  apiToken: string,
  startIso: string,
  endIso: string
): Promise<TogglTimeEntry[]> {
  const credentials = btoa(`${apiToken}:api_token`);
  const response = await requestUrl({
    url: `https://api.track.toggl.com/api/v9/me/time_entries?start_date=${startIso}&end_date=${endIso}`,
    method: 'GET',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  });
  // response.json is already parsed — no await needed
  return response.json as TogglTimeEntry[];
}
```

### Pattern 3: Pure Formatter Function

**What:** Keep formatting logic in a pure function that accepts entries + config and returns a string. No side effects, no Obsidian API imports.

**When to use:** Whenever the output is a deterministic transformation of input — ideal for table/delimiter formatting.

**Trade-offs:** Very easy to test with plain Jest/Vitest. Can't access Obsidian state, which is the desired constraint.

**Example:**
```typescript
// formatter.ts — zero obsidian imports
export function formatEntries(
  entries: TogglTimeEntry[],
  config: FormatConfig
): string {
  if (config.format === 'table') return formatAsTable(entries, config.columns);
  return formatAsDelimited(entries, config.columns, config.delimiter);
}
```

### Pattern 4: editorCallback for Cursor-Aware Commands

**What:** Register commands with `editorCallback` (not `callback`) when the command needs access to the active editor and cursor.

**When to use:** Any command that reads/writes the note content. `editorCallback` receives `(editor: Editor, view: MarkdownView)` directly, and Obsidian only enables the command when an editor is active.

**Trade-offs:** Command is automatically disabled in non-editor contexts (no active file open). This is the correct behavior for this plugin.

**Example:**
```typescript
this.addCommand({
  id: 'import-toggl-entries',
  name: 'Import Toggl Entries',
  editorCallback: async (editor: Editor, view: MarkdownView) => {
    const dateStr = view.file?.basename; // e.g. "2026-04-09"
    // ... fetch, format, insert
    const cursor = editor.getCursor();
    editor.replaceRange(formattedText, cursor);
  },
});
```

---

## Data Flow

### Command Execution Flow

```
User triggers "Import Toggl Entries" command
    │
    ▼
editorCallback(editor, view) — TogglImportPlugin
    │
    ├── Extract date from view.file.basename  (NoteEditor)
    │       yyyy-mm-dd → UTC start/end ISO strings
    │
    ├── requestUrl(Toggl API v9 /me/time_entries)  (TogglApiClient)
    │       Basic Auth header built from settings.apiToken
    │       Response: TogglTimeEntry[] (UTC timestamps)
    │
    ├── Convert UTC times to local timezone  (TogglApiClient / types)
    │
    ├── formatEntries(entries, { format, columns, delimiter })  (EntryFormatter)
    │       → Markdown table string  OR  delimited plain text string
    │
    └── editor.replaceRange(formattedText, editor.getCursor())  (NoteEditor)
            Inserts at cursor; does not replace existing content
```

### Settings Flow

```
User opens Settings → Obsidian Plugin Settings panel
    │
    ▼
TogglSettingTab.display() renders UI controls
    │
    ├── API token field  → settings.apiToken
    ├── Format selector  → settings.format ('table' | 'plain')
    ├── Column picker    → settings.columns (ordered string[])
    └── Delimiter field  → settings.delimiter
    │
    ▼ (on any change)
plugin.saveSettings() → this.saveData(this.settings)
    Persisted to Obsidian's data.json in .obsidian/plugins/obsidian-toggl-import/
```

### Key Data Transformations

1. **Filename → UTC date range:** `view.file.basename` ("2026-04-09") → `start_date=2026-04-09T00:00:00+00:00` & `end_date=2026-04-09T23:59:59+00:00`. Must account for local timezone offset to capture the full calendar day in UTC.
2. **Toggl API response → TogglTimeEntry[]:** Raw JSON array from `/me/time_entries` filtered to the target date, keeping only needed fields (description, start, duration, tags, project_id).
3. **project_id → project name:** Toggl's time entries return numeric project IDs. A second API call to `/me/projects` (or `/workspaces/{id}/projects`) resolves names. This is an optional enrichment step.
4. **TogglTimeEntry[] → formatted string:** Pure transformation in `EntryFormatter`. Duration is seconds (integer) from Toggl; convert to HH:MM before display.

---

## Obsidian Lifecycle Reference

| Hook / Method | When it fires | What to do here |
|---------------|---------------|-----------------|
| `onload()` | Plugin enabled or Obsidian starts | `loadSettings()`, `addCommand()`, `addSettingTab()`, register any event listeners |
| `onunload()` | Plugin disabled or Obsidian quits | Clean up custom event listeners, close modals. Obsidian auto-cleans commands/tabs/ribbons. |
| `loadData()` | Called inside `onload` | Returns saved JSON from data.json; merge with DEFAULT_SETTINGS |
| `saveData()` | Called after any settings change | Serializes current settings to data.json |
| `addCommand({ id, name, editorCallback })` | Called in `onload` | Registers a palette command; `editorCallback` auto-disables when no editor open |
| `addSettingTab(tab)` | Called in `onload` | Registers the settings panel; `display()` called when user opens it |
| `PluginSettingTab.display()` | User opens plugin settings | Render settings UI using `new Setting(containerEl)` |

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Toggl Track API v9 | `requestUrl` with Basic Auth header | Token stored in `settings.apiToken` (plaintext in data.json — acceptable for local personal use). Base URL: `https://api.track.toggl.com/api/v9`. |
| Obsidian Vault (note content) | `editor.replaceRange` / `editor.getCursor` | Do not use `vault.modify` — `editor` API is the right surface for cursor-aware insertion |
| Obsidian Settings storage | `this.loadData()` / `this.saveData()` | Stores JSON in `.obsidian/plugins/{plugin-id}/data.json` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Plugin ↔ SettingsManager | Direct method calls (`loadSettings`, `saveSettings`) | Settings object (`this.settings`) lives on the Plugin instance; passed by reference to modules that need it |
| Plugin ↔ TogglApiClient | Function call, passes `apiToken` and date strings | Client is stateless; no need to instantiate a class unless mocking in tests |
| Plugin ↔ EntryFormatter | Function call, passes entries and format config | No Obsidian types cross this boundary — enables isolated unit testing |
| TogglApiClient ↔ Toggl API | `requestUrl` (HTTP) | Only outbound network call in the plugin |
| EntryFormatter ↔ NoteEditor | String hand-off | Formatter returns a string; NoteEditor inserts it — clean boundary |

---

## Build Order (Phase Dependencies)

The component dependency graph determines the correct build sequence:

```
types.ts          (no deps — build first)
     ↓
settings.ts       (depends on types)
formatter.ts      (depends on types — can build in parallel with settings)
     ↓
toggl-client.ts   (depends on types; uses requestUrl from obsidian)
editor.ts         (depends on types; uses Editor/MarkdownView from obsidian)
     ↓
main.ts           (assembles everything — build last)
TogglSettingTab   (depends on settings.ts — wire up after settings data model exists)
```

**Recommended build sequence:**

1. **types.ts + manifest.json** — Define `TogglTimeEntry`, `PluginSettings`, `FormatConfig`. No logic, just shapes. Entire project unblocked once this exists.
2. **settings.ts (data model + load/save)** — `DEFAULT_SETTINGS`, `loadSettings`, `saveSettings`. Enables the plugin skeleton to run.
3. **formatter.ts** — Pure function, no Obsidian dependency. Testable in isolation before any Obsidian wiring exists.
4. **toggl-client.ts** — Requires `PluginSettings` type and `requestUrl`. Can be manually tested against real Toggl API.
5. **editor.ts** — Date extraction from filename + cursor insertion. Requires Obsidian Editor types.
6. **main.ts** — Wire all modules; register command and settings tab.
7. **TogglSettingTab in settings.ts** — Add Settings UI last; it depends on all settings fields being finalized.

---

## Anti-Patterns

### Anti-Pattern 1: Using fetch() Instead of requestUrl

**What people do:** Call `fetch('https://api.track.toggl.com/...')` because it's standard Web API.

**Why it's wrong:** Obsidian runs in Electron's renderer process. `fetch` is subject to CORS restrictions that `requestUrl` bypasses by routing through Electron's main process. On desktop, `fetch` to external APIs will fail with CORS errors unless the remote server sets permissive CORS headers (Toggl does not for all endpoints).

**Do this instead:** Always use `requestUrl` from the `obsidian` package for external HTTP calls.

---

### Anti-Pattern 2: Putting Business Logic in main.ts

**What people do:** Write the entire `importEntries` workflow inside `editorCallback` in `main.ts`.

**Why it's wrong:** main.ts becomes untestable, unmaintainable, and hard to read. All Toggl-specific and formatting logic is mixed with Obsidian lifecycle code.

**Do this instead:** `editorCallback` calls `importTogglEntries(editor, view, plugin)`, which in turn delegates to `TogglApiClient` and `EntryFormatter`. main.ts stays under ~80 lines.

---

### Anti-Pattern 3: Storing Sensitive Data via vault.create/modify

**What people do:** Write API tokens or config to a markdown file in the vault.

**Why it's wrong:** Files in the vault are synced (Obsidian Sync, iCloud, Git) and visible to other plugins. Tokens appear in plaintext in synced files.

**Do this instead:** Use `this.saveData()` / `this.loadData()`. Data lands in `.obsidian/plugins/{id}/data.json`, which is local only and not vault-synced by default. Document in README that data.json is excluded from vault sync.

---

### Anti-Pattern 4: Using vault.modify for Cursor-Position Insertion

**What people do:** Read the full note, splice in the new text at a found position, then call `vault.modify(file, newContent)`.

**Why it's wrong:** `vault.modify` replaces the entire file, destroys undo history, and ignores the cursor position the user set. It also races with the editor state.

**Do this instead:** Use `editor.replaceRange(text, editor.getCursor())` to insert at the exact cursor. The Editor API is the correct surface for live-editor manipulation.

---

### Anti-Pattern 5: Hardcoding UTC Without Timezone Handling

**What people do:** Send `start_date=2026-04-09T00:00:00Z` and assume that captures all entries for April 9.

**Why it's wrong:** Toggl stores entry `start` times in UTC. A user in UTC+10 who logs entries at 9 AM local time has a UTC timestamp of 11 PM the *previous* day. Naive UTC range queries miss those entries.

**Do this instead:** Compute the UTC range that covers the full local calendar day. Use `new Date(dateStr + 'T00:00:00').toISOString()` (which uses local timezone) and `T23:59:59` end, or explicitly compute the UTC offset.

---

## Scaling Considerations

This plugin is a single-user personal tool. Traditional "scale" does not apply. The relevant concern is **entry volume per day**.

| Concern | Typical personal use | Edge case |
|---------|---------------------|-----------|
| API response size | 5–30 entries/day — trivial | 200+ entries/day (e.g., automated tracking) — still a single API response, no pagination needed |
| Formatting performance | Negligible for <500 entries | Pure string operations; no concern at any realistic volume |
| Settings complexity | Fixed set of fields | Adding new columns later is additive — format config is an array, so extensible without refactor |
| Toggl API rate limits | 1 req/command invocation — far below limits | Toggl v9 rate limit is ~1 req/second per token; single-command plugin cannot hit this |

---

## Sources

- Obsidian Plugin Developer Docs: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin (unavailable during research — referenced from training knowledge, HIGH confidence for stable API surface)
- Obsidian TypeScript API Reference: https://docs.obsidian.md/Reference/TypeScript+API/requestUrl (unavailable during research — `requestUrl` behavior is well-established community knowledge)
- Obsidian Sample Plugin (official): https://github.com/obsidianmd/obsidian-sample-plugin (canonical structure reference)
- Toggl Track API v9 docs: https://engineering.toggl.com/docs/api/time_entries (endpoint and auth patterns per PROJECT.md context)
- Training knowledge confidence: MEDIUM — Obsidian plugin API has been stable since v1.0 (2023). Core lifecycle hooks (`onload`, `onunload`, `addCommand`, `addSettingTab`, `requestUrl`) are unchanged as of knowledge cutoff August 2025. Verify `requestUrl` signature against current `obsidian` npm package before implementation.

---
*Architecture research for: Obsidian plugin with external API integration and configurable formatting*
*Researched: 2026-04-09*
