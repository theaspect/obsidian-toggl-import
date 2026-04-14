# Roadmap: Obsidian Toggl Import Plugin

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-13)
- **v1.1 Polish & Registry** — Phases 7-11 (active)

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

### v1.1 Polish & Registry

- [ ] **Phase 7: CI Fixes** — CI pipeline passes cleanly on current Node.js and dependency versions
- [ ] **Phase 8: Settings UX & Security** — Users can verify their API token and trust that it is stored securely
- [ ] **Phase 9: Import Improvements** — Imported entries are reliably ordered and the date-matching rule handles real-world note filenames
- [ ] **Phase 10: Template Format** — Users can format entries with a custom template string as a third format mode
- [ ] **Phase 11: README & Registry Release** — Plugin is documented for end users and submitted to the Obsidian community plugin registry

## Phase Details

### Phase 7: CI Fixes
**Goal**: The CI pipeline passes cleanly on current Node.js and dependency versions
**Depends on**: Nothing (infrastructure fix)
**Requirements**: CI-01, CI-02
**Success Criteria** (what must be TRUE):
  1. GitHub Actions workflow completes without errors on a clean push to the repository
  2. `npm install` in CI resolves with zero peer dependency warnings or conflicts
  3. The release workflow triggers and attaches assets correctly when a semver tag is pushed
**Plans**: TBD

### Phase 8: Settings UX & Security
**Goal**: Users can verify their API token works and trust it is not stored in plaintext
**Depends on**: Phase 7
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. A "Test Connection" button (or equivalent) appears in the settings tab and shows a success notice when the token is valid
  2. A "Test Connection" attempt with an invalid or empty token shows a clear failure notice without crashing
  3. After saving a valid API token, the token value is no longer visible in the plugin's data.json file
  4. Reloading Obsidian after saving the token does not require re-entering it — the plugin retrieves it from SecretStorage automatically
**Plans**: TBD
**UI hint**: yes

### Phase 9: Import Improvements
**Goal**: Imported entries are reliably sorted and the command works for notes with descriptive filenames
**Depends on**: Phase 7
**Requirements**: IMP-01, IMP-02
**Success Criteria** (what must be TRUE):
  1. Running "Import Toggl Entries" on any date inserts entries in start-time ascending order (earliest entry first)
  2. The command succeeds and imports the correct entries when the active note filename begins with a yyyy-mm-dd prefix followed by additional text (e.g. "2026-12-31 Daily Review.md")
  3. The command continues to work for notes whose filename is exactly yyyy-mm-dd with no suffix
**Plans**: TBD

### Phase 10: Template Format
**Goal**: Users can define a custom template string to format each entry exactly as they want
**Depends on**: Phase 9
**Requirements**: FMT-01
**Success Criteria** (what must be TRUE):
  1. A third format option ("Template") appears in the format dropdown in settings
  2. Selecting "Template" reveals a text field where the user can enter a string with `${variable}` placeholders (description, start, duration, tags, project)
  3. Running "Import Toggl Entries" with the template format selected inserts each entry rendered by the template string, one line per entry
  4. Unknown placeholders in the template are left as-is or produce an empty string rather than causing an error
**Plans**: TBD
**UI hint**: yes

### Phase 11: README & Registry Release
**Goal**: The plugin is fully documented for end users and a registry submission PR is opened
**Depends on**: Phase 8, Phase 10
**Requirements**: REL-01, REL-02
**Success Criteria** (what must be TRUE):
  1. README.md contains a product overview, manual installation steps, BRAT installation steps, a usage walkthrough, a settings reference, and development setup instructions
  2. The repository passes the Obsidian community plugin validator with no blocking issues
  3. A pull request is opened against the obsidian-releases repository with the plugin entry added to community-plugins.json
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Scaffolding | v1.0 | 1/1 | Complete | 2026-04-09 |
| 2. Settings | v1.0 | 1/1 | Complete | 2026-04-10 |
| 3. API Client | v1.0 | 2/2 | Complete | 2026-04-10 |
| 4. Formatter | v1.0 | 1/1 | Complete | 2026-04-11 |
| 5. Command | v1.0 | 2/2 | Complete | 2026-04-13 |
| 6. Release | v1.0 | 1/1 | Complete | 2026-04-13 |
| 7. CI Fixes | v1.1 | 0/? | Not started | - |
| 8. Settings UX & Security | v1.1 | 0/? | Not started | - |
| 9. Import Improvements | v1.1 | 0/? | Not started | - |
| 10. Template Format | v1.1 | 0/? | Not started | - |
| 11. README & Registry Release | v1.1 | 0/? | Not started | - |

Full milestone archive: `.planning/milestones/v1.0-ROADMAP.md`
