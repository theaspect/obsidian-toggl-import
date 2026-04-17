---
phase: 11-release
reviewed: 2026-04-17T12:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - LICENSE
  - README.md
  - eslint.config.mjs
  - manifest.json
  - package.json
  - src/api.ts
  - src/main.ts
  - src/settings.ts
  - tests/api.test.ts
  - tests/command.test.ts
  - tests/settings.test.ts
  - tsconfig.json
  - versions.json
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Full source review covering all plugin source files, tests, and release artifacts. The overall
code quality is good: strict TypeScript is correctly configured, async error handling is
consistent, the API token is stored device-locally and never echoed in error messages,
and the template renderer uses regex substitution with no `eval`. The day-wrap time feature
is implemented correctly end-to-end and sort order is well-tested.

Three warnings were found: two in `src/api.ts` around null/non-array API responses that can
produce unhelpful TypeErrors instead of descriptive errors, and one in the test suite around
shared module-level project cache state causing hidden test-order coupling. Four info items
cover `@types/node` version drift, a redundant null-coalescing expression, the previously-noted
`versions.json` historical entry, and a minor README/settings label mismatch.

No critical issues (no security vulnerabilities, no authentication bypasses, no hardcoded
credentials, no data loss risks).

Note: The previous review (covering only release artifacts) flagged WR-01 `obsidian` pinned
to `"latest"` and IN-01 missing `repository` field. Both are now resolved in the current
`package.json` (`"obsidian": "1.8.7"`, `repository` field present). Those findings are closed.

---

## Warnings

### WR-01: `togglGet` returns `resp.json as T` without null-guard — callers crash with TypeError on null body

**File:** `src/api.ts:26`
**Issue:** `resp.json as T` is a bare TypeScript cast with no runtime check. For any endpoint
returning a 200 response with a null or non-object JSON body (e.g., Toggl returns `null` for
an empty project list, or a malformed gateway response), the cast silently passes `null` to
the caller. The first caller that accesses a property — such as `me.default_workspace_id` at
`api.ts:84` — throws `TypeError: Cannot read properties of null (reading 'default_workspace_id')`.
This surfaces as an unhandled exception rather than the descriptive "Toggl API error: ..." messages
provided for 4xx responses, and the `catch` block in `main.ts:72` will catch it, but the user sees
the raw TypeError text rather than a helpful message.

The same issue applies to `loadProjectCache` (line 65): if `projects` is `null`, `projects.map(...)`
throws `TypeError: Cannot read properties of null (reading 'map')`.

**Fix:** Add a runtime null/type guard before returning from `togglGet`, or guard at each call site:
```typescript
// Option A: guard in togglGet (centralised)
if (resp.json == null) {
    throw new Error(`Toggl API error: empty response body (${resp.status})`);
}
return resp.json as T;

// Option B: guard at the /me call site in fetchTimeEntries
const me = await togglGet<{ default_workspace_id: number }>(`${BASE}/me`, token);
if (!me || typeof me.default_workspace_id !== 'number') {
    throw new Error('Toggl API error: unexpected /me response shape');
}
```
Option A is preferred as it prevents the same issue from recurring in future callers.

---

### WR-02: `loadProjectCache` does not guard against non-array response — `projects.map` throws TypeError

**File:** `src/api.ts:64-65`
**Issue:** `loadProjectCache` calls `togglGet<Array<...>>` and immediately calls `.map()` on
the result. If the workspace has no projects, Toggl returns `[]` — that is fine. However, if the
workspace projects endpoint returns a non-array (e.g., a permission error body like
`{ "message": "Forbidden" }` that still arrives with a 200 status), `projects.map` throws
`TypeError: projects.map is not a function`. This would prevent any import for the user with no
meaningful error message.

This is related to WR-01 (the underlying null-body risk) but is a distinct failure mode specific
to the array assumption.

**Fix:** Add an array check before calling `.map()`:
```typescript
if (!Array.isArray(projects)) {
    throw new Error('Toggl API error: unexpected response from projects endpoint');
}
projectCache = new Map(projects.map(p => [p.id, p.name]));
```

---

### WR-03: Project cache is module-level singleton — tests share state across describe blocks, creating hidden order-dependency

**File:** `tests/api.test.ts:68-69`
**Issue:** `src/api.ts` stores `projectCache` as a module-level variable. The test suite exports
`_resetProjectCache()` to allow test isolation, but the `beforeEach` in both describe blocks only
calls `mockRequestUrl.mockReset()` — it never calls `_resetProjectCache()`. As a result:

1. The first test in `describe('fetchTimeEntries')` populates the cache with `SAMPLE_PROJECTS`.
2. All subsequent tests in that describe, and all tests in `describe('fetchTimeEntries — day wrap
   time filter')`, reuse that cached state.
3. The mock `setupMockResponses` still wires up the `/projects` endpoint but it is never called
   after the first test — the tests pass only because all fixtures use workspace ID 42 and the
   same project list.

If a new test is added that uses a different `workspaceId` or a different project fixture, it will
silently inherit the stale cache from the first test and produce incorrect results.

**Fix:** Call `_resetProjectCache()` in `beforeEach` for all describe blocks that exercise
`fetchTimeEntries`:
```typescript
import { fetchTimeEntries, TimeEntry, _resetProjectCache } from '../src/api';

// In each describe block's beforeEach:
beforeEach(() => {
    mockRequestUrl.mockReset();
    _resetProjectCache();
});
```

---

## Info

### IN-01: `@types/node` version `^22.0.0` drifts from CLAUDE.md recommendation of `~18.x`

**File:** `package.json:23`
**Issue:** `CLAUDE.md` specifies `"@types/node": "~18.x"` as the recommended version, noting it
is needed only for the build script (`esbuild.config.mjs`) and must not leak Node globals into
plugin code. The current `package.json` pins `^22.0.0`. The tsconfig correctly excludes `"node"`
from `lib`, so no Node globals leak. The practical risk is low, but it diverges from the stated
project standard.
**Fix:** Align with the project spec or update CLAUDE.md to reflect the intentional upgrade:
```json
"@types/node": "~18.x"
```
If Node 22 types are intentionally used (e.g., for newer build-script APIs), document the
exception in CLAUDE.md.

---

### IN-02: Redundant null-coalescing on `project_name` in `formatter.ts`

**File:** `src/formatter.ts:74`
**Issue:** `e.project_name ?? ''` — `project_name` is typed as `string` (non-nullable) in the
`TimeEntry` interface (`src/api.ts:47`). The null-coalescing operator is dead code; TypeScript
strict mode would catch an actual `null` here at compile time. No runtime risk, but it may confuse
readers into thinking `project_name` can be null.
**Fix:** Remove the nullish coalescing:
```typescript
project: e.project_name,
```

---

### IN-03: `versions.json` 1.0.0 entry maps to Obsidian `1.4.0` — historically implausible

**File:** `versions.json:2`
**Issue:** `"1.0.0": "1.4.0"` maps the initial plugin release to Obsidian minimum version 1.4.0.
Given that `manifest.json` now requires `1.8.7`, the 1.0.0 historical minimum of 1.4.0 is
unlikely to be accurate (plugin features such as `requestUrl` and `loadLocalStorage` have been
available since earlier versions, but the claimed minimum should match what was actually tested).
The Obsidian community plugin reviewer may flag this discrepancy.
**Fix:** If the 1.0.0 release was never actually tested on Obsidian 1.4.0, align it with the
realistic minimum:
```json
{
  "1.0.0": "1.8.7",
  "1.1.0": "1.8.7"
}
```

---

### IN-04: README settings table omits "Day wrap time" setting

**File:** `README.md:59-67`
**Issue:** The Settings table documents six settings but omits the "Day wrap time" setting that
is visible in the settings UI and described in `settings.ts:115-129`. Users who rely on the
README as a reference will not find documentation for this feature.
**Fix:** Add a row to the settings table:
```markdown
| Day wrap time | Entries starting before this time (HH:MM local) are attributed to the previous day. Default `00:00` disables this feature. | `00:00` |
```

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
