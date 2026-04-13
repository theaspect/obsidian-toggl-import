---
phase: 05-command
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/main.ts
  - tests/command.test.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed `src/main.ts` (plugin entry point and command implementation) and `tests/command.test.ts` (command behavior tests). The command logic is well-structured with clear guard ordering (token → date → fetch → format → insert). Test coverage is solid across all happy-path and error-path branches.

Two correctness issues were found in `src/main.ts`: a shallow merge bug in `loadSettings` that will silently drop new column defaults for users upgrading from older versions, and a missing `projectCache` reset on plugin unload that can cause stale project names after workspace changes. One fragile pattern in the test helper may produce misleading failure output.

No security vulnerabilities or data loss risks were identified.

---

## Warnings

### WR-01: `loadSettings` shallow merge silently drops new column defaults on upgrade

**File:** `src/main.ts:83-88`

**Issue:** `Object.assign({}, DEFAULT_SETTINGS, this.settings ?? {}, await this.loadData())` performs a shallow merge. The `columns` sub-object is a nested object. If a user's saved data contains a partial `columns` object (e.g., from an older plugin version that had fewer columns), the saved `columns` entirely replaces `DEFAULT_SETTINGS.columns` rather than merging with it. Any new column key added in a future version (e.g., `billable: false`) would not receive its default value for existing users — it would silently be `undefined`.

**Fix:** Deep-merge the `columns` sub-object explicitly:

```typescript
async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<TogglImportSettings> ?? {};
    this.settings = {
        ...DEFAULT_SETTINGS,
        ...saved,
        columns: {
            ...DEFAULT_SETTINGS.columns,
            ...(saved.columns ?? {}),
        },
    };
}
```

This ensures new column keys always get their default value even when older saved data is present.

---

### WR-02: Module-level `projectCache` in `api.ts` is never reset on plugin unload

**File:** `src/main.ts:80`

**Issue:** `onunload` is a no-op, but `api.ts` holds a module-level `projectCache: Map<number, string> | null` that is populated on the first import and never cleared. If the user changes `workspaceId` in settings (or the plugin resolves a new workspace from `/me`), the cached project names from the previous workspace remain active for the entire Obsidian session. The `_resetProjectCache()` export exists for testing but is never called in production code paths.

**Fix:** Call `_resetProjectCache()` on unload, and also call it whenever `workspaceId` changes in `saveSettings`:

```typescript
// src/main.ts
import { _resetProjectCache } from './api';

onunload(): void {
    _resetProjectCache();
}

async saveSettings(): Promise<void> {
    _resetProjectCache(); // workspace may have changed
    await this.saveData(this.settings);
}
```

---

### WR-03: `loadPluginAndGetCallback` accesses `calls[0][0]` without asserting the call happened

**File:** `tests/command.test.ts:63`

**Issue:** `const spec = mockAddCommand.mock.calls[0][0]` will throw `TypeError: Cannot read properties of undefined (reading '0')` if `onload()` failed silently or if `addCommand` was not called. The error message at that point would be a cryptic undefined-indexing crash rather than a useful test failure. Every test that goes through `loadPluginAndGetCallback` inherits this risk.

**Fix:** Add a guard assertion before accessing the call record:

```typescript
async function loadPluginAndGetCallback() {
    const plugin = new TogglImportPlugin();
    // ... settings setup ...
    await plugin.onload();

    expect(mockAddCommand).toHaveBeenCalledOnce(); // fail clearly if addCommand was not called
    const spec = mockAddCommand.mock.calls[0][0];
    const editor = { replaceSelection: mockReplaceSelection } as any;
    return { plugin, spec, editorCallback: spec.editorCallback, editor };
}
```

---

## Info

### IN-01: `this.settings!` non-null assertion is misleading — field starts as `undefined`

**File:** `src/main.ts:35`

**Issue:** `settings!: TogglImportSettings` uses a definite-assignment assertion, but `loadSettings` handles the case where `this.settings` is `undefined` at runtime via `this.settings ?? {}`. The `!` assertion tells TypeScript the field is always initialized, while the runtime code acknowledges it may not be. This is a minor inconsistency that could confuse future maintainers.

**Fix:** Remove the `!` assertion and use an initializer, or document the pattern explicitly:

```typescript
// Option A: initialized to DEFAULT_SETTINGS, overwritten in onload
settings: TogglImportSettings = { ...DEFAULT_SETTINGS };

// Option B: keep ! but remove the ?? {} fallback in loadSettings (it is unreachable after onload)
```

Option A is clearer and makes the merge order in `loadSettings` simpler (no need for `?? {}`).

---

### IN-02: `CMD-02` test does not assert the plugin instance passed to `fetchTimeEntries`

**File:** `tests/command.test.ts:99`

**Issue:** `expect(mockFetchTimeEntries).toHaveBeenCalledWith(expect.anything(), '2024-06-15')` uses `expect.anything()` for the plugin argument. If the command accidentally passed `null` or a different object, this test would still pass.

**Fix:** Assert the plugin reference explicitly:

```typescript
expect(mockFetchTimeEntries).toHaveBeenCalledWith(
    expect.objectContaining({ settings: expect.objectContaining({ apiToken: 'token' }) }),
    '2024-06-15'
);
```

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
