# Phase 3: API Client - Research

**Researched:** 2026-04-10
**Domain:** Toggl Track API v9, Obsidian `requestUrl`, TypeScript module design
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Timezone date boundaries via local midnight → UTC: `new Date('YYYY-MM-DDT00:00:00').toISOString()` for start, `new Date('YYYY-MM-DDT23:59:59').toISOString()` for end.
- **D-02:** Fetch all projects **once per Obsidian session**, cache as an in-memory `Map<number, string>` (project ID → name). Not persisted to disk. Stale mid-session renames are acceptable.
- **D-03:** Project fetch endpoint: `/workspaces/{workspaceId}/projects`. Entries with `project_id: null` resolve to empty string or `—`.
- **D-04:** API client **throws `Error`** with descriptive message on failure: 401 → specific message, 429 → specific message, other non-2xx → `'Toggl API error: {status} {statusText}'`, network failure → `'Toggl API error: network request failed'`. Phase 5 catches and passes to `new Notice(...)`.
- **D-05:** Add `workspaceId: number` (default `0`) to `TogglImportSettings` and `DEFAULT_SETTINGS` in `src/main.ts`.
- **D-06:** On first import (`settings.workspaceId === 0`), call `/me` to fetch `default_workspace_id`, store via `saveSettings()`. Subsequent imports use persisted value.
- **D-07:** Filter running entries: `entry.duration < 0 || entry.stop == null`. Silent — no notice to user.

### Claude's Discretion

- File name for API client module (`src/api.ts` is a reasonable default)
- Exact TypeScript interface shape for `TimeEntry` (derive from Toggl API response)
- Whether to export a class or standalone functions from the module
- Internal structure of the session cache (module-level variable vs. plugin property)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMD-04 | Command fetches time entries from Toggl API for that date using configured API token | Toggl `/me/time_entries` endpoint with `start_date`/`end_date` params; `requestUrl` for HTTP |
| CMD-08 | Running entries (active timers) are silently skipped — not inserted | `duration < 0 \|\| stop == null` filter per Toggl API docs [VERIFIED] |
| FMT-04 | Start time displayed in user's local timezone (converted from UTC) | `start` field from API is UTC string; `new Date(entry.start).toLocaleTimeString()` converts to local |

</phase_requirements>

---

## Summary

Phase 3 creates `src/api.ts` — a self-contained module that fetches Toggl time entries for a local calendar date, resolves project names, and filters running timers. The module uses Obsidian's `requestUrl` function (not native `fetch`) because it bypasses CORS restrictions in Electron.

All key implementation decisions were captured in CONTEXT.md during the discuss phase. Research confirms: the Toggl v9 `/me/time_entries` endpoint accepts RFC 3339 date strings for `start_date`/`end_date`, running entries are identified by `duration < 0` (negative, preferably -1), and the `/workspaces/{id}/projects` endpoint returns project objects with `id` and `name` fields. `requestUrl` returns a `RequestUrlResponse` with `.status`, `.json`, and `.text` properties.

**Primary recommendation:** Export standalone async functions from `src/api.ts` (not a class), keep the project cache as a module-level `Map` variable, and use `requestUrl` from `'obsidian'` for all HTTP calls.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `obsidian` (npm) | latest (in package.json) | `requestUrl`, type imports | Only supported Obsidian API surface; `requestUrl` bypasses CORS in Electron [VERIFIED: package.json] |
| TypeScript | 6.0.2 | Language | Already in project [VERIFIED: package.json] |

### No Additional Dependencies

This phase introduces zero new npm packages. All requirements are met by:
- `requestUrl` from `'obsidian'` — HTTP calls
- `btoa()` — Basic Auth header encoding (available in DOM/Electron)
- Native `Date` — UTC↔local timezone conversion

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main.ts          # Plugin class — extend TogglImportSettings with workspaceId
├── settings.ts      # Settings tab (no changes in this phase)
└── api.ts           # NEW: Toggl API client module
```

### Pattern 1: Standalone Function Exports (Recommended)

**What:** Export named async functions rather than a class. The session cache lives as a module-level variable.

**When to use:** When state is simple and not tied to plugin lifecycle (cache is per-session, reset on module reload).

**Example:**
```typescript
// src/api.ts
import { requestUrl } from 'obsidian';
import type TogglImportPlugin from './main';

const BASE = 'https://api.track.toggl.com/api/v9';

// Module-level project cache — reset automatically on plugin reload
let projectCache: Map<number, string> | null = null;

function authHeader(token: string): string {
	return 'Basic ' + btoa(token + ':api_token');
}

export interface TimeEntry {
	id: number;
	description: string;
	start: string;       // ISO 8601 UTC string
	stop: string | null;
	duration: number;    // negative = running
	project_id: number | null;
	project_name: string; // resolved; '' if no project
	tags: string[] | null;
}

export async function fetchTimeEntries(
	plugin: TogglImportPlugin,
	date: string  // 'YYYY-MM-DD'
): Promise<TimeEntry[]> { ... }
```

**Why standalone functions over a class:** The module has no complex initialization, no inherited lifecycle, and no need for `this` binding. Functions are simpler to test and import. The project cache is naturally scoped to the module.

### Pattern 2: `requestUrl` for HTTP Calls

**What:** Use `requestUrl` from `'obsidian'` instead of `fetch`. This is the locked decision from Phase 1.

**Why:** `requestUrl` bypasses CORS restrictions that would block Toggl API calls in Obsidian's Electron renderer. Native `fetch` fails with CORS errors when calling external APIs from Obsidian plugins. [VERIFIED: obsidian-api GitHub, forum.obsidian.md]

**Signature (verified):**
```typescript
// Source: https://raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts
requestUrl(request: RequestUrlParam): Promise<RequestUrlResponse>

interface RequestUrlParam {
	url: string;
	method?: string;        // default 'GET'
	contentType?: string;
	body?: string | ArrayBuffer;
	headers?: Record<string, string>;
	throw?: boolean;        // if false, won't throw on non-2xx; default true
}

interface RequestUrlResponse {
	status: number;
	headers: Record<string, string>;
	arrayBuffer: ArrayBuffer;
	text: string;
	json: any;
}
```

**Critical:** Set `throw: false` to handle non-2xx responses manually. With default `throw: true`, Obsidian throws a generic error before your code can inspect the status code, losing the ability to give specific 401/429 messages.

```typescript
// Pattern for error-handled requestUrl call
const resp = await requestUrl({
	url: `${BASE}/me/time_entries?start_date=${start}&end_date=${end}`,
	headers: { Authorization: authHeader(token) },
	throw: false,
});
if (resp.status === 401) throw new Error('Toggl API error: invalid API token (401)');
if (resp.status === 429) throw new Error('Toggl API error: rate limited — try again in a moment (429)');
if (resp.status < 200 || resp.status >= 300) {
	throw new Error(`Toggl API error: ${resp.status} ${resp.headers['x-status-message'] ?? ''}`);
}
return resp.json as RawTimeEntry[];
```

### Pattern 3: Date Boundary Construction (D-01)

```typescript
// Source: CONTEXT.md D-01 — produces local midnight expressed as UTC offset
const start = new Date(date + 'T00:00:00').toISOString(); // e.g. "2024-01-15T06:00:00.000Z" for UTC-6
const end   = new Date(date + 'T23:59:59').toISOString(); // e.g. "2024-01-15T05:59:59.000Z" for UTC-6
```

`new Date('YYYY-MM-DDT00:00:00')` (no trailing Z) is parsed as **local time** by the JavaScript spec. `.toISOString()` serializes it to UTC. This correctly scopes queries to the user's local calendar day regardless of timezone offset.

**Important:** The Toggl API `start_date` and `end_date` accept RFC 3339 format strings [VERIFIED: engineering.toggl.com]. The `.toISOString()` output is valid RFC 3339.

### Pattern 4: Project Cache (D-02, D-03)

```typescript
let projectCache: Map<number, string> | null = null;

async function loadProjectCache(workspaceId: number, token: string): Promise<void> {
	if (projectCache !== null) return; // already loaded this session
	const resp = await requestUrl({
		url: `${BASE}/workspaces/${workspaceId}/projects`,
		headers: { Authorization: authHeader(token) },
		throw: false,
	});
	// handle errors...
	const projects: Array<{ id: number; name: string }> = resp.json;
	projectCache = new Map(projects.map(p => [p.id, p.name]));
}

function resolveProject(projectId: number | null): string {
	if (projectId === null) return '';
	return projectCache?.get(projectId) ?? '';
}
```

### Pattern 5: Workspace ID Auto-Population (D-05, D-06)

```typescript
if (plugin.settings.workspaceId === 0) {
	const meResp = await requestUrl({
		url: `${BASE}/me`,
		headers: { Authorization: authHeader(plugin.settings.apiToken) },
		throw: false,
	});
	// handle errors...
	plugin.settings.workspaceId = (meResp.json as { default_workspace_id: number }).default_workspace_id;
	await plugin.saveSettings();
}
```

### Pattern 6: Local Timezone Display (FMT-04)

```typescript
// start field from Toggl API is UTC ISO string: "2024-01-15T14:30:00+00:00"
// toLocaleTimeString() returns local time per user's OS timezone
const localStartTime = new Date(entry.start).toLocaleTimeString();
```

The `TimeEntry` interface should preserve the raw `start` string from the API. The formatter (Phase 4) converts it to local time using `new Date(entry.start).toLocaleTimeString()`.

### Anti-Patterns to Avoid

- **Using native `fetch` instead of `requestUrl`:** Will fail with CORS errors in Electron.
- **Not setting `throw: false`:** Loses ability to branch on 401 vs 429 vs other errors.
- **Persisting the project cache to `plugin.settings`:** Cache is intentionally volatile (in-memory only). Per D-02.
- **Parsing dates with `new Date('YYYY-MM-DD')` (no time component):** Parsed as UTC midnight, not local midnight — wrong day boundaries for non-UTC timezones.
- **Calling `/me` on every import:** Only call when `workspaceId === 0` (D-06). Unnecessary round trip.
- **Using `resp.statusText`:** `requestUrl` does not populate a `statusText` field. Use `resp.headers` or a static message.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests | Custom fetch wrapper | `requestUrl` from `'obsidian'` | CORS bypass, already in project |
| Base64 encoding | Custom btoa | `btoa()` built-in | Available in Electron/DOM, no deps |
| Timezone conversion | Custom UTC offset math | `new Date(str).toLocaleTimeString()` | OS handles DST and locale correctly |
| Date parsing | String split/regex | `new Date('YYYY-MM-DDTHH:MM:SS')` | Native JS date parsing handles local/UTC correctly when time component present |

**Key insight:** Every HTTP-adjacent or date problem in this phase has a native solution in the Electron/DOM environment. Adding libraries for these would increase bundle size with no benefit.

---

## Common Pitfalls

### Pitfall 1: `new Date('YYYY-MM-DD')` Parsed as UTC

**What goes wrong:** `new Date('2024-01-15')` (date-only) is parsed as UTC midnight per the ECMAScript spec. For a user in UTC-6, this is 6pm on Jan 14 — the wrong day.

**Why it happens:** ECMAScript treats date-only ISO strings as UTC, but date-time strings (with `T`) as local time.

**How to avoid:** Always append `T00:00:00` before passing to `new Date()`. Decided in D-01.

**Warning signs:** Tests pass in UTC but fail in negative-offset timezones.

### Pitfall 2: `requestUrl` Default `throw: true` Swallows Error Detail

**What goes wrong:** With default settings, `requestUrl` throws a generic JavaScript error on non-2xx responses. The error doesn't expose the HTTP status code. You cannot distinguish 401 from 429 from 500.

**Why it happens:** `requestUrl`'s `throw` parameter defaults to `true`, meaning it throws before returning the `RequestUrlResponse`.

**How to avoid:** Always pass `throw: false`. Check `resp.status` manually and throw `Error` with specific messages per D-04.

**Warning signs:** All API errors produce the same generic message.

### Pitfall 3: Running Entry False Positives

**What goes wrong:** A completed entry with `duration === 0` would incorrectly be treated as running if only checking `duration < 0`. An entry with a `stop` set but `duration: -1` (data inconsistency from old API versions) would be included if only checking `stop`.

**Why it happens:** Toggl API docs say "duration should be negative, preferably -1" — the wording "preferably" suggests variation is possible.

**How to avoid:** Filter on BOTH conditions: `entry.duration < 0 || entry.stop == null` (D-07). Using `||` is maximally defensive.

**Warning signs:** A running timer appears in output.

### Pitfall 4: `statusText` Not Available on `RequestUrlResponse`

**What goes wrong:** Code references `resp.statusText` expecting the HTTP reason phrase (e.g., "Unauthorized"). The property does not exist on `RequestUrlResponse`.

**Why it happens:** The Obsidian `RequestUrlResponse` interface does not include `statusText` — only `status` (number), `headers`, `arrayBuffer`, `text`, and `json`. [VERIFIED: obsidian.d.ts]

**How to avoid:** Use the numeric `resp.status` and write static message strings per the D-04 contract. Don't rely on `statusText`.

### Pitfall 5: Project Cache Not Reset Between Sessions

**What goes wrong:** If the cache is stored in `plugin.settings` (persisted to disk), stale project names from a previous session survive a vault restart.

**Why it happens:** Confusion between volatile session state and persistent configuration.

**How to avoid:** Module-level variable only. The variable is reset when Obsidian unloads the plugin. Per D-02.

---

## Code Examples

### Full Error-Handled `requestUrl` Call

```typescript
// Source: verified against obsidian.d.ts + D-04 error contract
async function togglGet<T>(url: string, token: string): Promise<T> {
	let resp;
	try {
		resp = await requestUrl({
			url,
			headers: { Authorization: 'Basic ' + btoa(token + ':api_token') },
			throw: false,
		});
	} catch (e) {
		throw new Error('Toggl API error: network request failed');
	}
	if (resp.status === 401) throw new Error('Toggl API error: invalid API token (401)');
	if (resp.status === 429) throw new Error('Toggl API error: rate limited — try again in a moment (429)');
	if (resp.status < 200 || resp.status >= 300) {
		throw new Error(`Toggl API error: ${resp.status}`);
	}
	return resp.json as T;
}
```

### Running Entry Filter

```typescript
// Source: D-07 + engineering.toggl.com API docs [VERIFIED]
// duration < 0  — timer actively running (API uses -1 as canonical value)
// stop == null  — defensive: some API versions may not set negative duration
const completed = entries.filter(e => !(e.duration < 0 || e.stop == null));
```

### `TimeEntry` Interface Shape

```typescript
// Derived from verified Toggl API response fields [VERIFIED: engineering.toggl.com]
// Source: engineering.toggl.com/docs/track/api/time_entries/
interface RawTimeEntry {
	id: number;
	description: string | null;
	start: string;           // UTC ISO 8601
	stop: string | null;     // null = running
	duration: number;        // negative = running
	project_id: number | null;
	tags: string[] | null;
	workspace_id: number;
	user_id: number;
}

// Enriched shape exposed to Phase 4 formatter
export interface TimeEntry {
	id: number;
	description: string;    // normalized: null → ''
	start: string;          // UTC ISO string (formatter converts to local)
	stop: string;           // never null (running entries filtered)
	duration: number;       // seconds, always positive
	project_name: string;   // resolved: null project_id → ''
	tags: string[];         // normalized: null → []
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `request()` from obsidian | `requestUrl()` from obsidian | Obsidian ~0.13 | `requestUrl` is the current recommended function; `request()` still exists but returns string only |
| Toggl API v8 | Toggl API v9 | ~2021 | v9 is stable and recommended; v8 is deprecated |
| `/time_entries.json` (v8) | `/me/time_entries` (v9) | ~2021 | Different base URL and auth |

**Deprecated/outdated:**
- `request()` from obsidian: Returns plain text string; use `requestUrl()` which returns structured `RequestUrlResponse` with `.json` accessor.
- Toggl API v8 (`api.track.toggl.com/api/v8`): Deprecated; v9 is `api.track.toggl.com/api/v9`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `requestUrl` throws when the network request itself fails (no response), catch block reaches the `try/catch` | Code Examples | Network errors might surface differently; test with offline condition |
| A2 | `resp.json` on a non-JSON response body does not throw; returns null or undefined | Code Examples | Could throw; add try/catch around `resp.json` access if needed |
| A3 | The Toggl projects endpoint returns all projects without pagination for typical workspace sizes | Architecture Patterns | Workspaces with hundreds of projects may require pagination (not addressed in D-03) |

---

## Open Questions (RESOLVED)

1. **`resp.json` behavior on error responses**
   - What we know: `RequestUrlResponse.json` is typed as `any`
   - What's unclear: Whether Toggl returns a JSON body on 401/429 errors, and whether `resp.json` throws if body is not JSON
   - RESOLVED: Access `resp.json` only after status check confirms 2xx. Error branches (401, 429, non-2xx) use static message strings only — `resp.json` is never accessed in error paths. The `togglGet` helper implements this pattern exactly.

2. **Projects pagination**
   - What we know: D-03 specifies fetching all projects from `/workspaces/{id}/projects`
   - What's unclear: Whether this endpoint paginates for large workspaces
   - RESOLVED: No pagination for v1 per D-02/D-03. The session cache is best-effort; workspaces with very large project counts are out of scope. Noted as a known limitation in the plan.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code-only. No new external tools, services, CLIs, or databases required. All dependencies (Obsidian API, Toggl REST API, Node.js/npm) are already in use by the project.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test framework installed |
| Config file | None — Wave 0 gap |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

No `vitest`, `jest`, or test files exist in the project. Per CLAUDE.md: "If tests are added later, prefer vitest."

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMD-04 | `fetchTimeEntries` returns entries for correct local calendar date | unit | `npx vitest run tests/api.test.ts` | Wave 0 gap |
| CMD-08 | Running entries (`duration < 0 \|\| stop == null`) are excluded | unit | `npx vitest run tests/api.test.ts` | Wave 0 gap |
| FMT-04 | `start` field preserved as UTC string; `new Date(entry.start).toLocaleTimeString()` converts to local | unit | `npx vitest run tests/api.test.ts` | Wave 0 gap |

Note: API integration tests (actual Toggl HTTP calls) are manual-only — they require a real API token and network access.

### Sampling Rate

- **Per task commit:** N/A (no test framework yet)
- **Per wave merge:** `npx vitest run` (once Wave 0 installs vitest)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest` dev dependency — `npm install -D vitest`
- [ ] `tests/api.test.ts` — covers CMD-04, CMD-08, FMT-04 with mocked `requestUrl`
- [ ] `tests/vitest.config.ts` or `vitest.config.ts` — minimal config for ESM TypeScript

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Toggl API token via HTTP Basic Auth — `btoa(token + ':api_token')` |
| V3 Session Management | no | No session tokens; stateless API calls per import |
| V4 Access Control | no | Single-user plugin, no authorization model |
| V5 Input Validation | yes | `date` parameter validated by caller (Phase 5 validates yyyy-mm-dd format before calling API) |
| V6 Cryptography | no | Token transmitted over HTTPS to Toggl; no local crypto needed |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API token logged or exposed in error messages | Information Disclosure | Never include `apiToken` value in thrown `Error` messages — only status codes and static strings |
| API token stored in plain text `data.json` | Information Disclosure | Out of scope for this phase; SET-02 already warns user in settings UI |
| Malformed JSON response from Toggl causing crash | Tampering (supply chain) | Access `resp.json` only after status check; Phase 5 wraps in `try/catch` |

---

## Sources

### Primary (HIGH confidence)
- `obsidian.d.ts` (raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts) — `requestUrl`, `RequestUrlParam`, `RequestUrlResponse` type signatures [VERIFIED]
- `engineering.toggl.com/docs/track/api/time_entries/` — `start_date`/`end_date` format (RFC 3339), `duration` field semantics (negative = running), `stop` field (null = running) [VERIFIED]
- `engineering.toggl.com/docs/track/api/projects/` — `/workspaces/{id}/projects` endpoint, project object fields (`id`, `name`) [VERIFIED]
- `engineering.toggl.com/docs/track/api/me/` — `/me` endpoint, `default_workspace_id` field name [VERIFIED]
- `src/main.ts` (local codebase) — `TogglImportSettings`, `saveSettings()`, `requestUrl` import pattern [VERIFIED]
- `package.json` (local codebase) — installed versions, no test framework [VERIFIED]

### Secondary (MEDIUM confidence)
- `forum.obsidian.md/t/make-http-requests-from-plugins/15461` — confirms `requestUrl` bypasses CORS; community-verified [MEDIUM]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and obsidian.d.ts
- Architecture: HIGH — requestUrl signature verified; Toggl API endpoints verified; patterns derived from locked decisions
- Pitfalls: HIGH — `throw: false` requirement verified from obsidian.d.ts; date parsing behavior is ECMAScript spec
- Validation: MEDIUM — vitest is training knowledge (CLAUDE.md specifies it); no test infrastructure to verify against

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (Toggl v9 and Obsidian API are stable; 30-day estimate)
