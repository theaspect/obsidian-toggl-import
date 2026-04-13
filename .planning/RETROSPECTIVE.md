# Retrospective: Obsidian Toggl Import Plugin

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-13
**Phases:** 6 | **Plans:** 8 | **Commits:** 80

### What Was Built

- Plugin scaffold with esbuild + TypeScript, correct manifest structure, safe settings merge pattern
- Settings tab: masked API token, storage warning, format selection, 5 column toggles, conditional delimiter
- Toggl v9 API client: Basic Auth, UTC-to-local date boundaries, session-cached project names, running-entry filtering
- `formatEntries()`: GFM Markdown table and delimited plain text, human-readable durations
- Import command: 5-step guard chain (no file → non-date → no token → API error → empty results), appends on reimport
- GitHub Actions release workflow: semver tag triggers asset attachment; atomic version-bump script

### What Worked

- **TDD RED→GREEN** for API client (Phase 3) and command (Phase 5) caught integration issues before implementation — test contracts were clear and the GREEN phase was smooth
- **Single-plan phases** (1, 2, 4, 6) executed without deviation — well-scoped upfront
- **`requestUrl` over native fetch** was the right call; using the Obsidian abstraction avoided potential CORS/Electron issues
- **Phase sequencing** was clean — each phase had a clear dependency on the previous, no cross-cutting surprises

### What Was Inefficient

- **Requirements traceability table never updated** — all 22 requirements were implemented but never checked off during execution, requiring the "proceed with known gaps" path at milestone completion
- **ROADMAP.md phase checkboxes** were only updated for Phase 6 — phases 1-5 remained unchecked despite being complete, creating a misleading view
- **Phase SUMMARY.md one-liner field** was missing or malformed for phases 3-01 and 5-01 — the CLI extracted noise (bug fix descriptions) instead of clean accomplishment summaries

### Patterns Established

- Bare semver tags (no `v` prefix) required by Obsidian community registry — `manifest.json` version must equal the git tag exactly
- `keyof TogglImportSettings['columns']` is the correct type annotation for column key arrays in settings to avoid TS2683/TS7053
- `--legacy-peer-deps` needed for vitest install due to peer conflict with `obsidian@latest` + TypeScript 6.x
- vitest `vi.hoisted()` + `vi.mock()` pattern established in `tests/api.test.ts` — reused verbatim in `tests/command.test.ts`

### Key Lessons

- Update requirements traceability and ROADMAP checkboxes **during** each phase verification, not at milestone close
- Populate the `one_liner` field in SUMMARY.md frontmatter consistently — the CLI uses it for milestone reports
- A test-run tag (e.g. `0.9.9`) should be pushed before the real release tag to verify GitHub Actions workflow end-to-end

### Cost Observations

- Sessions: ~6 across 4 days
- No model mix data available
- Notable: TDD approach added one extra plan per phase (RED scaffold) but eliminated debugging time in GREEN phase — net positive

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Duration (days) | 4 |
| Phases | 6 |
| Plans | 8 |
| Tests at ship | 49 |
| LOC (TypeScript) | 1,036 |
| Commits | 80 |
| Deviations | 2 (peer dep fix, TS type annotation) |
