---
phase: 07-ci-fixes
plan: "01"
subsystem: dependencies
tags: [npm, peer-deps, codemirror, ci]
dependency_graph:
  requires: []
  provides: [clean-npm-install]
  affects: [ci-pipeline, package-lock.json]
tech_stack:
  added: []
  patterns: [exact-version-pins]
key_files:
  created: []
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Pinned @codemirror/state to 6.5.0 (exact, no caret) matching obsidian@1.12.3 peer requirement"
  - "Pinned @codemirror/view to 6.38.6 (exact, no caret) matching obsidian@1.12.3 peer requirement"
  - "Bumped @types/node from ^16.11.6 to ^22.0.0 to satisfy vitest@4.1.4 peer requirement (auto-fix)"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-14"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
---

# Phase 7 Plan 1: Peer Dependency Pin Summary

**One-liner:** Exact-pin @codemirror/state@6.5.0 and @codemirror/view@6.38.6 to match obsidian@1.12.3 peer requirements, clearing ERESOLVE so npm install runs cleanly in CI.

## What Was Built

Updated `package.json` devDependencies to use exact version pins for the two @codemirror packages that conflict with obsidian@1.12.3's peer requirements. Regenerated `package-lock.json` with SRI hashes for the pinned versions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pin @codemirror/state and @codemirror/view | 6aac531 | package.json, package-lock.json |

## Verification Results

- `npm install` — clean exit, zero ERESOLVE errors, zero peer-dep warnings for codemirror or obsidian
- `npm run build` — exit code 0, tsc --noEmit + esbuild production passed
- `npm test` — 49/49 tests passed (3 test files)
- No `--legacy-peer-deps` or `--force` flags used

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Fix] Bumped @types/node from ^16.x to ^22.x**
- **Found during:** Task 1 (npm install)
- **Issue:** `@types/node@^16.11.6` caused ERESOLVE with vitest@4.1.4 which requires `@types/node@^20.0.0 || ^22.0.0 || >=24.0.0`. npm install failed completely before even reaching the codemirror fix.
- **Fix:** Updated `@types/node` to `^22.0.0` in package.json devDependencies (LTS major, within vitest's accepted range). Build and tests confirmed no breakage.
- **Files modified:** package.json
- **Commit:** 6aac531

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. Threat mitigations T-07-01 and T-07-02 satisfied: exact version pins with committed lockfile.

## Self-Check: PASSED

- package.json contains `"@codemirror/state": "6.5.0"` (verified by node assertion)
- package.json contains `"@codemirror/view": "6.38.6"` (verified by node assertion)
- package-lock.json exists and contains version strings `6.5.0` and `6.38.6`
- Commits exist: 6aac531 (chore), 4963928 (restore planning files)
- Build passed: exit 0
- Tests passed: 49/49
