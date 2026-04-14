# Phase 7: CI Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-14
**Phase:** 07-ci-fixes
**Mode:** discuss
**Areas discussed:** Peer dep fix strategy, CI workflow scope, Node.js version targeting

## Assumptions Going In

From codebase scout:
- `release.yml` uses `node-version: "22"`, `actions/checkout@v4`, `actions/setup-node@v4`
- `obsidian@1.12.3` (latest) has exact peer deps: `@codemirror/state: 6.5.0`, `@codemirror/view: 6.38.6`
- `package.json` has `@codemirror/state: ^6.6.0`, `@codemirror/view: ^6.41.0` — both newer than obsidian expects → conflict

## Areas Discussed

### Peer Dependency Fix Strategy

| Option | What user chose |
|--------|----------------|
| Downgrade to match obsidian (pin 6.5.0 / 6.38.6) | ✓ Selected |
| --legacy-peer-deps in CI | — |
| npm overrides in package.json | — |

**Decision:** Pin `@codemirror/state` to `6.5.0` and `@codemirror/view` to `6.38.6` in `package.json`. Plugin doesn't use codemirror directly — cleanest fix with zero warnings.

### CI Workflow Scope

| Option | What user chose |
|--------|----------------|
| Add ci.yml + fix release.yml | ✓ Selected |
| Fix release.yml only | — |

**Decision:** Add new `ci.yml` (push to main + PRs) running build + test. Also update `release.yml` to Node 24.

### Node.js Version Targeting

| Option | What user chose |
|--------|----------------|
| '24' — exact major | ✓ Selected |
| '24.x' — explicit minor wildcard | — |
| 'lts/*' — always latest LTS | — |

**Decision:** `node-version: "24"` in both workflows.

## Corrections Made

No corrections — all recommended options accepted.

## Deferred Ideas

None.
