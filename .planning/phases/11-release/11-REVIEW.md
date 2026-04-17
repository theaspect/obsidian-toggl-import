---
phase: 11-release
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - LICENSE
  - README.md
  - assets/config.png
  - assets/demo.png
  - manifest.json
  - package.json
  - versions.json
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed all release artifact files: plugin manifest, package metadata, version map, license, readme, and screenshots. The plugin id is consistent across all files (`obsidian-toggl-import`). Semver is valid and versions are in sync between `manifest.json` and `package.json`. The LICENSE is properly formed MIT text. Both screenshots exist and are non-trivially sized. No critical issues were found.

One warning exists: the `obsidian` devDependency is pinned to `"latest"`, making builds non-reproducible and at risk from future Obsidian API breaking changes. Two info items cover a missing `repository` field in `package.json` and an unusual `versions.json` mapping for the 1.0.0 historical entry.

## Warnings

### WR-01: `obsidian` devDependency pinned to `"latest"`

**File:** `package.json:19`
**Issue:** `"obsidian": "latest"` resolves to whatever version is current at `npm install` time. If Obsidian publishes a new type package with breaking API changes, CI builds and new contributor setups will silently pick up the breaking version. The Obsidian type package does occasionally introduce breaking type changes between minor versions.
**Fix:** Pin to the current resolved version. Check the installed version with `npm ls obsidian` and update `package.json` accordingly:
```json
"obsidian": "1.8.7"
```
This should be kept in sync with `minAppVersion` in `manifest.json` to signal the minimum compatible Obsidian release.

## Info

### IN-01: `package.json` missing `repository` field

**File:** `package.json`
**Issue:** The `package.json` has no `repository` field. While not required for an Obsidian plugin (it is not published to npm), the GitHub URL is referenced throughout the README (`https://github.com/theaspect/obsidian-toggl-import`). Adding the field makes the canonical source URL machine-readable and consistent.
**Fix:**
```json
"repository": {
  "type": "git",
  "url": "https://github.com/theaspect/obsidian-toggl-import.git"
},
```

### IN-02: `versions.json` 1.0.0 entry maps to `minAppVersion` of `"1.0.0"`

**File:** `versions.json:2`
**Issue:** The entry `"1.0.0": "1.0.0"` maps the initial plugin release to Obsidian `minAppVersion` 1.0.0. Obsidian 1.0.0 is a very old release (2022) and almost certainly predates API features used by the plugin. The Obsidian community plugin reviewer may flag this as inaccurate. The practical risk is low because `manifest.json` correctly advertises `1.8.7` (the current minimum), but the historical entry in `versions.json` is misleading.
**Fix:** If the actual minimum Obsidian version required at the time of 1.0.0 was higher, correct the mapping. If the plugin's 1.0.0 release did genuinely target Obsidian 1.8.x, update to:
```json
{
  "1.0.0": "1.8.7",
  "1.1.0": "1.8.7"
}
```
If the 1.0.0 Obsidian minimum is intentionally different, leave it and document why.

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
