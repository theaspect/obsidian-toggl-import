# Phase 8: Security - Research

**Researched:** 2026-04-14
**Domain:** Obsidian Plugin API — localStorage storage, SecretStorage, settings-tab button pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Add a "Test connection" button to the settings tab, positioned immediately after the API token field
- **D-02:** On click: call `togglGet()` (reuse existing helper from `api.ts`) against `GET /me`; show a Notice with the result
- **D-03:** Success notice: `"Connected as [fullname]"` — use the `fullname` field from the `/me` response
- **D-04:** Failure notices mirror existing api.ts error messages: `"Toggl API error: invalid API token (401)"`, `"Toggl API error: network request failed"`, etc.
- **D-05:** Button is disabled (greyed out) while the request is in flight; re-enabled after response
- **D-06:** API token is stored via `Plugin.loadLocalStorage('toggl-api-token')` / `Plugin.saveLocalStorage('toggl-api-token', value)` — device-local, not included in Obsidian Sync
- **D-07:** `apiToken` is removed from `TogglImportSettings` interface and from `data.json` storage entirely
- **D-08:** Plugin exposes `async getApiToken(): Promise<string>` method that reads from localStorage — used by `api.ts` and the settings tab
- **D-09:** No migration path — no existing tokens to preserve; users re-enter their token after upgrading
- **D-10:** Token field description updated to: `"Stored locally on this device — not synced to Obsidian Sync"`
- **D-11:** `fetchTimeEntries` and `togglGet` receive the token string as a parameter; `fetchTimeEntries` calls `await plugin.getApiToken()` instead of reading `plugin.settings.apiToken`
- **D-12:** Empty-token guard in `main.ts` updated to call `await this.getApiToken()` and check for empty string

### Claude's Discretion

- Button loading state implementation detail (CSS class, spinner vs text change)
- Exact placement within the Setting row (addButton vs standalone Setting)
- localStorage key name convention (use `'toggl-api-token'` as established in D-06)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | User can test their Toggl API token from the settings tab and see a clear success or failure notice | D-01 through D-05 define the button; `togglGet()` in `api.ts` is already callable with a token string. Pattern: `addButton` on a `Setting` row, async handler with in-flight disable, `new Notice(...)` for result. |
| SEC-02 | API token is stored in Obsidian localStorage instead of plaintext plugin data | `Plugin.loadLocalStorage` / `Plugin.saveLocalStorage` confirmed present in installed obsidian@1.12.3 (since 1.8.7). `apiToken` removed from `TogglImportSettings` interface. `getApiToken()` async wrapper on plugin. |
</phase_requirements>

---

## Summary

Phase 8 is a focused refactor with two deliverables. SEC-01 adds a "Test connection" button to the settings tab that calls the existing `togglGet()` helper against `GET /me` and surfaces a success or error notice. SEC-02 moves the API token from `data.json` (plaintext, Obsidian Sync-included) to device-local `localStorage` via the built-in `Plugin.loadLocalStorage` / `Plugin.saveLocalStorage` pair, and removes `apiToken` from the `TogglImportSettings` interface entirely.

Both API surfaces (`loadLocalStorage`, `saveLocalStorage`) are confirmed present in the installed `obsidian@1.12.3` type declarations (available since Obsidian 1.8.7). The methods are synchronous — `getApiToken()` wraps them in an `async` function as a future-proofing convention, which is correct. No migration of existing tokens is required (D-09). The three existing call sites (`main.ts:45`, `api.ts:71`, and both test files) need updating to go through `plugin.getApiToken()`.

The key TypeScript implication: removing `apiToken` from `TogglImportSettings` will cause a compile-time error anywhere the field is still referenced. Tests use a mock that sets `plugin.settings.apiToken` directly; those mocks must be updated to stub `getApiToken` as a `vi.fn()` returning a resolved promise.

**Primary recommendation:** Implement in order — (1) add `getApiToken()` to `main.ts` and remove `apiToken` from the interface, (2) update `api.ts` and the empty-token guard, (3) update test mocks, (4) add the button to `settings.ts` with the in-flight disable pattern.

---

## Standard Stack

### Core (all already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| obsidian (npm) | 1.12.3 (installed) | Plugin API — `loadLocalStorage`, `saveLocalStorage`, `Setting.addButton`, `Notice` | The only supported API surface for Obsidian plugins. [VERIFIED: node_modules/obsidian/obsidian.d.ts] |
| TypeScript | 6.0.2 (installed) | Type checking — catches removed `apiToken` references at compile time | Required by project; strict mode enforced. [VERIFIED: package.json] |
| vitest | ^4.1.4 (installed) | Test framework — `vi.fn()` stubs for `getApiToken` | Already used; no new tooling needed. [VERIFIED: package.json] |

### No New Dependencies

This phase requires zero new npm packages. All needed API surfaces (`loadLocalStorage`, `saveLocalStorage`, `Setting.addButton`, `Notice`, `togglGet`) are either already installed or already present in the codebase.

---

## Architecture Patterns

### localStorage API — Confirmed Signatures

Both methods are **synchronous** and live on the `App` object (not `Plugin`).

```typescript
// Source: node_modules/obsidian/obsidian.d.ts, lines 472 and 480
// Available since Obsidian 1.8.7 [VERIFIED]

// Read — returns the stored value or null
loadLocalStorage(key: string): any | null;

// Write — pass null to clear the entry
saveLocalStorage(key: string, data: unknown | null): void;
```

Because the methods are synchronous, `getApiToken()` being `async` is a forward-compatible wrapper, not a requirement. The async signature is correct per D-08 regardless.

### getApiToken() Implementation Pattern

```typescript
// In main.ts — new method on TogglImportPlugin
async getApiToken(): Promise<string> {
    return this.app.loadLocalStorage('toggl-api-token') ?? '';
}
```

And the setter used in the settings tab onChange handler:

```typescript
// In settings.ts — replaces: this.plugin.settings.apiToken = value; await this.plugin.saveSettings();
this.plugin.app.saveLocalStorage('toggl-api-token', value);
```

Note: `loadLocalStorage` / `saveLocalStorage` are on `this.app` (the `App` instance), not directly on `this` (the `Plugin`). The CONTEXT.md references them as `Plugin.loadLocalStorage` which is the class that owns them via inheritance from `App`'s API exposure — verified in the type declarations that these are on the App object at lines 472/480.

**IMPORTANT verification:** The type declarations show `loadLocalStorage` and `saveLocalStorage` are defined in the block that also contains `lastEvent`, `renderContext`, `secretStorage`, and `isDarkMode()` — this is the `App` class, not `Plugin`. Access is `this.app.loadLocalStorage(...)` from a `PluginSettingTab` or `this.app.loadLocalStorage(...)` from inside the Plugin via `this.app`.

### SecretStorage — Available but NOT chosen

`SecretStorage` is present in the installed obsidian@1.12.3 (since 1.11.4), but D-06 explicitly chose `localStorage` instead. Do not use `SecretStorage` — this is a locked decision.

```typescript
// Available but OUT OF SCOPE per D-06:
// this.app.secretStorage.setSecret(id, value)  // synchronous, since 1.11.4
// this.app.secretStorage.getSecret(id)          // returns string | null
// ID must be lowercase alphanumeric with optional dashes
```

### Test Connection Button Pattern

The Obsidian `Setting` API supports chaining `addButton` after `addText`. The CONTEXT.md notes that `addButton` on a `Setting` row OR a standalone `Setting` are both acceptable (Claude's Discretion). The simplest approach is a separate `Setting` row with just a button:

```typescript
// Pattern: standalone Setting row with one button
// Source: Obsidian Plugin API patterns [VERIFIED: obsidian.d.ts]
let testBtn: ButtonComponent;
new Setting(containerEl)
    .setName('Test connection')
    .addButton(btn => {
        testBtn = btn;
        btn.setButtonText('Test')
            .onClick(async () => {
                btn.setDisabled(true);
                btn.setButtonText('Testing...');
                try {
                    const token = this.plugin.app.loadLocalStorage('toggl-api-token') ?? '';
                    const me = await togglGet<{ fullname: string }>(`${BASE}/me`, token);
                    new Notice(`Connected as ${me.fullname}`);
                } catch (err: unknown) {
                    new Notice(err instanceof Error ? err.message : 'Toggl API error: unknown error');
                } finally {
                    btn.setDisabled(false);
                    btn.setButtonText('Test');
                }
            });
    });
```

The `setDisabled(true)` call on `ButtonComponent` is the standard Obsidian approach for the in-flight disable state (D-05). Text change from "Test" → "Testing..." satisfies the loading state discretion area.

### Updating the Settings Tab Token Field

The current `onChange` handler writes to `this.plugin.settings.apiToken` and calls `saveSettings()`. After SEC-02, it must write to localStorage instead:

```typescript
// BEFORE (current settings.ts lines 22-24):
.onChange(async (value) => {
    this.plugin.settings.apiToken = value;
    await this.plugin.saveSettings();
})

// AFTER:
.onChange((value) => {
    this.plugin.app.saveLocalStorage('toggl-api-token', value);
})
```

The initial `setValue` call must also read from localStorage:

```typescript
// BEFORE:
.setValue(this.plugin.settings.apiToken)

// AFTER:
.setValue(this.plugin.app.loadLocalStorage('toggl-api-token') ?? '')
```

### Removing apiToken from TogglImportSettings

```typescript
// BEFORE (main.ts lines 6-18):
export interface TogglImportSettings {
    apiToken: string;   // <-- REMOVE
    outputFormat: 'table' | 'plaintext';
    // ...
}

export const DEFAULT_SETTINGS: TogglImportSettings = {
    apiToken: '',       // <-- REMOVE
    // ...
}
```

TypeScript strict mode will surface every reference to `settings.apiToken` as a compile error after removal — this is the desired behavior. Fix each error site.

### Updating api.ts

```typescript
// BEFORE (api.ts line 71):
const token = plugin.settings.apiToken;

// AFTER:
const token = await plugin.getApiToken();
```

The function signature of `fetchTimeEntries` does not need to change — it already receives `plugin: TogglImportPlugin`.

### Updating the Empty-Token Guard in main.ts

```typescript
// BEFORE (main.ts lines 44-48):
if (this.settings.apiToken === '') {
    new Notice('Configure your Toggl API token in Settings → Toggl Import first.');
    return;
}

// AFTER:
const token = await this.getApiToken();
if (token === '') {
    new Notice('Configure your Toggl API token in Settings → Toggl Import first.');
    return;
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Device-local key-value storage | Custom file-based storage | `app.loadLocalStorage` / `app.saveLocalStorage` | Built-in, vault-scoped, excluded from Obsidian Sync by design. [VERIFIED] |
| In-flight button disable | CSS opacity hacks | `ButtonComponent.setDisabled(true)` | Native Obsidian API, correct accessibility semantics. [VERIFIED: obsidian.d.ts] |
| Token test call | New HTTP wrapper | `togglGet()` already in `api.ts` | Function already accepts `(url, token)` — no new code needed. [VERIFIED: src/api.ts:10] |

---

## Common Pitfalls

### Pitfall 1: Calling loadLocalStorage/saveLocalStorage on `this` instead of `this.app`

**What goes wrong:** TypeScript error — `loadLocalStorage` does not exist on `Plugin` directly; it's on `App`.
**Why it happens:** CONTEXT.md describes them as "Plugin.loadLocalStorage" (class context), but the methods are accessed via `this.app` from within `main.ts` and via `this.plugin.app` from within `settings.ts`.
**How to avoid:** Always use `this.app.loadLocalStorage(key)` in `main.ts` and `this.plugin.app.loadLocalStorage(key)` in `settings.ts`. The `getApiToken()` helper on the plugin encapsulates this correctly.
**Warning signs:** Compile error `Property 'loadLocalStorage' does not exist on type 'TogglImportPlugin'`.

### Pitfall 2: Making getApiToken() synchronous

**What goes wrong:** If a future Obsidian version makes localStorage async, all callers break without a function signature change (a major refactor).
**Why it happens:** Both methods are currently synchronous so the `async` keyword seems unnecessary.
**How to avoid:** Keep `getApiToken()` as `async` per D-08. The cost is negligible (microtask overhead) and the interface is stable.

### Pitfall 3: Forgetting to update both test files

**What goes wrong:** `tests/api.test.ts` and `tests/command.test.ts` both mock `plugin.settings.apiToken`. After removing the field, tests fail at the mock-setup level, not the assertion level — confusing error messages.
**Why it happens:** The mock plugin factory in `api.test.ts` (line 16-27) sets `settings.apiToken`; `command.test.ts` sets `plugin.settings.apiToken` directly (line 51).
**How to avoid:** Update `createMockPlugin` to omit `apiToken` from settings and add `getApiToken: vi.fn().mockResolvedValue('test-token-abc123')` to the returned object. In `command.test.ts`, replace `plugin.settings.apiToken = 'token'` with `plugin.getApiToken = vi.fn().mockResolvedValue('token')`.

### Pitfall 4: Re-entrancy on the Test button

**What goes wrong:** User clicks Test twice quickly — two `/me` calls in flight, both re-enable the button independently. UX is jarring.
**Why it happens:** The `finally` block re-enables without checking whether another click is pending.
**How to avoid:** `setDisabled(true)` prevents a second click from registering because a disabled button does not fire click events. The pattern is correct as long as `setDisabled(true)` is the first line in the handler.

### Pitfall 5: loadSettings merging stale data.json apiToken back in

**What goes wrong:** If a user's `data.json` happens to have an `apiToken` field from before this phase, `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` would attempt to merge it — but since `apiToken` is no longer in `DEFAULT_SETTINGS` or the interface, TypeScript won't catch this at runtime; the field just silently appears on the object.
**Why it happens:** `loadData()` returns raw `any`.
**How to avoid:** In `loadSettings()`, after the `Object.assign`, explicitly `delete (this.settings as any).apiToken` to sanitize any legacy data. Then call `saveSettings()` to write the cleaned object back. Per D-09 there is no migration, but this silent cleanup prevents data leakage if an old token is still sitting in data.json.

---

## Code Examples

### Full getApiToken() in main.ts

```typescript
// Source: verified against obsidian.d.ts loadLocalStorage signature
async getApiToken(): Promise<string> {
    return (this.app.loadLocalStorage('toggl-api-token') as string | null) ?? '';
}
```

### Updated createMockPlugin in api.test.ts

```typescript
// Tests must stub getApiToken — not settings.apiToken
function createMockPlugin(overrides: Partial<{ token: string; workspaceId: number }> = {}) {
    return {
        settings: {
            outputFormat: 'table' as const,
            columns: { description: true, startTime: true, duration: true, tags: false, project: false },
            delimiter: '|',
            workspaceId: overrides.workspaceId ?? 42,
        },
        getApiToken: vi.fn().mockResolvedValue(overrides.token ?? 'test-token-abc123'),
        saveSettings: vi.fn().mockResolvedValue(undefined),
    } as any;
}
```

### Empty-token guard test stub in command.test.ts

```typescript
// Replace: plugin.settings.apiToken = '';
// With:
plugin.getApiToken = vi.fn().mockResolvedValue('');
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.4 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Test button calls `/me` and shows success notice | unit | `npm test -- tests/settings.test.ts` | Wave 0 gap |
| SEC-01 | Test button shows error notice on API failure | unit | `npm test -- tests/settings.test.ts` | Wave 0 gap |
| SEC-01 | Test button disabled during request | unit | `npm test -- tests/settings.test.ts` | Wave 0 gap |
| SEC-02 | getApiToken() reads from localStorage | unit | `npm test -- tests/main.test.ts` | Wave 0 gap |
| SEC-02 | saveSettings no longer writes apiToken to data.json | unit | `npm test -- tests/main.test.ts` | Wave 0 gap |
| SEC-02 | api.ts calls getApiToken() not settings.apiToken | unit | `npm test -- tests/api.test.ts` | Update existing |
| SEC-02 | command guard calls getApiToken() | unit | `npm test -- tests/command.test.ts` | Update existing |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/settings.test.ts` — new file covering SEC-01 button behavior (success, failure, in-flight disable)
- [ ] `tests/main.test.ts` — new file covering `getApiToken()` and the cleaned `loadSettings()` (no apiToken in output)
- [ ] Update `tests/api.test.ts` — `createMockPlugin` removes `apiToken`, adds `getApiToken` stub
- [ ] Update `tests/command.test.ts` — remove `plugin.settings.apiToken = ''` usages, replace with `getApiToken` stubs

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Token stored in device-local localStorage, not Obsidian Sync |
| V3 Session Management | no | No session — stateless API token auth |
| V4 Access Control | no | Single-user desktop plugin |
| V5 Input Validation | yes | Token field is password-type input; no server-side validation needed for this client |
| V6 Cryptography | no | localStorage is not encrypted, but is excluded from Sync — accepted per D-06 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token in Obsidian Sync (cloud exposure) | Information Disclosure | localStorage exclusion from Sync per design |
| Token in data.json (plaintext file) | Information Disclosure | Remove apiToken from TogglImportSettings; D-07 |
| Token leakage in error messages | Information Disclosure | Existing `api.ts` error messages confirmed to not include token (test: "does not include API token in error messages") |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `loadLocalStorage`/`saveLocalStorage` are on `this.app` (App), not directly on `this` (Plugin) in plugin code | Architecture Patterns | TypeScript compile error — easily caught and fixed |
| A2 | `ButtonComponent.setDisabled()` prevents click events from firing when disabled | Don't Hand-Roll / Pitfall 4 | Double-submission possible — would need a boolean guard variable instead |

---

## Open Questions

1. **minAppVersion in manifest.json**
   - What we know: Current `manifest.json` has `"minAppVersion": "1.0.0"`. `loadLocalStorage`/`saveLocalStorage` require Obsidian 1.8.7 (verified from type declarations).
   - What's unclear: Whether to bump `minAppVersion` to `"1.8.7"` in this phase.
   - Recommendation: Yes — bump `minAppVersion` to `"1.8.7"` to accurately reflect the API surface being used. Obsidian 1.8.7 was released in late 2024; community plugin reviewers check this field.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 8 is a pure code refactor with no new external tools, services, or CLI dependencies. All required APIs are in the already-installed `obsidian@1.12.3` package.

---

## Sources

### Primary (HIGH confidence)

- `C:/Work/obsidian-toggl/node_modules/obsidian/obsidian.d.ts` — verified `loadLocalStorage(key): any | null` (line 472), `saveLocalStorage(key, data): void` (line 480), both since 1.8.7; `SecretStorage` class since 1.11.4 (lines 5463–5491); `secretStorage: SecretStorage` on App since 1.11.4 (line 458)
- `C:/Work/obsidian-toggl/src/api.ts` — verified `togglGet<T>(url, token)` signature (line 10); current `plugin.settings.apiToken` usage (line 71)
- `C:/Work/obsidian-toggl/src/main.ts` — verified `TogglImportSettings` interface with `apiToken` (line 7); empty-token guard (line 45); `loadSettings` pattern (lines 82–89)
- `C:/Work/obsidian-toggl/src/settings.ts` — verified current token field implementation (lines 16–27)
- `C:/Work/obsidian-toggl/tests/api.test.ts` — verified `createMockPlugin` sets `settings.apiToken` (line 20); mock structure to update
- `C:/Work/obsidian-toggl/tests/command.test.ts` — verified `plugin.settings.apiToken` assignments at lines 51, 136

### Secondary (MEDIUM confidence)

- None required — all claims verified from installed source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are installed; API signatures verified from type declarations
- Architecture: HIGH — confirmed from obsidian.d.ts + existing codebase patterns
- Pitfalls: HIGH (runtime behavior of disabled buttons) / MEDIUM (A2 — setDisabled prevents clicks, assumed from standard HTML button semantics)

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (obsidian package pinned to "latest" — re-verify if obsidian is upgraded)
