---
phase: 8
slug: security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | SEC-02 | — | Token stored via localStorage not data.json | unit | `npm test` | ✅ | ⬜ pending |
| 8-01-02 | 01 | 1 | SEC-02 | — | getApiToken() reads localStorage | unit | `npm test` | ✅ | ⬜ pending |
| 8-01-03 | 01 | 2 | SEC-02 | — | apiToken removed from TogglImportSettings | unit | `npm test` | ✅ | ⬜ pending |
| 8-02-01 | 02 | 1 | SEC-01 | — | Test button calls /me and shows notice | unit | `npm test` | ✅ | ⬜ pending |
| 8-02-02 | 02 | 1 | SEC-01 | — | Button disabled during in-flight request | unit | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update existing mock plugin factories in test files to remove `apiToken` from settings, add `getApiToken()` stub

*Existing vitest infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Token persists after Obsidian restart | SEC-02 | localStorage is not testable in vitest environment | Open plugin settings, enter token, restart Obsidian, verify token field is populated |
| Notice text matches expected format | SEC-01 | Obsidian Notice UI is not testable in vitest | Click Test Connection, verify Notice shows "Connected as [name]" or error format |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
