---
phase: 01-scaffolding
plan: 01
subsystem: infra
tags: [esbuild, typescript, obsidian-plugin, manifest]

# Dependency graph
requires: []
provides:
  - Compilable Obsidian plugin skeleton building to main.js via esbuild
  - package.json with esbuild 0.28.0, typescript 6.0.2, obsidian latest
  - tsconfig.json configured for Obsidian plugin (moduleResolution node, strict null checks)
  - esbuild.config.mjs with obsidian/electron externals, CJS output
  - manifest.json with id obsidian-toggl-import, isDesktopOnly true
  - src/main.ts with TogglImportSettings interface and DEFAULT_SETTINGS
  - Three-argument Object.assign merge pattern for settings loading
affects: [02-settings, 03-api-client, 04-formatter, 05-command, 06-release]

# Tech tracking
tech-stack:
  added:
    - esbuild 0.28.0 (bundler)
    - typescript 6.0.2 (type checker only, noEmit)
    - obsidian latest (API types + Plugin/requestUrl)
    - tslib ^2.8.1 (required by importHelpers: true in tsconfig)
    - "@types/node ^16.11.6 (build script types only)"
  patterns:
    - "Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) — three-arg merge prevents DEFAULT_SETTINGS mutation"
    - "tsc --noEmit as type-check gate before esbuild bundle in npm run build"
    - "obsidian marked as external in esbuild — runtime-provided by Obsidian app"

key-files:
  created:
    - package.json
    - tsconfig.json
    - esbuild.config.mjs
    - manifest.json
    - versions.json
    - src/main.ts
    - styles.css
    - .gitignore
  modified: []

key-decisions:
  - "Used ignoreDeprecations:6.0 in tsconfig to silence TS6 deprecation warnings for baseUrl and moduleResolution:node (both still correct for Obsidian plugin; TS7 migration deferred)"
  - "Added tslib as devDependency — required by importHelpers:true in tsconfig (from sample plugin pattern)"
  - "apiToken defaults to empty string in DEFAULT_SETTINGS — prevents accidental API calls before user configures token"

patterns-established:
  - "Pattern: Three-argument Object.assign merge for settings — Object.assign({}, DEFAULT_SETTINGS, loaded)"
  - "Pattern: tsc --noEmit type-check gate before esbuild bundle in build script"
  - "Pattern: obsidian/electron/@codemirror/*/@lezer/*/node:* all marked external in esbuild"

requirements-completed: [REL-01, REL-02]

# Metrics
duration: 15min
completed: 2026-04-09
---

# Phase 01 Plan 01: Scaffolding Summary

**esbuild + TypeScript 6.0.2 plugin scaffold with TogglImportSettings interface, three-arg Object.assign merge, and manifest id obsidian-toggl-import**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-09T13:30:00Z
- **Completed:** 2026-04-09T13:43:38Z
- **Tasks:** 3
- **Files modified:** 8 created

## Accomplishments
- Build pipeline working: `npm run build` produces 845b `main.js` with zero type errors
- Plugin skeleton with fully-typed `TogglImportSettings` interface covering all Phase 2-5 settings fields
- Three-argument `Object.assign` merge pattern established, preventing DEFAULT_SETTINGS mutation
- Manifest correctly configured: `id: obsidian-toggl-import`, `isDesktopOnly: true`, `minAppVersion: 1.0.0`
- No native fetch in src/ — requestUrl will be the sole HTTP abstraction

## Task Commits

Each task was committed atomically:

1. **Task 1: Create build tooling** - `c660636` (chore)
2. **Task 2: Create plugin files** - `90beb49` (feat)
3. **Task 3: Build verification + auto-fixes** - `3f4c0f7` (fix)

## Files Created/Modified
- `package.json` - Build scripts, devDependencies (esbuild, typescript, obsidian, tslib)
- `tsconfig.json` - TypeScript config with ignoreDeprecations:6.0, moduleResolution node, strict null checks
- `esbuild.config.mjs` - esbuild bundler: src/main.ts → main.js CJS, obsidian external
- `manifest.json` - Plugin metadata: id obsidian-toggl-import, isDesktopOnly true
- `versions.json` - Version mapping: 1.0.0 → 1.0.0
- `src/main.ts` - Plugin entry point, TogglImportSettings, DEFAULT_SETTINGS, three-arg Object.assign
- `styles.css` - Empty stylesheet (required for Phase 6 release assets)
- `.gitignore` - Excludes node_modules/, main.js, data.json, *.js.map
- `package-lock.json` - Lockfile for reproducible installs

## Decisions Made
- Added `ignoreDeprecations: "6.0"` to tsconfig — TypeScript 6.0.2 deprecated `baseUrl` and `moduleResolution: "node"` (now called `node10`); both settings are still correct for Obsidian plugin compatibility; TS7 migration is future work
- Added `tslib` as devDependency — required by `importHelpers: true` in tsconfig (inherited from obsidian-sample-plugin pattern); build fails without it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript 6.0 deprecation warnings blocking build**
- **Found during:** Task 3 (build verification)
- **Issue:** `tsc --noEmit` exited with code 2 — TS6.0.2 deprecated `baseUrl` and `moduleResolution: "node"` options; error TS5101 and TS5107
- **Fix:** Added `"ignoreDeprecations": "6.0"` to `compilerOptions` in tsconfig.json
- **Files modified:** `tsconfig.json`
- **Verification:** `tsc --noEmit` exits with code 0
- **Committed in:** `3f4c0f7`

**2. [Rule 3 - Blocking] Missing tslib dependency**
- **Found during:** Task 3 (build verification)
- **Issue:** After fixing deprecations, build failed with TS2354: "module 'tslib' cannot be found" — required by `importHelpers: true` in tsconfig
- **Fix:** Ran `npm install --save-dev tslib`, added tslib ^2.8.1 to devDependencies
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run build` completes successfully
- **Committed in:** `3f4c0f7`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for the build to succeed. No scope creep. The tslib dependency is a standard companion to `importHelpers: true` from the sample plugin tsconfig pattern.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Build pipeline is fully operational: `npm run build` produces valid CJS `main.js`
- `src/main.ts` exports `TogglImportSettings`, `DEFAULT_SETTINGS`, and `TogglImportPlugin` — Phase 2 settings tab can import and extend directly
- `requestUrl` not yet imported (correct — Phase 3 API client introduces it)
- No blockers for Phase 2 settings UI

---
*Phase: 01-scaffolding*
*Completed: 2026-04-09*
