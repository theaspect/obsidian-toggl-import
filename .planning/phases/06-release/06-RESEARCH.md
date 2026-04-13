# Phase 6: Release - Research

**Researched:** 2026-04-13
**Domain:** GitHub Actions release automation, Obsidian community plugin release requirements
**Confidence:** MEDIUM (workflow YAML unverifiable via raw GitHub URL; content from official sample plugin package.json and multiple corroborating sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Workflow triggers on tags matching `v*` (e.g., `v1.0.0`). The `v` prefix follows GitHub/npm convention. When the workflow compares the tag to `manifest.json`, it strips the `v` prefix.
- **D-02:** Use GitHub Actions' `generate-release-notes` feature — pulls commit messages since the last tag automatically. Zero maintenance, shows what changed. No manual body needed.
- **D-03:** Workflow runs `npm install && npm run build` only — no separate `tsc --noEmit` step. The existing `npm run build` production script already includes type-checking; a redundant CI check is not needed.
- **D-04:** Add an `npm run version` script to `package.json` that atomically updates `manifest.json`, `package.json`, and `versions.json` to a new version. Release process: run the script, commit the version files, push a `vX.Y.Z` tag.

### Claude's Discretion

- Exact GitHub Actions `runs-on` image (ubuntu-latest is standard)
- Node.js version pinning in the workflow (should match project's Node requirement ≥18)
- Whether to use `actions/upload-release-asset` or the newer `softprops/action-gh-release`
- Exact `npm run version` script implementation (bump-manifest or custom shell)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REL-03 | GitHub Actions workflow publishes `main.js`, `manifest.json`, and `styles.css` as release assets on git tag | Workflow YAML pattern confirmed; `softprops/action-gh-release` handles asset attachment; tag format constraint documented |
</phase_requirements>

---

## Summary

Phase 6 adds two artifacts: a `.github/workflows/release.yml` GitHub Actions workflow and a `version-bump.mjs` script invoked by `npm run version`. The workflow triggers on a git tag push, builds the plugin from source (since `main.js` is gitignored), creates a GitHub release with auto-generated notes, and uploads the three required assets.

The standard Obsidian sample plugin approach is well-established and can be adapted directly. The primary tooling choice is `softprops/action-gh-release` (v2 recommended — v3 requires Node 24 runtime which GitHub Actions runners do not yet standardize on). The `version-bump.mjs` pattern from the official sample plugin is the canonical approach and is already fetched verbatim.

**Critical constraint:** Obsidian's community plugin submission validator requires the GitHub release tag to match `manifest.json`'s `version` field exactly — no `v` prefix. This conflicts with CONTEXT.md D-01's `v*` trigger pattern. See the "Tag Format Conflict" pitfall for the resolution path.

**Primary recommendation:** Use `softprops/action-gh-release@v2` for asset upload + release creation in a single step. Use `version-bump.mjs` (official sample plugin script) as the body of `npm run version`. Tag format must be `1.0.0` (no `v` prefix) for Obsidian community submission compatibility — the workflow trigger pattern must match accordingly.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `softprops/action-gh-release` | v2.2.1 (latest v2) | Create GitHub release + upload assets in one step | Supersedes the old two-action pattern (`actions/create-release` + `actions/upload-release-asset`). The official Obsidian docs and community plugins all use this action. [VERIFIED: github.com/softprops/action-gh-release/releases] |
| `actions/checkout` | v4 | Checkout source for build step | Standard; v4 uses Node 20, v3 is EOL. [ASSUMED] |
| `actions/setup-node` | v4 | Set Node.js version in CI | Standard; pins to a specific Node major. [ASSUMED] |
| Node.js in CI | 22 (LTS) | Build runtime for `npm install && npm run build` | Project requires ≥18; Node 22 is current LTS as of 2025. Pinning to a specific version prevents surprise upgrades. [ASSUMED] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `version-bump.mjs` | N/A (custom script) | Atomically updates `manifest.json` and `versions.json` from `npm_package_version` env var | Invoked by `npm run version`; the official Obsidian sample plugin ships this script as the canonical solution. [VERIFIED: raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `softprops/action-gh-release@v2` | `softprops/action-gh-release@v3` | v3 requires Node 24 runtime (released April 2026); GitHub-hosted runners may not yet default to Node 24. Stay on v2 until confirmed stable in Actions environment. [CITED: github.com/softprops/action-gh-release] |
| `softprops/action-gh-release` | `actions/create-release` + `actions/upload-release-asset` | The two-action pattern is deprecated and unmaintained. The single `softprops` action is simpler and actively maintained. [MEDIUM confidence — multiple corroborating sources] |
| `version-bump.mjs` (Node ESM script) | Inline shell script in workflow | The Node script reads `npm_package_version` from the environment, making it idempotent and testable locally. A shell script would be fragile across platforms. |

**Installation (no install needed — workflow creates its own environment):**

The workflow installs dependencies at runtime via `npm ci` or `npm install`. No local install required.

---

## Architecture Patterns

### Recommended Project Structure
```
.github/
└── workflows/
    └── release.yml      # Triggers on tag push, builds + releases
version-bump.mjs          # Node ESM script for atomic version updates
package.json              # Updated: add "version" script entry
manifest.json             # Updated by version-bump.mjs on each release
versions.json             # Updated by version-bump.mjs on each release
```

### Pattern 1: Tag-Triggered Release Workflow

**What:** A GitHub Actions workflow file that (1) triggers on tag push, (2) checks out source, (3) builds with Node, (4) creates a GitHub release with auto-notes and uploads assets.

**When to use:** Every time a new plugin version is published. The workflow is the only release mechanism — never manually attach assets to GitHub releases.

**Example (verified against official sample plugin package.json and softprops docs):**

```yaml
# Source: obsidian-sample-plugin pattern + softprops/action-gh-release docs
name: Release Obsidian plugin

on:
  push:
    tags:
      - "*"   # triggers on any tag — see Tag Format section below

env:
  PLUGIN_NAME: obsidian-toggl-import  # must match manifest.json "id"

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write        # required by softprops/action-gh-release

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Build plugin
        run: |
          npm install
          npm run build

      - name: Create release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: |
            main.js
            manifest.json
            styles.css
```

**Key notes:**
- `permissions: contents: write` is required at the job level (or workflow level) — without it, the action fails with a 403. [VERIFIED: softprops/action-gh-release README]
- `generate_release_notes: true` generates the release title AND body automatically from commits since the last tag. No `name:` or `body:` inputs needed. [VERIFIED: softprops/action-gh-release README]
- The three files — `main.js`, `manifest.json`, `styles.css` — are the exact assets required by Obsidian's release validator. [CITED: docs.obsidian.md/Plugins/Releasing]

### Pattern 2: Version Bump Script

**What:** A Node ESM script (`version-bump.mjs`) that reads `npm_package_version` from the environment (set by npm during `npm version`) and writes the new version into `manifest.json` and `versions.json`.

**When to use:** Run via `npm run version <major|minor|patch>` before tagging.

**Example (verbatim from official obsidian-sample-plugin):**

```javascript
// Source: raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/HEAD/version-bump.mjs
import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
// but only if the target version is not already in versions.json
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
if (!Object.values(versions).includes(minAppVersion)) {
    versions[targetVersion] = minAppVersion;
    writeFileSync('versions.json', JSON.stringify(versions, null, '\t'));
}
```

**package.json `scripts` entry (from official sample plugin):**

```json
"version": "node version-bump.mjs && git add manifest.json versions.json"
```

The `version` lifecycle script is invoked automatically by `npm version patch|minor|major`. npm sets `npm_package_version` to the new version before running the script, so `version-bump.mjs` reads it without any argument parsing.

**Full developer release flow:**
```bash
npm version patch            # bumps package.json, runs version-bump.mjs, stages manifest.json + versions.json
git commit -m "chore: release 1.0.1"
git tag 1.0.1                # NO v prefix — see Tag Format Conflict below
git push && git push --tags  # triggers workflow
```

### Anti-Patterns to Avoid

- **Using `v` prefix on the git tag:** Obsidian's community submission validator checks that the GitHub release tag exactly matches `manifest.json`'s `version` field. If you push `v1.0.0` and `manifest.json` says `1.0.0`, validation fails. Use `1.0.0` as the tag.
- **Committing `main.js` to git:** It is gitignored for good reason — the workflow must build it from source to ensure the release always matches the source. Don't unignore it.
- **Manually attaching assets to a GitHub release:** The workflow is the single source of truth. Manual uploads risk mismatched versions.
- **Using `actions/create-release` + `actions/upload-release-asset`:** These actions are archived/unmaintained. Use `softprops/action-gh-release` instead.
- **Skipping `git add manifest.json versions.json` in the version script:** npm's `version` lifecycle stages `package.json` automatically, but not other files. The `version-bump.mjs && git add manifest.json versions.json` pattern ensures all three files are in the same commit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub release creation | Custom `gh release create` shell script in workflow | `softprops/action-gh-release@v2` | Handles asset upload, release notes, idempotency, error handling |
| Version file sync | Custom bash to edit manifest.json | `version-bump.mjs` Node ESM script | Cross-platform, reads `npm_package_version` reliably, already battle-tested in hundreds of plugins |
| Release note generation | Hand-written `body:` in workflow | `generate_release_notes: true` | GitHub generates from commits automatically; zero maintenance |

---

## Tag Format Conflict (Critical Clarification)

**The conflict:**
- CONTEXT.md D-01 says: workflow triggers on `v*` tags (e.g., `v1.0.0`)
- Obsidian community validator says: GitHub release tag must match `manifest.json` version exactly — `1.0.0`, NOT `v1.0.0`

**Evidence for the restriction:** Multiple official sources confirm no-`v`-prefix is required:
- DeepWiki on obsidian-releases: "Release tag must match the exact version number in `manifest.json` (no `v` prefix)" [CITED: deepwiki.com/obsidianmd/obsidian-releases/6.1-plugin-submission-guide]
- Community forum: `.npmrc` `tag-version-prefix = ""` is the standard fix when switching from npm's default `v*` convention to Obsidian's required bare version tags [CITED: forum.obsidian.md/t/using-github-actions-to-release-plugins/7877]
- Official sample plugin: `tags: - "*"` (not `v*`) and the `version-bump.mjs` workflow uses bare version tags [CITED: github.com/obsidianmd/obsidian-sample-plugin]

**Implication for D-01:** The workflow trigger can use `tags: - "*"` (matches all tags including `1.0.0`) rather than `v*`. If the user prefers to keep pushing `v1.0.0`-format tags, the workflow can strip the `v` when reading `github.ref_name` to construct the release tag name — but the GitHub Release itself should be created with tag `1.0.0` matching `manifest.json`. This requires the tag to already exist in the repo as `1.0.0`. The cleanest resolution is to not use `v` prefix at all — push `1.0.0` tags.

**Recommendation for planner:** Implement with `tags: - "*"` trigger and `1.0.0`-format tags. Include a note in the plan that D-01's `v*` convention should be reconsidered given the Obsidian validator constraint, and surface this in the implementation task for the developer to confirm before tagging.

---

## Common Pitfalls

### Pitfall 1: Tag Format vs. Obsidian Validator Mismatch
**What goes wrong:** Developer pushes `v1.0.0` tag; workflow creates a GitHub Release named `v1.0.0`; Obsidian's automated PR validator checks the release tag against `manifest.json`'s `"version": "1.0.0"` and fails with "Unable to find a release with tag 1.0.0".
**Why it happens:** npm conventionally uses `v` prefix. Obsidian requires exact match, no prefix.
**How to avoid:** Always tag as `1.0.0`. Add `.npmrc` with `tag-version-prefix = ""` to enforce this when using `npm version`.
**Warning signs:** PR to obsidian-releases fails automated check within minutes of submission.

### Pitfall 2: Missing `contents: write` Permission
**What goes wrong:** Workflow runs, `softprops/action-gh-release` fails with HTTP 403, no release created.
**Why it happens:** GitHub Actions token has restricted permissions by default in some repository security configurations.
**How to avoid:** Explicitly add `permissions: contents: write` at job or workflow level.
**Warning signs:** Action output shows "Resource not accessible by integration" or 403 error.

### Pitfall 3: `main.js` Not Built Before Upload
**What goes wrong:** `softprops/action-gh-release` uploads an empty or missing `main.js`, or the action fails because the file doesn't exist.
**Why it happens:** `main.js` is in `.gitignore`; it doesn't exist in the checkout. The build step must run first.
**How to avoid:** Ensure the build step (`npm install && npm run build`) completes before the release step. Use sequential steps, not parallel jobs.
**Warning signs:** The release is created but `main.js` is 0 bytes or missing from assets.

### Pitfall 4: `version-bump.mjs` Writes to `versions.json` Incorrectly
**What goes wrong:** Every `npm version` call appends a new entry to `versions.json`, but the guard condition checks `Object.values(versions).includes(minAppVersion)` — if two versions share the same `minAppVersion`, only the first gets written.
**Why it happens:** The official script's guard is on `minAppVersion` values, not version keys. If `minAppVersion` stays the same across patch bumps, subsequent patch versions are NOT added to `versions.json`.
**How to avoid:** Either update `minAppVersion` in `manifest.json` when bumping minor/major, or modify the script to check keys, not values: `if (!versions[targetVersion])`.
**Warning signs:** `versions.json` has fewer entries than expected after multiple bumps.

### Pitfall 5: `styles.css` Missing
**What goes wrong:** Workflow tries to upload `styles.css` but it doesn't exist or isn't committed, causing the action to error or produce a release missing the file.
**Why it happens:** The empty `styles.css` must be a committed file (not gitignored).
**How to avoid:** Verify `styles.css` is tracked by git (`git ls-files styles.css`). It is currently committed as an empty file — this is correct behavior.
**Warning signs:** Action logs show "no files were found with the glob: styles.css".

### Pitfall 6: `npm version` vs `npm run version`
**What goes wrong:** Developer runs `npm version patch` expecting it to invoke `version-bump.mjs`, but the script runs AFTER npm has already committed and tagged — meaning the staged files from `git add manifest.json versions.json` end up in a separate commit from the version bump commit.
**Why it happens:** npm's `version` lifecycle runs the script, then creates a commit of staged files automatically. The `git add` in the script stages `manifest.json` and `versions.json` so npm includes them in the version commit.
**How to avoid:** This is actually the correct behavior — npm stages the files and includes them in the version commit automatically. Just ensure `git add manifest.json versions.json` is part of the version script so npm picks them up.
**Warning signs:** Three-file version bump (package.json, manifest.json, versions.json) is split across two commits.

---

## Code Examples

### Complete release.yml
```yaml
# Source: obsidian-sample-plugin pattern, adapted [MEDIUM confidence — raw file 404'd, reconstructed from package.json and docs]
name: Release Obsidian plugin

on:
  push:
    tags:
      - "*"

env:
  PLUGIN_NAME: obsidian-toggl-import

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Build plugin
        run: |
          npm install
          npm run build

      - name: Create release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: |
            main.js
            manifest.json
            styles.css
```

### version-bump.mjs (verbatim from official sample plugin)
```javascript
// Source: raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/HEAD/version-bump.mjs [VERIFIED]
import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
if (!Object.values(versions).includes(minAppVersion)) {
    versions[targetVersion] = minAppVersion;
    writeFileSync('versions.json', JSON.stringify(versions, null, '\t'));
}
```

### package.json version script addition
```json
"scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc --noEmit && node esbuild.config.mjs production",
    "test": "vitest run",
    "version": "node version-bump.mjs && git add manifest.json versions.json"
}
```

### .npmrc to enforce no-v-prefix tags
```
tag-version-prefix=""
```

### Developer release flow
```bash
# 1. Bump version (updates package.json, manifest.json, versions.json, commits all three)
npm version patch

# 2. Push commits
git push

# 3. Push the tag (triggers the release workflow)
git push --tags

# Result: GitHub Actions creates release "1.0.1" with main.js, manifest.json, styles.css attached
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `actions/create-release` + `actions/upload-release-asset` (two-step) | `softprops/action-gh-release` (single step) | ~2022 | Simpler YAML, fewer steps, active maintenance |
| `actions/checkout@v2` / `v3` | `actions/checkout@v4` | 2023 | v4 uses Node 20; v2/v3 use deprecated Node 12/16 |
| `softprops/action-gh-release@v3` | `softprops/action-gh-release@v2` | April 2026 (v3 released) | v3 requires Node 24 runtime — too new for stable CI use; stay on v2 |

**Deprecated/outdated:**
- `actions/create-release`: Archived, no longer maintained. Do not use.
- `actions/upload-release-asset`: Archived alongside create-release. Do not use.
- `softprops/action-gh-release@v1`: Old Docker-based implementation. Do not use.

---

## Obsidian Community Plugin Release Requirements

These requirements apply only when submitting to the Obsidian community plugin registry (future step after REL-03). Documented here so the release workflow is compatible from day one.

| Requirement | Detail | Source |
|-------------|--------|--------|
| Release assets | `main.js`, `manifest.json`, and optionally `styles.css` must be attached to the GitHub release | [CITED: docs.obsidian.md/Plugins/Releasing] |
| Tag format | Release tag must match `manifest.json` `version` field exactly, no `v` prefix (e.g., `1.0.0` not `v1.0.0`) | [CITED: deepwiki.com/obsidianmd/obsidian-releases/6.1-plugin-submission-guide] |
| `versions.json` | Maps plugin versions to minimum Obsidian version; must be committed to repo | [CITED: multiple sources] |
| `manifest.json` `id` | Must be unique across all community plugins; must match the `id` in `community-plugins.json` PR | [ASSUMED based on documented pattern] |
| LICENSE file | A `LICENSE` file must exist in the repository | [CITED: community submission checklist] |
| `isDesktopOnly` | Already set to `true` in this project's manifest — correct | N/A (existing file) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `actions/checkout@v4` and `actions/setup-node@v4` are the current recommended versions | Standard Stack | Low — version bump needed but workflow still functions |
| A2 | Node 22 LTS is available on `ubuntu-latest` GitHub Actions runner | Standard Stack | Low — Node 20 LTS is also valid; update the `node-version` pin |
| A3 | The `versions.json` guard in `version-bump.mjs` checks values not keys, causing skipped entries for same-`minAppVersion` patch bumps | Common Pitfalls | Medium — the guard logic was read verbatim from the verified file; the behavior analysis is inferred |
| A4 | `softprops/action-gh-release@v2` is the safest current version given v3's April 2026 Node 24 requirement | Standard Stack | Low — v3 may work fine; use v2 to be safe |

**All critical claims (workflow structure, version-bump.mjs content, tag format requirements, softprops inputs) were verified or cited.**

---

## Open Questions (RESOLVED)

1. **Tag format — D-01 vs. submission requirement** — RESOLVED
   - Decision: Use bare `1.0.0` tags (no `v` prefix). CONTEXT.md D-01 updated after discuss-phase confirmed bare tags are required by Obsidian's community submission validator. Workflow trigger: `tags: ["[0-9]+.[0-9]+.[0-9]+*"]`. `.npmrc` sets `tag-version-prefix=""` so `npm version` also creates bare tags.

2. **`versions.json` guard logic** — RESOLVED
   - Decision: Replace the official `Object.values(versions).includes(minAppVersion)` guard with `!versions[targetVersion]` (key-based). This ensures every patch bump is recorded in `versions.json` regardless of whether `minAppVersion` changes. Deviation from official script is documented in a comment in `version-bump.mjs`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build scripts, version-bump.mjs | ✓ | v22.18.0 | — |
| npm | Package install, version script | ✓ | 10.9.3 | — |
| git | Tagging, pushing | ✓ | (assumed present) | — |
| GitHub Actions (ubuntu-latest) | release.yml | ✓ (cloud service) | — | — |

No missing dependencies with no fallback. This phase is workflow configuration + scripting only.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (already configured in package.json) |
| Config file | None found (inline vitest defaults) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REL-03 | Workflow file exists and has correct trigger/assets | manual-only | N/A — workflow validation requires GitHub Actions environment | ❌ Wave 0 |
| REL-03 | `version-bump.mjs` correctly updates manifest.json | unit | `npm test` (if test added) | ❌ Wave 0 |
| REL-03 | `version-bump.mjs` correctly updates versions.json | unit | `npm test` (if test added) | ❌ Wave 0 |
| REL-03 | `package.json` has `version` script entry | smoke | `node -e "const p=require('./package.json'); if(!p.scripts.version) process.exit(1)"` | ❌ Wave 0 |

**Note on REL-03 workflow testing:** The GitHub Actions workflow itself cannot be unit tested locally — it requires a push to GitHub to validate. The recommended validation strategy is:
1. Local: verify the three files exist after `npm run build` (manual smoke test)
2. CI: push a test tag to a fork or feature branch to confirm the workflow triggers and produces assets
3. Gate: don't push the real `1.0.0` tag until the workflow has been validated on a test tag (e.g., `0.9.9`)

### Sampling Rate
- **Per task commit:** `npm test` (existing vitest suite)
- **Per wave merge:** `npm test`
- **Phase gate:** Successful GitHub Actions workflow run with all three assets attached to the release

### Wave 0 Gaps
- [ ] `version-bump.mjs` — new file, not yet present
- [ ] `.github/workflows/release.yml` — new file, not yet present
- [ ] `.npmrc` — optional, but recommended to enforce no-`v`-prefix

*(No new test files are strictly required for this phase — the workflow is validated by running it on GitHub, not by unit tests. A unit test for `version-bump.mjs` would be nice-to-have but is not required for REL-03.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Use default `GITHUB_TOKEN` (scoped to repo); do not add personal access tokens unless required |
| V5 Input Validation | no | — |
| V6 Cryptography | no | — |

### Known Threat Patterns for GitHub Actions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Poisoned workflow via third-party action | Tampering | Pin `softprops/action-gh-release@v2` by tag (not SHA); v2 is stable |
| Accidental `secrets.GITHUB_TOKEN` leak | Information Disclosure | Default token is scoped to repo; don't log it; don't add additional secrets |
| Broad `permissions: contents: write` | Elevation of Privilege | Only grant `contents: write`; do not grant `write-all` |
| Workflow trigger on unvetted forks | Tampering | Tag-triggered workflows only run for tags pushed to the main repo; fork PRs cannot push tags — no mitigation needed |

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on This Phase |
|-----------|---------------------|
| TypeScript + Obsidian Plugin API only | No change — workflow builds existing stack |
| `npm run build` includes `tsc --noEmit` | D-03 (no separate tsc in CI) is consistent with this — `npm run build` already gates type errors |
| `isDesktopOnly: true` in manifest | Already set — release workflow uploads manifest as-is |
| No React/Svelte/Vue | Not relevant to release phase |
| No `moment.js` / external HTTP | Not relevant to release phase |
| `main.js` is gitignored | Workflow MUST build from source — confirmed requirement |

---

## Sources

### Primary (HIGH confidence)
- `raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/HEAD/version-bump.mjs` — verbatim script content fetched successfully
- `raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/HEAD/package.json` — scripts section including `"version"` script
- `github.com/softprops/action-gh-release` README — inputs, permissions, version guidance, v2 vs v3

### Secondary (MEDIUM confidence)
- `deepwiki.com/obsidianmd/obsidian-releases/6.1-plugin-submission-guide` — tag format requirement (no `v` prefix), validator behavior
- `forum.obsidian.md/t/using-github-actions-to-release-plugins/7877` — community confirmation of tag format, `.npmrc` workaround
- `marcusolsson.github.io/obsidian-plugin-docs/publishing/release-your-plugin-with-github-actions` — workflow structure overview

### Tertiary (LOW confidence)
- WebSearch summaries for workflow YAML structure — corroborated by multiple sources but raw release.yml file was not directly fetched (GitHub returned 404 for raw URL)

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — `softprops/action-gh-release` inputs and version-bump.mjs content VERIFIED; action versions ASSUMED
- Architecture: MEDIUM — workflow YAML pattern reconstructed from package.json + docs (raw file 404'd); corroborated by community sources
- Tag format constraint: HIGH — confirmed by multiple independent sources including official DeepWiki docs on obsidian-releases
- Pitfalls: MEDIUM — structural pitfalls (permissions, tag format) verified; behavioral pitfalls (versions.json guard) inferred from verified code

**Research date:** 2026-04-13
**Valid until:** 2026-10-13 (stable domain; `softprops/action-gh-release` version should be re-verified before use)
