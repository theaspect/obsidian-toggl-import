---
phase: 6
slug: release
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — CI/CD phase; validation is script execution + manual workflow trigger |
| **Config file** | none |
| **Quick run command** | `node version-bump.mjs --dry-run 1.0.1 2>/dev/null \|\| node -e "require('./version-bump.mjs')"` |
| **Full suite command** | Manual: push tag, inspect GitHub Actions run |
| **Estimated runtime** | ~2 minutes (workflow run) |

---

## Sampling Rate

- **After every task commit:** Verify the modified file is syntactically valid (YAML lint or `node -e`)
- **After every plan wave:** Spot-check: file exists at expected path, key fields present
- **Before `/gsd-verify-work`:** Full manual trigger (push test tag, confirm release created, delete release/tag)
- **Max feedback latency:** ~120 seconds (GitHub Actions cold start + build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | REL-03 | — | N/A | structural | `test -f .github/workflows/release.yml && echo OK` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 1 | REL-03 | — | N/A | structural | `test -f version-bump.mjs && echo OK` | ❌ W0 | ⬜ pending |
| 6-01-03 | 01 | 1 | REL-03 | — | N/A | structural | `node -e "JSON.parse(require('fs').readFileSync('package.json'))" && echo OK` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.github/workflows/release.yml` — created by task 6-01-01 itself; no pre-stub needed
- [ ] `version-bump.mjs` — created by task 6-01-02 itself; no pre-stub needed

*Existing infrastructure covers all phase requirements — no test framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pushing a tag triggers the workflow | REL-03 | GitHub Actions cannot be tested locally | Push tag `1.0.0` to GitHub, watch Actions tab, confirm workflow runs |
| Release assets include main.js, manifest.json, styles.css | REL-03 | Requires a real GitHub release | After workflow completes, check release page for all 3 asset downloads |
| `npm run version` updates all 3 files atomically | REL-03 | Node script execution | Run `npm run version 1.0.1`, verify manifest.json, package.json, versions.json all updated |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
