# Roadmap: Obsidian Toggl Import Plugin

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-13)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-04-13</summary>

- [x] Phase 1: Scaffolding (1/1 plans) — completed 2026-04-09
- [x] Phase 2: Settings (1/1 plans) — completed 2026-04-10
- [x] Phase 3: API Client (2/2 plans) — completed 2026-04-10
- [x] Phase 4: Formatter (1/1 plans) — completed 2026-04-11
- [x] Phase 5: Command (2/2 plans) — completed 2026-04-13
- [x] Phase 6: Release (1/1 plans) — completed 2026-04-13

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Scaffolding | v1.0 | 1/1 | Complete | 2026-04-09 |
| 2. Settings | v1.0 | 1/1 | Complete | 2026-04-10 |
| 3. API Client | v1.0 | 2/2 | Complete | 2026-04-10 |
| 4. Formatter | v1.0 | 1/1 | Complete | 2026-04-11 |
| 5. Command | v1.0 | 2/2 | Complete | 2026-04-13 |
| 6. Release | v1.0 | 1/1 | Complete | 2026-04-13 |

Full milestone archive: `.planning/milestones/v1.0-ROADMAP.md`

## v1.1 Polish & Registry

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 7. CI Fixes | v1.1 | 2/2 | Complete | 2026-04-14 |
| 8. Security | v1.1 | 2/2 | Complete   | 2026-04-15 |
| 9. Import Behavior | v1.1 | 0/1 | Not started | - |
| 10. Formatting | v1.1 | 0/1 | Not started | - |
| 11. Release | v1.1 | 0/? | Not started | - |

### Phase 9: Import Behavior
**Goal**: Entries sort by start time ascending (configurable asc/desc) and the import command parses dates from note filenames with a yyyy-mm-dd prefix
**Requirements**: IMP-01, IMP-02
**Plans:** 1 plan

Plans:
- [x] 09-01-PLAN.md — Sort entries by start time (configurable asc/desc) + parse date from filename prefix

### Phase 10: Formatting
**Goal**: Users can define a custom template string using `${variable}` placeholders as a third format mode
**Requirements**: FMT-01
**Plans:** 1 plan

Plans:
- [ ] 10-01-PLAN.md — Template format mode: evaluator, formatter branch, settings UI

### Phase 11: Release
**Goal**: README is complete and a community plugin registry submission PR is opened
**Requirements**: REL-01, REL-02
