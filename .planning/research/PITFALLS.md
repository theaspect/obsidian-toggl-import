# Pitfalls Research

**Domain:** Obsidian community plugin + Toggl Track API v9 integration
**Researched:** 2026-04-09
**Confidence:** MEDIUM (training knowledge through August 2025; web verification unavailable in this session — flag for spot-check before implementation)

---

## Critical Pitfalls

### Pitfall 1: Toggl Returns UTC — Naive Date Filtering Cuts Off the Wrong Entries

**What goes wrong:**
The Toggl v9 API returns `start` and `stop` as ISO 8601 strings in UTC (e.g., `2024-03-15T22:30:00+00:00`). If you build the date range filter from the note's filename without timezone-adjusting the boundaries, users in UTC-5 will lose the last 5 hours of their workday (entries from 19:00–23:59 local time fall on the *next* UTC date) and users in UTC+10 will get the first 10 hours of the *previous* UTC day mixed in.

**Why it happens:**
Developers construct `start_date`/`end_date` query params directly from the yyyy-mm-dd filename (`2024-03-15T00:00:00Z` to `2024-03-15T23:59:59Z`) in UTC, ignoring that the user's "day" spans a different UTC range. The Toggl API's `start_date` and `end_date` parameters interpret the provided value relative to the timezone offset specified — if you omit offset or force Z, you get UTC boundaries.

**How to avoid:**
- Use the Toggl v9 `/me/time_entries` endpoint with `start_date` and `end_date` params expressed as local-timezone ISO 8601 strings: `2024-03-15T00:00:00+05:00`.
- Detect the user's UTC offset at command execution time via `new Date().getTimezoneOffset()` (returns minutes west of UTC — negate and format as `±HH:MM`).
- Alternatively, use `Intl.DateTimeFormat().resolvedOptions().timeZone` to get the IANA tz name, but this requires a tz database for conversion; the offset approach is simpler and sufficient for a single-user plugin.
- When *displaying* `start` times (e.g., "09:15"), parse the UTC string and convert to local time before formatting — never display raw UTC hours.

**Warning signs:**
- Users report missing entries for late-evening work.
- Users in eastern timezones (UTC+) report entries from the previous day appearing.
- Unit tests that pass in UTC CI but fail when developer runs locally in a non-UTC zone.

**Phase to address:**
Core API integration phase (when fetching and displaying entries for the first time). Must be solved before any UI work, not retrofitted.

---

### Pitfall 2: Running (In-Progress) Entries Have No `stop` Time

**What goes wrong:**
Toggl entries that are currently running have `stop: null` (or `duration: -<unix_timestamp>`). If the plugin is invoked while a timer is active, the code crashes on `entry.stop` being null, or calculates a nonsensical duration by treating null as 0.

**Why it happens:**
Developers test with completed entries. The null-stop case is only hit when the user imports mid-day while a timer is running — an extremely common real-world workflow that gets missed in dev testing.

**How to avoid:**
- Explicitly filter out entries where `stop` is null OR where `duration` is negative (Toggl v9 encodes running entries as `duration = -(unix start timestamp)`).
- Alternatively, display running entries with a placeholder duration ("running...") and omit them from duration totals.
- Add a test case specifically for a running entry (null stop, negative duration).

**Warning signs:**
- NaN or "Invalid Date" appearing in output for one user.
- Crashes only reported by users who run the import while actively tracking time.

**Phase to address:**
Core API integration phase. Add the null-guard before any formatting logic is written.

---

### Pitfall 3: `requestUrl` vs `fetch` — CORS and CSP Failures on Desktop

**What goes wrong:**
Using the browser `fetch` API or `XMLHttpRequest` directly inside an Obsidian plugin works in some contexts but fails in others due to Electron's Content Security Policy and CORS restrictions on external API calls. The Toggl API does not send CORS headers permissive enough for Electron's renderer process.

**Why it happens:**
Obsidian runs in Electron. The renderer process is subject to CSP. Many plugin authors copy-paste `fetch` usage from web tutorials without realizing Obsidian provides its own `requestUrl` function (from `obsidian` package) specifically to work around these restrictions by routing through the main process.

**How to avoid:**
- Always use `requestUrl` from the `obsidian` package for all HTTP calls — never `fetch`, `XMLHttpRequest`, or `axios` directly.
- `requestUrl` signature: `requestUrl({ url, method, headers, body })` returning `RequestUrlResponse`.
- Basic auth for Toggl: set `Authorization: Basic <base64(token:api_token)>` in the headers object.
- Do NOT use `node-fetch` or similar Node.js HTTP libraries unless you verify they bypass Electron's renderer restrictions.

**Warning signs:**
- "Failed to fetch" or CORS errors in DevTools console.
- Works in development with `--disable-web-security` but fails in production.
- Tests pass in Node.js but plugin fails at runtime.

**Phase to address:**
Core API integration phase. Set up the HTTP abstraction layer first, before writing any business logic that calls the API.

---

### Pitfall 4: Manifest Version Mismatch Blocks Community Plugin Review

**What goes wrong:**
The Obsidian community plugin review process requires `manifest.json`'s `minAppVersion` to match a real Obsidian release, `version` to match the git tag, and the release to include `manifest.json`, `main.js`, and `styles.css` as release assets. Mismatches cause automated rejection or manual review failure.

**Why it happens:**
Developers copy a sample `manifest.json` and forget to update `minAppVersion` to the current Obsidian minimum, or publish a GitHub release without attaching all three required files. Version in `manifest.json` and `versions.json` getting out of sync with the git tag is the most common cause of review rejection.

**How to avoid:**
- Set `minAppVersion` to the oldest Obsidian version you tested against — do not set it to `"0.0.0"` (will be rejected) or a version newer than current stable (blocks users on older installs).
- `versions.json` maps plugin version strings to minimum Obsidian app versions — keep it updated with every release.
- GitHub Actions release workflow must attach `main.js`, `manifest.json`, and `styles.css` to the release. The community plugin list pulls assets from the GitHub release, not the repo root.
- `id` in `manifest.json` must be globally unique across all community plugins (check the community plugins list for collisions before submission).

**Warning signs:**
- PR to `obsidianmd/obsidian-releases` is rejected with version mismatch message.
- Users report "plugin not found" after install because release assets are missing.
- `manifest.json` version is `1.0.0` but git tag is `v0.1.0`.

**Phase to address:**
Release/publishing phase. Set up the release workflow (GitHub Actions) as part of project scaffolding so it's never an afterthought.

---

### Pitfall 5: Settings Migration — Breaking Old Installs on Schema Change

**What goes wrong:**
When the settings schema changes between plugin versions (e.g., adding a new field, renaming a field, changing a field's type), users who already have settings saved get undefined/null values for the new fields or a crash on load because the persisted JSON no longer matches the expected shape.

**Why it happens:**
Obsidian plugins store settings via `this.loadData()` / `this.saveData()` which does a plain JSON round-trip. There is no schema version or migration layer. Adding a new settings field without a default value leaves existing installs with `undefined` for that field.

**How to avoid:**
- Always define a `DEFAULT_SETTINGS` constant with defaults for every field.
- Use `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` (or spread equivalent) so new fields get their defaults while preserving user values. This is the canonical Obsidian pattern.
- When renaming or removing a field, add an explicit migration block in `onload()` that detects the old field and transforms it.
- Treat settings as a versioned schema from day one — add a `schemaVersion` field even in v1 so future migrations have a reference point.

**Warning signs:**
- Console errors like "Cannot read property X of undefined" after plugin update.
- Settings UI shows blank/empty for fields that should have values.
- User reports that their column order was reset after update.

**Phase to address:**
Plugin scaffolding phase (initial setup). The DEFAULT_SETTINGS pattern must be established before any settings fields are added.

---

### Pitfall 6: Duplicate Entry Insertion on Re-Run

**What goes wrong:**
The requirement says "running the command again appends new entries rather than replacing existing ones." Without a deduplication strategy, running the import twice on the same day inserts all entries twice — or if new entries arrived since the first run, it inserts duplicates of the old entries plus the new ones appended once.

**Why it happens:**
True idempotent append (insert only genuinely new entries) requires tracking what was already inserted. The naive implementation just fetches all entries and appends them unconditionally.

**How to avoid:**
- Define what "already inserted" means. Options: (a) track inserted entry IDs in plugin data; (b) parse the existing note content to detect already-present entries; (c) always replace a tagged block rather than appending.
- Simplest viable approach: wrap inserted content in a sentinel comment block (`<!-- toggl-import:START -->` ... `<!-- toggl-import:END -->`) and replace the block contents on re-run rather than appending. This makes re-runs idempotent without ID tracking.
- If pure append is required (per the requirement "appends new entries"), track a per-date set of inserted Toggl entry IDs in plugin storage and skip entries whose IDs are already present.
- Do not parse your own previously-generated markdown to detect duplicates — fragile and breaks if user edits the table.

**Warning signs:**
- User reports doubled entries after running command twice.
- Integration test for re-run shows 2x the expected rows.

**Phase to address:**
Core insertion logic phase. Decide on the deduplication strategy before writing the insert function — retrofitting is painful.

---

### Pitfall 7: API Token Stored in Plain Text in Synced Vault

**What goes wrong:**
Obsidian plugin settings are stored in `.obsidian/plugins/<plugin-id>/data.json` inside the vault. Most users sync their vault with iCloud, Obsidian Sync, Git, or Dropbox. An API token stored there is effectively committed to cloud storage and potentially version control — a credential leak.

**Why it happens:**
`this.saveData()` writes to `data.json` with no encryption. It's the standard mechanism and developers use it without considering that vaults are synced.

**How to avoid:**
- Warn users explicitly in the settings UI: "Your API token is stored in your vault's plugin data and may be synced. Do not commit your vault to a public repository."
- Consider using the system keychain via an Obsidian API if/when one becomes available, but as of 2025 no native keychain API exists in Obsidian.
- Do not try to encrypt the token yourself with a hardcoded key — it provides no real security (the key ships with the plugin).
- The practical mitigation is documentation: make the risk visible, let users decide. Toggl API tokens have limited scope (read/write only to that Toggl account) so the blast radius is bounded.

**Warning signs:**
- User opens a GitHub issue asking "is the API token secure?"
- Users with public vaults accidentally expose their token.

**Phase to address:**
Settings UI phase. Add the warning text when building the settings tab.

---

### Pitfall 8: Toggl API Rate Limiting — Silent Failures on Retry

**What goes wrong:**
The Toggl v9 API enforces rate limits (approximately 1 request/second per user token for the free tier; the exact limits are documented as roughly 1 req/sec sustained). Exceeding the limit returns HTTP 429. If the plugin doesn't handle 429 responses, it silently shows no entries or throws an unhandled error — and the user doesn't know why.

**Why it happens:**
A single import command fires one API request, which is well within rate limits. The problem arises if the plugin is extended with multiple requests (e.g., fetching workspace info + user info + time entries sequentially) or if a user triggers the command rapidly. Without 429 handling, the failure is silent.

**How to avoid:**
- Check the HTTP status code from `requestUrl` response — a non-2xx status must be surfaced to the user with a message, not silently swallowed.
- For a single-request import, rate limiting is unlikely to be a real problem. The mitigation is good error handling: if status is 429, show "Toggl API rate limit reached — wait a moment and try again."
- Do not implement automatic retry with exponential backoff for v1 — it adds complexity without real user benefit for a command-triggered plugin.

**Warning signs:**
- User reports "import ran but no entries appeared" — no error shown.
- 429 responses in DevTools network tab.

**Phase to address:**
Core API integration phase. Error handling must be part of the initial HTTP layer, not added later.

---

### Pitfall 9: Filename Parsing — Non-Daily-Note Files and Edge Cases

**What goes wrong:**
The command reads the active note's filename as the date. If the user accidentally runs the command on a non-daily note (e.g., `Meeting Notes.md`, `2024-Q1-Review.md`), the date parse either silently uses a wrong date, extracts a partial date (e.g., `2024-01-01` from `2024-01-01 Project Kickoff.md`), or crashes.

**Why it happens:**
Developers test only with well-formed `yyyy-mm-dd.md` filenames. The extraction logic uses `basename(path, '.md')` and passes it directly to `new Date()` — which is forgiving to the point of being wrong on partial strings.

**How to avoid:**
- Validate the filename strictly with a regex: `/^\d{4}-\d{2}-\d{2}$/.test(basename)` before proceeding.
- If validation fails, show a clear notice: "Active note filename is not a valid date (expected yyyy-mm-dd). Open a daily note first."
- Do not attempt to extract a date from a longer filename — require exact match to avoid false positives.
- Validate that the parsed date is a real date (month 1–12, day within month) — `2024-13-01` passes a regex but is not a real date.

**Warning signs:**
- User reports entries from a random date appearing in a project note.
- Silent import with 0 entries because the date parsed to an invalid API param.

**Phase to address:**
Core command logic phase. This is the first thing the command handler should do before any API call.

---

### Pitfall 10: Obsidian Plugin API — Using Deprecated or Removed APIs

**What goes wrong:**
Obsidian's plugin API evolves between versions and occasionally deprecates methods. Plugins using deprecated editor APIs (e.g., older CodeMirror 5 APIs that were valid pre-0.13, or direct `app.workspace.activeLeaf` access patterns) break silently or throw errors when Obsidian updates.

**Why it happens:**
Copying examples from old tutorials or Stack Overflow answers that predate Obsidian's CM6 migration (v0.13+). The sample plugin and official docs are the authoritative source, but developers find dated third-party resources.

**How to avoid:**
- Use `editor.replaceRange()` / `editor.getCursor()` from the Editor API passed via command callbacks — not `app.workspace.activeLeaf.view.editor` obtained directly.
- Use `this.addCommand({ editorCallback: (editor, view) => { ... } })` so Obsidian handles editor access safely and disables the command when no editor is active.
- Pin your `obsidian` package version in `devDependencies` and review the changelog when upgrading.
- Reference the official sample plugin and the obsidian-api TypeScript type definitions as ground truth.

**Warning signs:**
- TypeScript errors after upgrading the `obsidian` package.
- Console deprecation warnings.
- Plugin works in one Obsidian version but breaks in the next.

**Phase to address:**
Plugin scaffolding phase. Establish the correct editor access pattern in the initial command skeleton — do not defer.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode UTC in date range queries | Simpler initial implementation | Wrong results for non-UTC users; requires full rewrite of date logic | Never — timezone offset is a one-liner; do it correctly from the start |
| Use `fetch` instead of `requestUrl` | Familiar browser API | CORS failures in Electron renderer; CSP violations | Never in Obsidian plugin context |
| Skip DEFAULT_SETTINGS merge pattern | Fewer lines in onload | Any schema change breaks existing installs | Never — the merge is trivial boilerplate |
| No error handling on API responses | Faster to write | Silent failures; users file bugs with no actionable info | MVP only if errors are logged to console — ship with user-visible errors before v1 |
| Unconditional append on re-run | Simplest implementation | Duplicate entries on second run; user frustration | Never — define deduplication strategy before writing insert logic |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Toggl API v9 auth | Using `Bearer <token>` header | HTTP Basic Auth: `Authorization: Basic <base64("token:api_token")>` where "api_token" is the literal string as password |
| Toggl API v9 time entries endpoint | Querying `/time_entries` with bare yyyy-mm-dd dates | Pass full ISO 8601 with local timezone offset: `start_date=2024-03-15T00:00:00-05:00` |
| Toggl API v9 running entries | Treating all entries as complete | Filter out entries where `duration < 0` (running) or `stop === null` |
| Toggl API v9 workspace | Hardcoding workspace ID | Fetch `/me/workspaces` and use the first/default workspace ID dynamically, or let user configure it |
| Obsidian editor insert | `editor.replaceRange` at wrong position | Use `editor.getCursor()` immediately in the command callback — cursor moves if user clicks elsewhere between async steps |
| Obsidian settings | `this.loadData()` with no defaults merge | `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all time entries without date range filter | Slow response, large payload, unnecessary data | Always pass `start_date` and `end_date` to `/me/time_entries` | Users with years of Toggl history — response could be thousands of entries |
| Parsing note content to detect duplicates | Slow on large notes; brittle when user edits | Use sentinel block replacement or ID-based tracking in plugin data | Notes >500 lines or complex markdown tables |
| Synchronous JSON.parse in the main thread | UI freeze on large settings blob | Settings are small — not a real concern for this plugin | Not applicable at this scale |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API token without user warning | Token exposed in synced/public vault | Display explicit warning in settings UI about vault sync; document in README |
| Logging API token in console.log debugging | Token visible in DevTools; persists in log files | Never log authorization headers or tokens; use a sanitized debug object |
| Using `eval` or `innerHTML` for markdown rendering | XSS from Toggl entry content | Use Obsidian's built-in markdown renderer or plain string construction — never innerHTML for user-controlled content |
| Not validating API response shape | Crash on unexpected Toggl API changes | Validate that response is an array, each entry has required fields; fail gracefully with a message |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent import with 0 results | User doesn't know if no entries exist or something went wrong | Always show a notice: "Imported 5 entries" or "No entries found for 2024-03-15" |
| No feedback during async API call | UI appears frozen; user clicks again, triggering double-fetch | Show `new Notice("Fetching Toggl entries...")` before the await, update/dismiss after |
| Displaying UTC times without conversion | 9 AM entry shows as "2:00 AM" for US/Eastern user | Convert all displayed times to local timezone |
| Error message exposes raw API error JSON | Confusing for non-technical users | Show friendly message ("Could not reach Toggl — check your API token") with the raw error logged to console |
| No validation feedback for invalid API token | User saves wrong token, imports silently fail | Test the token on settings save with a lightweight API call (e.g., `GET /me`) and show a success/failure notice |

---

## "Looks Done But Isn't" Checklist

- [ ] **Timezone conversion:** Verify entries show correct local times for a UTC-5 user (run test cases with known UTC timestamps)
- [ ] **Running entry handling:** Test with a null-stop entry — does the plugin skip it gracefully or crash?
- [ ] **Re-run deduplication:** Run the import command twice on the same note — are entries duplicated?
- [ ] **Non-daily-note guard:** Run the command on a file named `Meeting Notes.md` — does it show a clear error instead of crashing?
- [ ] **Empty day guard:** Run on a date with no Toggl entries — does it show "no entries found" instead of inserting an empty table?
- [ ] **Manifest release assets:** GitHub release includes `main.js`, `manifest.json`, and `styles.css` (not just source files)
- [ ] **Settings migration:** Add a new settings field, reinstall — does the existing data.json survive without crashing?
- [ ] **API token validation:** Enter a wrong token in settings — does the import give a meaningful error?
- [ ] **Column ordering:** Reorder columns in settings, reimport — does the output respect the configured order?
- [ ] **requestUrl usage:** Verify no `fetch` or `XMLHttpRequest` calls exist in the production build

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Timezone bug discovered post-release | HIGH | Requires touching the API call, all date formatting, and potentially all existing user data; fix in a patch release with clear changelog note |
| Running entry crash discovered post-release | LOW | One-line null guard; patch release within hours |
| Manifest version mismatch blocks review | LOW | Update manifest.json, re-tag, re-publish release; review re-queued |
| Settings migration broke existing installs | MEDIUM | Ship migration patch; users may need to re-enter settings if old data is unreadable |
| Duplicate entries in user notes | MEDIUM | Cannot auto-fix notes already affected; provide a "clear inserted block" command; fix re-run logic going forward |
| API token leaked in public vault | HIGH (user side) | Instruct user to rotate Toggl API token immediately; add warning to plugin README |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| UTC timezone naive date filtering | Phase: API Integration | Unit test: known UTC entry appears in correct local-date results for UTC-5 and UTC+10 |
| Running entry null-stop crash | Phase: API Integration | Unit test: entry with `stop: null` and negative duration is handled without throwing |
| `fetch` vs `requestUrl` CORS failure | Phase: Project Scaffolding | Code review: grep for `fetch(` / `XMLHttpRequest` in src — must be zero hits |
| Manifest version mismatch | Phase: Release Setup | Checklist: manifest version == git tag == versions.json entry before every release |
| Settings migration regression | Phase: Project Scaffolding | Test: load plugin with data.json missing new fields — no crash, defaults applied |
| Duplicate entry insertion | Phase: Core Insertion Logic | Integration test: run command twice on same note — row count unchanged on second run |
| API token in plain-text sync | Phase: Settings UI | Review: settings tab displays sync-risk warning text |
| 429 rate limit silent failure | Phase: API Integration | Code review: every `requestUrl` call checks status code; 429 surfaced to user |
| Filename parsing false positives | Phase: Command Implementation | Unit test: non-date filenames return error notice; date validation rejects month 13 |
| Deprecated Obsidian API usage | Phase: Project Scaffolding | TypeScript compiler shows no type errors against current `obsidian` package typings |

---

## Sources

- Obsidian plugin developer docs and sample plugin: training knowledge (MEDIUM confidence — verify against https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin before scaffolding)
- Toggl Track API v9 reference: training knowledge (MEDIUM confidence — verify against https://developers.track.toggl.com/docs/api/time_entries before implementation)
- Obsidian community plugin review requirements: training knowledge (MEDIUM confidence — verify against https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md before submission)
- Timezone handling pattern: established JavaScript behavior (HIGH confidence)
- Electron CORS / requestUrl constraint: well-documented Obsidian community pattern (HIGH confidence)
- Settings DEFAULT_SETTINGS merge pattern: canonical Obsidian plugin pattern from sample plugin (HIGH confidence)

---
*Pitfalls research for: Obsidian plugin + Toggl Track API v9 integration*
*Researched: 2026-04-09*
