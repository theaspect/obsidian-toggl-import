# Requirements: Obsidian Toggl Import Plugin

**Defined:** 2026-04-14
**Core Value:** One command pulls the day's Toggl entries into your daily note, formatted exactly how you want them — no manual copying.

## v1.1 Requirements

### CI / Infrastructure

- [ ] **CI-01**: GitHub Actions workflow runs on Node.js 24 compatible action versions (actions/checkout, actions/setup-node)
- [ ] **CI-02**: `npm install` resolves cleanly in CI with no peer dependency conflicts between obsidian and @codemirror/state

### Settings / Security

- [ ] **SEC-01**: User can test their Toggl API token from the settings tab and see a clear success or failure notice
- [ ] **SEC-02**: API token is stored in Obsidian SecretStorage instead of plaintext plugin data

### Import Behavior

- [ ] **IMP-01**: Imported entries are sorted by start time in ascending order by default
- [ ] **IMP-02**: The import command matches the date when the note filename starts with a yyyy-mm-dd prefix (e.g. "2026-12-31 Foo Bar.md")

### Formatting

- [ ] **FMT-01**: User can define a custom template string using `${variable}` placeholders (available: description, start, duration, tags, project) as a third format mode

### Release

- [ ] **REL-01**: README.md covers product overview, manual installation, BRAT installation, usage walkthrough, settings reference, and development setup
- [ ] **REL-02**: Plugin meets all Obsidian community plugin registry requirements and a submission PR is opened

## v2 Requirements

*(Deferred from v1.0 out-of-scope)*

- **COL-01**: Column reordering via drag-and-drop
- **COL-02**: Project color column
- **COL-03**: End time column

## Out of Scope

| Feature | Reason |
|---------|--------|
| Date picker | Active note filename is the date source |
| Auto-import on note open | Creates duplicates; silent background API calls |
| Workspace selection | Use default workspace; single-user scope |
| Per-note format override | Global setting only |
| Mobile support | Electron-specific; `isDesktopOnly: true` from day one |
| Bidirectional sync | Fundamentally different product |
| Sort order setting (asc/desc toggle) | Ascending is always the right default; defer configurability |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CI-01 | Phase 7 | Pending |
| CI-02 | Phase 7 | Pending |
| SEC-01 | Phase 8 | Pending |
| SEC-02 | Phase 8 | Pending |
| IMP-01 | Phase 9 | Pending |
| IMP-02 | Phase 9 | Pending |
| FMT-01 | Phase 10 | Pending |
| REL-01 | Phase 11 | Pending |
| REL-02 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after v1.1 milestone start*
