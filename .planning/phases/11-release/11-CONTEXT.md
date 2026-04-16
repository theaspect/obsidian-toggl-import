# Phase 11: Release - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Write a complete README.md and open a community plugin registry submission PR to the obsidianmd/obsidian-releases GitHub repo. Covers README content, manifest/package.json cleanup, LICENSE file creation, and version bump to 1.1.0 before submission. Plugin feature development is complete.

</domain>

<decisions>
## Implementation Decisions

### Version Bump
- **D-01:** Bump version to `1.1.0` before submission. Update `manifest.json`, `package.json`, and `versions.json`. v1.1 added real features (SecretStorage auth, sort order, filename prefix parsing, custom template format) — submitting as 1.0.0 would misrepresent the shipped state.

### Author / Manifest Metadata
- **D-02:** `authorUrl` in `manifest.json` = `https://github.com/theaspect`
- **D-03:** `author` field in `manifest.json` and `package.json` = `Constantine`
- **D-04:** A `LICENSE` file (MIT) must be created in the repo root — required by the Obsidian community plugin registry.

### README Structure
REL-01 requires these sections in this order:
1. Product overview (what it does, core value)
2. Manual installation (step-by-step with exact file paths)
3. BRAT installation (brief steps + link to BRAT plugin page)
4. Usage walkthrough (how to use the import command)
5. Settings reference (all configurable options documented)
6. Development setup (how to build/test locally)

- **D-05:** Manual installation is step-by-step with exact file paths (vault plugin folder, which files to copy: `main.js`, `manifest.json`, enable in Obsidian settings).
- **D-06:** BRAT installation is brief steps (install BRAT, use "Add Beta Plugin", paste repo URL) with a link to the BRAT plugin page — not a full walkthrough.

### Screenshot / Media
- **D-07:** Include one static screenshot showing the plugin output in a daily note (a formatted table or plain text block result).
- **D-08:** Screenshot stored in `assets/` folder in repo root; referenced in README as `![demo](assets/demo.png)` (or similar filename). The `assets/` directory is created as part of this phase. The actual screenshot is a placeholder task — the planner should include a task noting that a screenshot must be added manually before the submission PR is opened.

### Registry Submission
- **D-09:** The submission PR target is `obsidianmd/obsidian-releases` on GitHub. The PR adds one line to `community-plugins.json` with the plugin's id, name, author, description, and repo fields.
- **D-10:** Before opening the PR: verify all registry checklist items pass (LICENSE present, README complete, manifest valid, no hardcoded credentials, CI passing).

### Claude's Discretion
- Exact wording and formatting within README sections (tone, header hierarchy)
- Whether to use a `docs/` folder or `assets/` for screenshot (either is fine; `assets/` was chosen above)
- MIT license template text (use the standard SPDX MIT text with current year and author name)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §REL-01, §REL-02 — acceptance criteria for this phase

### Manifest and registry
- `manifest.json` — current plugin metadata; fields to update: `version`, `author`, `authorUrl`
- `package.json` — update `version` and `author` fields to match manifest
- `versions.json` — add `"1.1.0": "1.8.7"` entry for the new version

### Reference: Obsidian plugin submission checklist
The Obsidian community plugin registry submission requirements are documented at:
https://github.com/obsidianmd/obsidian-releases (README and PR template)
Key requirements: LICENSE file, README.md, valid manifest.json (id, name, author, authorUrl, description, version, minAppVersion, isDesktopOnly), no hardcoded secrets, no external asset loading from untrusted domains.

No project-internal ADRs for this phase — all decisions captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `manifest.json` — existing manifest; only `version`, `author`, `authorUrl` need updating
- `package.json` — existing package file; only `version` and `author` need updating
- `version-bump.mjs` — existing version bump script (run via `npm run version`); handles manifest + versions.json; can be used to perform the 1.1.0 bump
- `.github/workflows/release.yml` — existing release workflow; triggers on semver tags; already configured correctly for the release

### Established Patterns
- Bare semver tags (no `v` prefix) — confirmed Key Decision in PROJECT.md; tag `1.1.0` not `v1.1.0`
- `versions.json` format: `"version": "minAppVersion"` — add `"1.1.0": "1.8.7"`

### Integration Points
- README.md is a new file at the repo root (currently absent)
- LICENSE is a new file at the repo root (currently absent)
- `assets/` is a new directory at the repo root for screenshot placeholder

</code_context>

<specifics>
## Specific Ideas

- `authorUrl` = `https://github.com/theaspect` (provided directly by user)
- Author name = `Constantine`
- Screenshot in `assets/` folder

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-release*
*Context gathered: 2026-04-16*
