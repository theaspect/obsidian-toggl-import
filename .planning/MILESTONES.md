# Milestones

## v1.0 MVP (Shipped: 2026-04-13)

**Phases completed:** 6 phases, 8 plans
**Timeline:** 2026-04-09 → 2026-04-13 (4 days)
**Code:** 1,036 TypeScript LOC, 78 files changed

**Key accomplishments:**

- Plugin scaffold built with esbuild + TypeScript, manifest id `obsidian-toggl-import`, `isDesktopOnly: true`, three-arg merge pattern for safe settings upgrades
- Settings tab with masked API token input, plaintext storage warning, format dropdown, 5 column toggles, and conditional delimiter field
- Toggl v9 API client with Basic Auth, local-date UTC boundaries, session-cached project names, running entry filtering — 14 TDD tests green
- `formatEntries()` producing valid GFM Markdown table or delimited plain text with human-readable durations — 26 vitest unit tests
- "Import Toggl Entries" command with 5-step guard chain, appends-on-reimport, 49 tests green, UAT approved (all 7 scenarios)
- Tag-triggered GitHub Actions release workflow with `softprops/action-gh-release@v2` and atomic version-bump script

**Known Gaps:**

- Requirements traceability table in REQUIREMENTS.md was never updated during execution (all 22 v1 requirements were implemented but not checked off in the traceability table)

---
