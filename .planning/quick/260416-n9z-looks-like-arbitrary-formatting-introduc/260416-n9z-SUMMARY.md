---
phase: quick
plan: 260416-n9z
subsystem: formatter
tags: [security, template, formatter]
dependency_graph:
  requires: []
  provides: [CR-01-resolved]
  affects: [src/formatter.ts, src/main.ts, tests/formatter.test.ts]
tech_stack:
  added: []
  patterns: [regex-replace-template]
key_files:
  modified:
    - src/formatter.ts
    - src/main.ts
    - tests/formatter.test.ts
decisions:
  - "$var syntax chosen over ${var} to remove all ambiguity with JS template literals and prevent eval-style misuse"
  - "Expression support (??/||) dropped entirely — not required for core use case, adds no security-safe path"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-16"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 3
---

# Quick Task 260416-n9z Summary

**One-liner:** Replace `new Function`-based template engine with safe `$var` regex substitution, eliminating CR-01 arbitrary code execution in Electron's full-privilege Node.js context.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Replace renderTemplate with $var regex substitution | d7a45aa |

## What Was Done

### Task 1: Replace renderTemplate with $var regex substitution

**Files modified:**
- `src/formatter.ts` — Removed the `new Function`-based `renderTemplate` (lines 30–71). Replaced with a 7-line regex replace using `/\$([a-zA-Z_][a-zA-Z0-9_]*)/g`. Added `TEMPLATE_VARS` constant as an explicit allowlist. Updated the `formatEntries` template branch to pass `''` for empty optional fields (no more null).
- `src/main.ts` — Updated `DEFAULT_SETTINGS.templateString` from `'${description} (${duration})'` to `'$description ($duration)'`.
- `tests/formatter.test.ts` — Updated all template tests to use `$var` syntax. Removed two expression tests (`??` and `||`). Replaced "broken template" test with "unknown-only template" test. Added new "duplicate unknown var" test per IN-02 from review.

**Verification:** `npm test` — 76/76 tests pass across 5 test files.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. This plan resolves T-n9z-01 (CR-01). No new attack surface introduced.

## Self-Check: PASSED

- `src/formatter.ts` exists and contains no `new Function`
- `src/main.ts` templateString is `'$description ($duration)'`
- `tests/formatter.test.ts` uses `$var` syntax throughout template tests
- Commit `d7a45aa` exists
