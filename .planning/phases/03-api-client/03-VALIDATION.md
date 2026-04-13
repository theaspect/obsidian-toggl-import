---
phase: 3
slug: api-client
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Wave 0 installs) |
| **Config file** | `vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `npx vitest run tests/api.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | Wave 0 | 0 | CMD-04, CMD-08, FMT-04 | — | N/A | infra | `npm install -D vitest` exits 0 | ❌ W0 | ⬜ pending |
| 3-W0-02 | Wave 0 | 0 | CMD-04, CMD-08, FMT-04 | — | N/A | unit | `npx vitest run tests/api.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | CMD-04 | T-3-01 | date boundaries constructed as local midnight → UTC | unit | `npx vitest run tests/api.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | CMD-08 | — | running entries excluded silently | unit | `npx vitest run tests/api.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | FMT-04 | — | start preserved as UTC string; local conversion in formatter | unit | `npx vitest run tests/api.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | CMD-04 | T-3-02 | 401 → specific error, no token in message | unit | `npx vitest run tests/api.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 1 | CMD-04 | T-3-02 | 429 → specific error | unit | `npx vitest run tests/api.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-06 | 01 | 1 | CMD-04 | T-3-02 | network failure → structured error | unit | `npx vitest run tests/api.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` dev dependency — `npm install -D vitest`
- [ ] `vitest.config.ts` — minimal ESM TypeScript config
- [ ] `tests/api.test.ts` — stubs/mocks for CMD-04, CMD-08, FMT-04 with mocked `requestUrl`

*Wave 0 must complete before any API client task can be verified.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual Toggl API token auth (live HTTP) | CMD-04 | Requires real API token + network; cannot mock in unit tests | Configure real API token in settings; import from a dated note; verify entries appear |
| Workspace ID auto-population via `/me` | CMD-04 | Requires real Toggl account | Clear `workspaceId` to 0 in `data.json`; run import; verify `workspaceId` is populated and persisted |
| Rate limit handling (429) | CMD-04 | Cannot reliably trigger Toggl rate limit in tests | Manual: fire rapid requests or inject 429 response in dev build |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
