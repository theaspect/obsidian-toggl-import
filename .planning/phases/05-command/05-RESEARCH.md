# Phase 5: Command - Research

**Researched:** 2026-04-12
**Domain:** Obsidian Plugin API — command registration, editor callbacks, error handling integration
**Confidence:** HIGH

## Summary

Phase 5 is a pure integration phase: wire `fetchTimeEntries` and `formatEntries` into a single command handler in `main.ts`. No new libraries are needed; no new modules are needed. All decisions are fully locked in CONTEXT.md (D-01 through D-07). The implementation is a single `this.addCommand({ ... })` call with an `editorCallback` that performs sequential guards followed by fetch, format, and insert.

The codebase is in excellent shape: all upstream modules (`api.ts`, `formatter.ts`, `settings.ts`) are complete and tested. 40 unit tests pass. The `main.ts` has a `// Phase 5: register import command` placeholder at the exact insertion point. The test infrastructure (vitest 4.1.4, `tests/` directory) is established and just needs a `tests/command.test.ts` to cover the command logic.

**Primary recommendation:** Implement the command body directly in `main.ts`. Add imports for `fetchTimeEntries` and `formatEntries` at top of file. Replace the placeholder comment with `this.addCommand(...)`. Write tests by mocking `fetchTimeEntries`, `formatEntries`, and `new Notice`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (REIMP-01):** Always insert at cursor — no sentinel block, no deduplication. `editor.replaceSelection(formattedBlock + '\n')`. Nothing is ever replaced.
- **D-02 (Insertion Padding):** Append one trailing `\n` after the formatted block. Formatter output has no trailing newline.
- **D-03 (Success Feedback):** `new Notice('Imported N entries')` on success, where N is the actual entry count.
- **D-04 (Empty Token Guard):** Check `plugin.settings.apiToken === ''` before any API call. Show `new Notice('Configure your Toggl API token in Settings → Toggl Import first.')` and return.
- **D-05 (Error Handling):** `try/catch` around `fetchTimeEntries()`. Pass `error.message` directly to `new Notice(error.message)`.
- **D-06 (Empty Entries):** `formatEntries()` returns `""` for empty input. Check for this and show `new Notice('No entries found for this date.')` — no insert.
- **D-07 (Date Parsing):** Read from `app.workspace.getActiveFile()?.basename`. Validate against `/^\d{4}-\d{2}-\d{2}$/`. On failure: `new Notice('Active note filename is not a valid date (expected yyyy-mm-dd).')` and return.
- **Command registration:** `this.addCommand({ id: 'import-toggl-entries', name: 'Import Toggl Entries', editorCallback: ... })` using `editorCallback`.

### Claude's Discretion

- Whether to use `editorCallback` or `checkCallback` — `editorCallback` preferred.
- Exact `Notice` display duration — Obsidian default is fine.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMD-01 | Plugin registers "Import Toggl Entries" command in command palette | `this.addCommand({ id, name, editorCallback })` — standard Obsidian API [VERIFIED: codebase pattern in settings.ts] |
| CMD-02 | Command reads active note filename as date (yyyy-mm-dd) | `app.workspace.getActiveFile()?.basename` + regex validation [VERIFIED: CONTEXT.md D-07] |
| CMD-03 | Shows error notice if filename is not a valid yyyy-mm-dd date | `new Notice(...)` + return — same pattern as Notice usage elsewhere [VERIFIED: CONTEXT.md D-07] |
| CMD-05 | Shows error notice for API failures | `try/catch` on `fetchTimeEntries`, pass `error.message` to Notice [VERIFIED: CONTEXT.md D-05; api.ts error contract] |
| CMD-06 | Shows notice when no entries exist for that date | `formatEntries` returns `""` for empty input; check and Notice [VERIFIED: formatter.ts line 32, CONTEXT.md D-06] |
| CMD-07 | Fetched entries inserted at cursor position | `editor.replaceSelection(text + '\n')` [VERIFIED: CONTEXT.md code_context] |
| REIMP-01 | Running command on a note with existing data appends rather than replaces | Insert-only via `replaceSelection` — trivially satisfied [VERIFIED: CONTEXT.md D-01] |
</phase_requirements>

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| obsidian | latest | `Plugin`, `Editor`, `Notice`, `TFile` API types | [VERIFIED: package.json] |
| TypeScript | 6.0.2 | Plugin language | [VERIFIED: package.json] |
| vitest | ^4.1.4 | Test runner | [VERIFIED: package.json, tests pass] |

**No new dependencies required.** Phase 5 uses only APIs that are already imported and exercised in the project.

**Installation:** None — all dependencies present.

## Architecture Patterns

### Command Registration Pattern (Obsidian API)

```typescript
// Source: Obsidian Plugin API — editorCallback pattern
// [VERIFIED: CONTEXT.md canonical_refs + established settings.ts pattern]
this.addCommand({
    id: 'import-toggl-entries',
    name: 'Import Toggl Entries',
    editorCallback: async (editor: Editor) => {
        // handler body
    },
});
```

`editorCallback` differs from `callback` in that Obsidian only enables the command when an editor is active. This means `app.workspace.getActiveFile()` is guaranteed to return a non-null `TFile` when the callback fires — no extra null check for the file object itself, though `?.basename` is still idiomatic.

### Guard-Chain Pattern (locked by D-04, D-07, D-05, D-06)

The command handler follows a strict guard-chain — each guard returns early on failure, keeping the happy path at the bottom:

```typescript
// [VERIFIED: CONTEXT.md specifics section — order prescribed]
// (1) Empty token guard
if (this.settings.apiToken === '') {
    new Notice('Configure your Toggl API token in Settings → Toggl Import first.');
    return;
}

// (2) Date validation
const file = this.app.workspace.getActiveFile();
const basename = file?.basename ?? '';
if (!/^\d{4}-\d{2}-\d{2}$/.test(basename)) {
    new Notice('Active note filename is not a valid date (expected yyyy-mm-dd).');
    return;
}

// (3) Fetch
let entries: TimeEntry[];
try {
    entries = await fetchTimeEntries(this, basename);
} catch (err: unknown) {
    new Notice(err instanceof Error ? err.message : 'Toggl API error: unknown error');
    return;
}

// (4) Format + empty check
const formatted = formatEntries(entries, this.settings);
if (formatted === '') {
    new Notice('No entries found for this date.');
    return;
}

// (5) Insert + success notice
editor.replaceSelection(formatted + '\n');
new Notice(`Imported ${entries.length} entries`);
```

### Import Additions to main.ts

```typescript
// Add to existing imports at top of src/main.ts
import { Plugin, Editor, Notice, TFile } from 'obsidian';
import { fetchTimeEntries, TimeEntry } from './api';
import { formatEntries } from './formatter';
```

Note: `Editor`, `Notice`, and `TFile` are not currently imported in `main.ts` — they must be added. `TFile` is needed only if type-asserting the file; with `?.basename` it may not be needed explicitly. `Editor` is required for the `editorCallback` parameter type.

### Anti-Patterns to Avoid

- **Casting `err` directly:** `(err as Error).message` is unsafe if something throws a non-Error. Use `err instanceof Error ? err.message : String(err)`.
- **Using `checkCallback` instead of `editorCallback`:** `checkCallback` requires manually checking `app.workspace.getActiveEditor()` — more boilerplate with no benefit.
- **Placing the success Notice before `replaceSelection`:** The notice fires even if `replaceSelection` throws. Order: insert first, notice second.
- **Not importing `Editor` from obsidian:** TypeScript will error on the `editorCallback` parameter type without it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Command registration | Custom event system | `this.addCommand()` | Obsidian manages palette, keyboard shortcuts, lifecycle |
| Editor insertion | `editor.setValue()` / DOM manipulation | `editor.replaceSelection()` | Handles cursor, selection state, undo history correctly |
| User notifications | Custom modal or DOM toast | `new Notice()` | Obsidian's built-in notification system, correct lifecycle |
| File basename access | DOM query or vault traversal | `app.workspace.getActiveFile()?.basename` | Already resolved, null-safe |

## Common Pitfalls

### Pitfall 1: Missing Editor Import
**What goes wrong:** TypeScript error `Cannot find name 'Editor'` in the editorCallback parameter.
**Why it happens:** `main.ts` currently only imports `Plugin` from `obsidian`; `Editor` and `Notice` are not in scope.
**How to avoid:** Add `Editor, Notice` to the `obsidian` import line before writing the command body.
**Warning signs:** Any TS error referencing `Editor` type on the editorCallback parameter.

### Pitfall 2: err.message Without instanceof Check
**What goes wrong:** Runtime crash if `fetchTimeEntries` somehow rejects with a non-Error value.
**Why it happens:** TypeScript `useUnknownInCatchVariables: true` (set in tsconfig) means `err` is typed as `unknown` in catch blocks, making `err.message` a type error.
**How to avoid:** Use `err instanceof Error ? err.message : 'Toggl API error: unknown error'`.
**Warning signs:** TypeScript error `Object is of type 'unknown'` in the catch block.

### Pitfall 3: Test Mocking Notice
**What goes wrong:** `new Notice(...)` throws in the vitest environment because it references Obsidian DOM APIs.
**Why it happens:** vitest runs in Node environment; `Notice` is not defined there.
**How to avoid:** Mock `obsidian` in command tests the same way `api.test.ts` mocks it — add `Notice` to the `vi.mock('obsidian', ...)` factory.
**Warning signs:** `Notice is not a constructor` or `ReferenceError: Notice is not defined` in test output.

### Pitfall 4: editorCallback Not async
**What goes wrong:** `fetchTimeEntries` is async; if `editorCallback` is not declared `async`, `await` cannot be used.
**Why it happens:** Forgetting `async` on the arrow function.
**How to avoid:** `editorCallback: async (editor: Editor) => { ... }`.
**Warning signs:** TypeScript error `'await' expressions are only allowed within async functions`.

### Pitfall 5: Date Regex Too Permissive
**What goes wrong:** A file named `9999-99-99` passes the regex but is not a real date.
**Why it happens:** `/^\d{4}-\d{2}-\d{2}$/` validates format, not calendar validity.
**How to avoid:** This is acceptable per CONTEXT.md D-07 — the decision explicitly uses this regex and the Toggl API will simply return no entries for an impossible date. Do not add calendar validation; it is out of scope.
**Warning signs:** N/A — this is a known acceptable trade-off.

## Code Examples

### Complete Command Handler (integration reference)

```typescript
// Source: synthesized from CONTEXT.md decisions D-01 through D-07
// [VERIFIED: all decisions confirmed against existing api.ts and formatter.ts contracts]

import { Plugin, Editor, Notice } from 'obsidian';
import { fetchTimeEntries, TimeEntry } from './api';
import { formatEntries } from './formatter';

// Inside onload():
this.addCommand({
    id: 'import-toggl-entries',
    name: 'Import Toggl Entries',
    editorCallback: async (editor: Editor) => {
        // D-04: Empty token guard
        if (this.settings.apiToken === '') {
            new Notice('Configure your Toggl API token in Settings → Toggl Import first.');
            return;
        }

        // D-07: Date validation (editorCallback guarantees active file exists)
        const basename = this.app.workspace.getActiveFile()?.basename ?? '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(basename)) {
            new Notice('Active note filename is not a valid date (expected yyyy-mm-dd).');
            return;
        }

        // D-05: Fetch with error handling
        let entries: TimeEntry[];
        try {
            entries = await fetchTimeEntries(this, basename);
        } catch (err: unknown) {
            new Notice(err instanceof Error ? err.message : 'Toggl API error: unknown error');
            return;
        }

        // D-06: Empty entries check
        const formatted = formatEntries(entries, this.settings);
        if (formatted === '') {
            new Notice('No entries found for this date.');
            return;
        }

        // D-01/D-02/D-03: Insert at cursor + trailing newline + success notice
        editor.replaceSelection(formatted + '\n');
        new Notice(`Imported ${entries.length} entries`);
    },
});
```

### Test File Pattern (command.test.ts)

```typescript
// Pattern derived from established api.test.ts mock approach
// [VERIFIED: existing tests use vi.hoisted + vi.mock for obsidian module]

const { mockNotice, mockFetchTimeEntries, mockFormatEntries } = vi.hoisted(() => ({
    mockNotice: vi.fn(),
    mockFetchTimeEntries: vi.fn(),
    mockFormatEntries: vi.fn(),
}));

vi.mock('obsidian', () => ({
    Plugin: class {},
    Notice: mockNotice,
    // ... other obsidian exports used by main.ts
}));

vi.mock('../src/api', () => ({ fetchTimeEntries: mockFetchTimeEntries }));
vi.mock('../src/formatter', () => ({ formatEntries: mockFormatEntries }));
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMD-01 | `addCommand` is called in `onload` with correct id/name | unit | `npm test` | ❌ Wave 0 |
| CMD-02 | Reads `getActiveFile()?.basename` as date | unit | `npm test` | ❌ Wave 0 |
| CMD-03 | Non-date filename shows error notice, no API call | unit | `npm test` | ❌ Wave 0 |
| CMD-05 | API errors surface `error.message` via Notice | unit | `npm test` | ❌ Wave 0 |
| CMD-06 | Empty entries shows "No entries found" notice | unit | `npm test` | ❌ Wave 0 |
| CMD-07 | `editor.replaceSelection` called with formatted text + `\n` | unit | `npm test` | ❌ Wave 0 |
| REIMP-01 | `replaceSelection` appends (insert-only, no replace) | unit (same as CMD-07) | `npm test` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** All 40 existing tests + new command tests green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/command.test.ts` — covers CMD-01 through CMD-07 and REIMP-01
  - Requires mocking: `obsidian` (Notice, Plugin, Editor), `../src/api` (fetchTimeEntries), `../src/formatter` (formatEntries)
  - Mock `app.workspace.getActiveFile()` to return `{ basename: '2024-06-15' }` or `null`
  - Mock `editor.replaceSelection` as `vi.fn()`

No framework install needed — vitest already configured.

## Environment Availability

Step 2.6: SKIPPED — Phase 5 is a pure code change in an existing TypeScript project. No external services, databases, or CLI tools beyond the already-verified Node/npm environment are required.

## Security Domain

`security_enforcement` is not set to false in config.json — including this section.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | API token handling is in Phase 3 (api.ts) — already implemented |
| V3 Session Management | No | Stateless command — no session |
| V4 Access Control | No | Single-user plugin, no multi-user surface |
| V5 Input Validation | Yes | Date basename validated against `/^\d{4}-\d{2}-\d{2}$/` before use |
| V6 Cryptography | No | No crypto operations in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Filename injection (malicious basename used as API param) | Tampering | Regex guard `/^\d{4}-\d{2}-\d{2}$/` enforced before any API call (D-07) |
| Empty token producing 401 with confusing message | Info disclosure | Empty token caught before network call (D-04) |
| API token leaking in error Notice | Info disclosure | `api.ts` error contract never includes token in message (verified in api.test.ts) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `editorCallback` guarantees `getActiveFile()` returns non-null | Architecture Patterns | Would need explicit null check before basename access; low risk since the guard `?? ''` already handles it |

All other claims verified against: existing source files, CONTEXT.md decisions, package.json, passing test suite.

## Open Questions

None — all decisions locked in CONTEXT.md. Implementation is fully specified.

## Sources

### Primary (HIGH confidence)

- `src/main.ts` — existing plugin structure, `// Phase 5:` placeholder location [VERIFIED: read directly]
- `src/api.ts` — `fetchTimeEntries` signature, error message contract [VERIFIED: read directly]
- `src/formatter.ts` — `formatEntries` signature, empty-string contract [VERIFIED: read directly]
- `tests/api.test.ts` — mock pattern for `obsidian` module [VERIFIED: read directly]
- `.planning/phases/05-command/05-CONTEXT.md` — all locked decisions D-01 through D-07 [VERIFIED: read directly]
- `package.json` — installed dependencies confirmed [VERIFIED: read directly]
- `vitest.config.ts` — test configuration confirmed [VERIFIED: read directly]
- `npm test` run — 40 tests pass, infrastructure confirmed [VERIFIED: executed]

### Secondary (MEDIUM confidence)

- Obsidian `editorCallback` behavior (only fires when editor active) — [ASSUMED: consistent with training knowledge of Obsidian Plugin API; not re-verified via docs this session]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — fully confirmed from package.json and existing source
- Architecture: HIGH — implementation fully specified in CONTEXT.md; patterns confirmed from existing code
- Pitfalls: HIGH — derived directly from TypeScript config (`useUnknownInCatchVariables: true` in tsconfig) and test environment constraints observed in existing tests
- Test patterns: HIGH — copied from established `api.test.ts` mock approach

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable Obsidian Plugin API, no churn expected)
