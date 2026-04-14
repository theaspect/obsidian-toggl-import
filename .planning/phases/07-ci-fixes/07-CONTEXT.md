# Phase 7: CI Fixes - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the GitHub Actions pipeline pass cleanly on current Node.js and dependency versions. Covers updating workflows to Node.js 24 and resolving the npm peer dependency conflict between `obsidian@1.12.3` and `@codemirror/state`. Adding a separate CI workflow (build + test on every push/PR) is in scope. Creating, changing, or testing any plugin features is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Peer Dependency Fix
- **D-01:** Downgrade `@codemirror/state` to `6.5.0` and `@codemirror/view` to `6.38.6` in `package.json`. These are the exact versions `obsidian@1.12.3` requires as peer deps. The plugin does not use codemirror APIs directly, so the version is immaterial to plugin code — this is the cleanest fix with zero warnings.

### CI Workflow Scope
- **D-02:** Add a new `ci.yml` workflow that runs `npm install && npm run build && npm test` on every push to `main` and on all pull requests. This is in addition to fixing `release.yml`. Satisfies the success criterion "workflow completes without errors on a clean push."
- **D-03:** Also update `release.yml` to Node.js 24 (same as ci.yml).

### Node.js Version
- **D-04:** Use `node-version: "24"` (exact major) in both `ci.yml` and `release.yml`. Picks the latest 24.x release, deterministic within the major.

### Claude's Discretion
- Action versions to use for `actions/checkout` and `actions/setup-node` (use latest stable that supports Node 24 — currently both @v4 already support it, keep @v4)
- Branch name for ci.yml trigger (use `main`)
- Whether to cache npm in ci.yml (npm cache via `setup-node cache: 'npm'` is a sensible addition)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Workflows
- `.github/workflows/release.yml` — existing release workflow to update (node version, peer deps fix via package.json)

### Dependencies
- `package.json` — devDependencies to pin (`@codemirror/state`, `@codemirror/view`)

No external specs — requirements fully captured in decisions above and REQUIREMENTS.md (CI-01, CI-02).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/release.yml` — existing workflow structure to clone/adapt for `ci.yml`

### Established Patterns
- Release workflow already uses `actions/checkout@v4` and `actions/setup-node@v4` — consistent with GH Actions best practices
- `npm run build` calls `tsc --noEmit && node esbuild.config.mjs production`; `npm test` calls `vitest run`
- Bare semver tags (no `v` prefix) trigger the release workflow — don't break that convention

### Integration Points
- New `ci.yml` is purely additive — no changes to plugin source, manifest, or test files
- `package.json` devDependency version pins are the only source change; `npm install` re-resolves `node_modules` on next install

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for ci.yml structure.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-ci-fixes*
*Context gathered: 2026-04-14*
