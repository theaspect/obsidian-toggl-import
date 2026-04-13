# Phase 6: Release - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

A GitHub Actions workflow that triggers when a `v*` tag is pushed, builds the plugin from source, and publishes `main.js`, `manifest.json`, and `styles.css` as downloadable release assets. Also includes an `npm run version` helper script for managing version bumps across all three version files before tagging.

</domain>

<decisions>
## Implementation Decisions

### Tag Format
- **D-01:** Workflow triggers on tags matching `v*` (e.g., `v1.0.0`). The `v` prefix follows GitHub/npm convention. When the workflow compares the tag to `manifest.json`, it strips the `v` prefix.

### Release Notes
- **D-02:** Use GitHub Actions' `generate-release-notes` feature — pulls commit messages since the last tag automatically. Zero maintenance, shows what changed. No manual body needed.

### Build Gate
- **D-03:** Workflow runs `npm install && npm run build` only — no separate `tsc --noEmit` step. The existing `npm run build` production script already includes type-checking; a redundant CI check is not needed.

### Version Bump Process
- **D-04:** Add an `npm run version` script to `package.json` that atomically updates `manifest.json`, `package.json`, and `versions.json` to a new version. Release process: run the script, commit the version files, push a `vX.Y.Z` tag.

### Claude's Discretion
- Exact GitHub Actions `runs-on` image (ubuntu-latest is standard)
- Node.js version pinning in the workflow (should match project's Node requirement ≥18)
- Whether to use `actions/upload-release-asset` or the newer `softprops/action-gh-release`
- Exact `npm run version` script implementation (bump-manifest or custom shell)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §REL-03 — GitHub Actions workflow publishes main.js, manifest.json, and styles.css as release assets on git tag

### Existing files to know about
- `manifest.json` — Current plugin manifest (id: obsidian-toggl-import, version: 1.0.0)
- `versions.json` — Maps manifest versions to minAppVersion (currently: {"1.0.0": "1.0.0"})
- `package.json` — Build scripts; version bump script goes here
- `.gitignore` — `main.js` is gitignored (workflow must build from source, not commit artifact)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `npm run build` — esbuild production script already exists; workflow calls this directly
- `styles.css` — committed empty file; just uploaded as-is

### Established Patterns
- `main.js` is gitignored — workflow must run `npm install && npm run build` to produce it
- `manifest.json` and `versions.json` are manually maintained version files — the version script updates both
- Obsidian community plugin conventions: `manifest.json` version field must match the git tag (after stripping `v`)

### Integration Points
- GitHub Actions workflow file: `.github/workflows/release.yml` (new file)
- `package.json` scripts block: new `"version"` script entry
- Git tag: `v1.0.0` format triggers the workflow

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard Obsidian community plugin release workflow patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-release*
*Context gathered: 2026-04-13*
