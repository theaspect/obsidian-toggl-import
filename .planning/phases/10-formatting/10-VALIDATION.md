---
phase: 10
slug: formatting
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.4 |
| **Config file** | vitest.config.ts (project root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | FMT-01 | — | N/A | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | FMT-01 | — | N/A | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | FMT-01 | — | N/A | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | FMT-01 | — | N/A | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-05 | 01 | 2 | FMT-01 | — | N/A | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-06 | 01 | 2 | FMT-01 | — | N/A | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update `makeSettings()` helper in `tests/formatter.test.ts` — add `templateString` field and widen `outputFormat` type to include `"template"` — must be done before any template-mode tests can be written

*All additions go into the existing `tests/formatter.test.ts`; no new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Template field appears in settings UI when "Custom Template" format selected | FMT-01 | Requires Obsidian plugin loaded in vault | Open Settings → Toggl Import → change Format to "Custom Template", verify template textarea appears |
| Column toggles disabled when template mode active | FMT-01 | Requires Obsidian plugin loaded in vault | Same settings page, verify column checkboxes are grayed out |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
