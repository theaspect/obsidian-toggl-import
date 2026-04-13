---
phase: 04-formatter
reviewed: 2026-04-10T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/formatter.ts
  - tests/formatter.test.ts
  - tsconfig.json
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-10
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the formatter module (`src/formatter.ts`), its test suite (`tests/formatter.test.ts`), and the TypeScript configuration (`tsconfig.json`). The formatter logic is clean and correctly handles the core column-filtering and output-format branching. Two warnings relate to an unguarded pipe-in-value bug that silently corrupts GFM tables, and a tsconfig mismatch with the project's own recommended stack. One additional warning flags tautological tests that cannot catch regressions in `formatStartTime`. Info items cover a negative-duration edge case, a tsconfig target discrepancy, and a silenced deprecation flag.

---

## Warnings

### WR-01: Pipe characters in cell values corrupt GFM table output

**File:** `src/formatter.ts:41-43`

**Issue:** When `outputFormat === 'table'`, cell values are inserted into the GFM table row without escaping or stripping `|` characters. Any time entry with a pipe in its description, project name, or tag (e.g., `"Design | Review"`) will silently produce extra columns, breaking the table structure entirely. Toggl allows `|` in all of these fields.

**Fix:** Escape `|` as `\|` (standard GFM escape) in each cell value before insertion:

```typescript
// Add a helper
function escapeCell(value: string): string {
    return value.replace(/\|/g, '\\|');
}

// In the table branch, apply it to each getValue call
const rows = entries.map(e =>
    '| ' + enabled.map(c => escapeCell(c.getValue(e))).join(' | ') + ' |'
);
// Also apply to header if headers could contain pipes (they are hardcoded here, so only rows need it)
```

---

### WR-02: `tsconfig.json` uses deprecated `moduleResolution: "node"` instead of `"bundler"`

**File:** `tsconfig.json:13`

**Issue:** The project's own `CLAUDE.md` specifies `"moduleResolution": "bundler"` (TypeScript 5.0+) as the recommended setting, and notes it works with esbuild's resolution without requiring explicit `.js` extensions. The current config uses the older `"node"` strategy. The `"ignoreDeprecations": "6.0"` on line 3 is actively suppressing the deprecation warning that TypeScript would otherwise emit for this setting — masking the mismatch.

**Fix:**
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```
Remove `"ignoreDeprecations": "6.0"` once the deprecated setting is corrected.

---

### WR-03: `formatStartTime` tests are tautological — cannot catch regressions

**File:** `tests/formatter.test.ts:67-81`

**Issue:** Both `formatStartTime` tests compute `expected` using the exact same `new Date()` + `.getHours()` + `.getMinutes()` calls as the implementation itself. The first test (line 67-72) will pass even if the implementation is completely wrong, as long as it calls the same JS methods. The second test (line 78-81) only verifies the regex format `\d{2}:\d{2}`, not the actual value. Neither test can detect a regression such as returning UTC time instead of local time, or swapping hours/minutes.

**Fix:** Pin the test to a known UTC offset or use a fixed known-good output. One approach: pick an ISO string where UTC and local time differ, assert the local value matches the expected local time. If the test environment's timezone is not controlled, skip value assertions and document the limitation explicitly:

```typescript
it('formats start time as local HH:MM', () => {
    // This test verifies format only — value depends on test runner timezone.
    // To test correctness, run with TZ=UTC and assert '09:00' for UTC input.
    const result = formatStartTime('2024-06-15T09:00:00+00:00');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
});
```

Or, for a robust test:
```typescript
// Run with TZ=UTC (add to vitest config: env: { TZ: 'UTC' })
it('formats UTC 09:00 as "09:00" when TZ=UTC', () => {
    expect(formatStartTime('2024-06-15T09:00:00+00:00')).toBe('09:00');
});
```

---

## Info

### IN-01: `formatDuration` has no guard for negative input

**File:** `src/formatter.ts:4-10`

**Issue:** If `secs` is negative (e.g., `-1`), `Math.floor(-1 / 3600)` returns `-1`, and the function returns `"-1h"`. This is unreachable in the current call path because `api.ts:99` filters out running entries (`e.duration < 0`) before any entry reaches the formatter. However, since `formatDuration` is a public export, the lack of a guard means callers outside this module can produce malformed output silently.

**Fix:** Add a guard or document the precondition:
```typescript
export function formatDuration(secs: number): string {
    if (secs <= 0) return '0m';
    // ... rest unchanged
}
```

---

### IN-02: `tsconfig.json` uses `"target": "ES6"` instead of recommended `"ES2018"`

**File:** `tsconfig.json:8`

**Issue:** `CLAUDE.md` recommends `"target": "ES2018"` as the safe baseline for Electron (Obsidian's runtime), noting async/await works natively without down-level transforms. `"ES6"` still works but may cause unnecessary transpilation of async/await syntax.

**Fix:**
```json
{
  "compilerOptions": {
    "target": "ES2018"
  }
}
```

---

### IN-03: `"ignoreDeprecations": "6.0"` in tsconfig silently suppresses warnings

**File:** `tsconfig.json:3`

**Issue:** `"ignoreDeprecations": "6.0"` tells the TypeScript compiler to suppress all deprecation warnings that will become errors in TS 6.0. This is masking the `moduleResolution: "node"` deprecation (see WR-02). Suppressing deprecation warnings globally makes it harder to track when options need updating.

**Fix:** Address the underlying deprecated settings (see WR-02) and then remove this line rather than suppressing warnings wholesale.

---

_Reviewed: 2026-04-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
