---
phase: 06-release
fixed_at: 2026-04-13T00:00:00Z
review_path: .planning/phases/06-release/06-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-04-13
**Source review:** .planning/phases/06-release/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: version-bump.mjs — No guard against running outside `npm version`

**Files modified:** `version-bump.mjs`
**Commit:** fcacd2d
**Applied fix:** Added an early exit guard after reading `process.env.npm_package_version`. If the variable is not set (i.e., the script is run directly rather than via `npm version`), the script now prints an error message to stderr and exits with code 1, preventing silent manifest corruption.

### WR-02: version-bump.mjs — Silent skip when version key already exists

**Files modified:** `version-bump.mjs`
**Commit:** fcacd2d
**Applied fix:** Added an `else` branch to the `versions[targetVersion]` guard that emits a `console.warn` message when the entry already exists and the write is skipped, so developers are informed rather than silently misled.

### WR-03: release.yml — Tag pattern admits pre-release tags

**Files modified:** `.github/workflows/release.yml`
**Commit:** c1cb1d7
**Applied fix:** Removed the trailing `*` wildcard from the tag glob pattern. Pattern changed from `[0-9]+.[0-9]+.[0-9]+*` to `[0-9]+.[0-9]+.[0-9]+`, restricting workflow triggers to exact three-part semver tags only.

### WR-04: package.json — @codemirror packages listed as runtime dependencies

**Files modified:** `package.json`
**Commit:** ac9be8f
**Applied fix:** Moved `@codemirror/state` and `@codemirror/view` from `dependencies` into `devDependencies` (alphabetically ordered). Set `"dependencies": {}` to make it explicit there are no runtime npm dependencies, which is correct for a fully-bundled Obsidian plugin.

---

_Fixed: 2026-04-13_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
