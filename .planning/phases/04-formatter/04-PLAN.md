# Phase 4: Formatter — Plan

**Phase goal:** Produce correct Markdown table and plain text strings from `TimeEntry[]` using configured columns and delimiter — pure transformation, no side effects.
**Requirements:** FMT-01, FMT-02, FMT-03, FMT-05
**Depends on:** Phase 3 (`src/api.ts` — `TimeEntry` interface)

---

## Threat Model

This phase is a pure string transformation with no I/O, network, or auth. Threats are limited to output correctness issues:

| Risk | Description | Mitigation |
|------|-------------|------------|
| Wrong column order | Canonical order (Description → Start → Duration → Project → Tags) hardcoded, but a mapping mistake could swap fields | Unit tests assert header order and field values independently |
| Locale-dependent time output | `toLocaleTimeString()` varies by system locale; test runners may differ from production Obsidian | Use manual `getHours()`/`getMinutes()` with `padStart` — deterministic across all locales (D-04) |
| Delimiter injection in plain text | If a field value contains the delimiter character (e.g. description contains `|`), output rows become ambiguous | Acceptable: this formatter is for personal Obsidian notes, not machine-parsed data; no sanitization required for v1 |
| GFM table broken by pipe in field | Pipe characters in description/project_name inside a GFM table cell break column parsing | Acceptable: same rationale as above; Phase 5 may add escaping if user feedback demands it |
| Empty settings.delimiter | If `delimiter` is `""`, columns merge with no separator | Acceptable: the settings UI (Phase 2) defaults to `|`; formatter is not responsible for validating settings |

---

## Tasks

### Task 1: Implement `src/formatter.ts`

**File:** `src/formatter.ts`

**What:** Export a single pure function `formatEntries(entries: TimeEntry[], settings: TogglImportSettings): string` that transforms a normalized entry array into the configured output string.

**Full specification:**

**Imports:**
```typescript
import type { TimeEntry } from './api';
import type { TogglImportSettings } from './main';
```

**Helper: `formatDuration(secs: number): string`** (export — needed by tests)

Algorithm (D-05):
```typescript
const hours = Math.floor(secs / 3600);
const mins = Math.floor((secs % 3600) / 60);
if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
if (hours > 0 && mins === 0) return `${hours}h`;
return `${mins}m`;
```

Examples: `3600 → "1h"`, `5400 → "1h 30m"`, `90 → "1m"`, `45 → "0m"`, `0 → "0m"`.

**Helper: `formatStartTime(isoString: string): string`** (export — needed by tests)

Algorithm (D-04):
```typescript
const d = new Date(isoString);
return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
```

This produces local-timezone HH:MM without any locale variance. `new Date('2024-06-15T09:00:00+00:00')` produces a Date object whose `getHours()`/`getMinutes()` reflect the test runner's local timezone — which is exactly the desired behavior (same as Obsidian desktop on the user's machine).

**Column map** — define this internal structure to avoid repetition:

```typescript
// Canonical column definitions in fixed order (D-03, D-07)
const COLUMNS: Array<{
	key: keyof TogglImportSettings['columns'];
	header: string;
	getValue: (e: TimeEntry) => string;
}> = [
	{ key: 'description', header: 'Description', getValue: e => e.description },
	{ key: 'startTime',   header: 'Start',       getValue: e => formatStartTime(e.start) },
	{ key: 'duration',    header: 'Duration',     getValue: e => formatDuration(e.duration) },
	{ key: 'project',     header: 'Project',      getValue: e => e.project_name },
	{ key: 'tags',        header: 'Tags',         getValue: e => e.tags.join(', ') },
];
```

Note: `e.tags.join(', ')` handles both the empty-array case (returns `""`) and the multi-tag case (returns `"tag1, tag2"`) without a branch (D-09).

**Main function:**

```typescript
export function formatEntries(entries: TimeEntry[], settings: TogglImportSettings): string {
	// D-02: empty input returns empty string
	if (entries.length === 0) return '';

	// Filter to enabled columns in canonical order (D-03)
	const enabled = COLUMNS.filter(col => settings.columns[col.key]);

	if (settings.outputFormat === 'table') {
		// D-06, D-07: GFM table — header row, separator row, data rows
		const header = '| ' + enabled.map(c => c.header).join(' | ') + ' |';
		const separator = '| ' + enabled.map(() => '---').join(' | ') + ' |';
		const rows = entries.map(e =>
			'| ' + enabled.map(c => c.getValue(e)).join(' | ') + ' |'
		);
		return [header, separator, ...rows].join('\n');
	} else {
		// D-08: plain text — one line per entry, no header
		return entries
			.map(e => enabled.map(c => c.getValue(e)).join(settings.delimiter))
			.join('\n');
	}
}
```

**Indentation:** Use tabs (project convention).

**Verification:** `npm run build` completes with zero TypeScript errors (tsc --noEmit gate passes).

---

### Task 2: Write `tests/formatter.test.ts`

**File:** `tests/formatter.test.ts`

**What:** Vitest unit tests exercising all 4 success criteria plus all decision-driven edge cases. No mocking needed — formatter is pure. Follow the `describe/it/expect` + tabs pattern from `tests/api.test.ts`.

**Test fixture — define once at top of file:**

```typescript
import { describe, it, expect } from 'vitest';
import { formatEntries, formatDuration, formatStartTime } from '../src/formatter';
import type { TimeEntry } from '../src/api';
import type { TogglImportSettings } from '../src/main';

// Baseline settings: all columns enabled, table output, pipe delimiter
function makeSettings(overrides: Partial<TogglImportSettings> = {}): TogglImportSettings {
	return {
		apiToken: '',
		workspaceId: 0,
		outputFormat: 'table',
		delimiter: '|',
		columns: {
			description: true,
			startTime: true,
			duration: true,
			project: true,
			tags: true,
		},
		...overrides,
	};
}

// Single entry with all fields populated — vary per test as needed
function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
	return {
		id: 1,
		description: 'Write tests',
		start: '2024-06-15T09:00:00+00:00',  // UTC 09:00
		stop: '2024-06-15T10:30:00+00:00',
		duration: 5400,  // 1h 30m
		project_name: 'Plugin Dev',
		tags: ['work', 'coding'],
		...overrides,
	};
}
```

**Test cases to implement:**

**`describe('formatEntries — empty input')`**
- `it('returns empty string for empty array')` — `formatEntries([], makeSettings())` → `''`

**`describe('formatDuration')`**
- `it('formats whole hours: 3600 → "1h"')` — `formatDuration(3600)` → `'1h'`
- `it('formats hours and minutes: 5400 → "1h 30m"')` — `formatDuration(5400)` → `'1h 30m'`
- `it('formats sub-hour minutes: 90 → "1m"')` — `formatDuration(90)` → `'1m'`
- `it('formats sub-minute as 0m: 45 → "0m"')` — `formatDuration(45)` → `'0m'`
- `it('formats zero seconds as 0m: 0 → "0m"')` — `formatDuration(0)` → `'0m'`

**`describe('formatStartTime')`**

Note: `formatStartTime` converts a UTC ISO string to local time. Tests must use the **local** HH:MM of the test input, not hardcoded `'09:00'`. Compute expected with `new Date(isoString)`:

```typescript
it('formats start time as local HH:MM', () => {
	const iso = '2024-06-15T09:00:00+00:00';
	const d = new Date(iso);
	const expected =
		String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
	expect(formatStartTime(iso)).toBe(expected);
});
it('zero-pads single-digit hours and minutes', () => {
	// Use a UTC time that resolves to a single-digit hour in the local timezone
	// Strategy: find what UTC time maps to 09:05 local, or just verify format is HH:MM
	const iso = '2024-06-15T00:05:00+00:00';
	const result = formatStartTime(iso);
	expect(result).toMatch(/^\d{2}:\d{2}$/);
});
```

**`describe('formatEntries — Markdown table')`** (FMT-01)
- `it('generates valid GFM table structure')` — output must contain a header row, a separator row with `---`, and a data row. Assert `lines[0]` starts and ends with `|`, `lines[1]` contains `---`, `lines[2]` starts and ends with `|`.
- `it('uses correct column headers in canonical order')` — with all columns enabled, `lines[0]` equals `'| Description | Start | Duration | Project | Tags |'`
- `it('separator row uses --- for each column')` — `lines[1]` equals `'| --- | --- | --- | --- | --- |'`
- `it('data row contains formatted values')` — check description, duration string, and tags in the output row. Use `toContain` rather than exact match to avoid coupling to start time timezone.
- `it('formats tags as comma-separated list in table')` — entry with `tags: ['work', 'coding']` → row contains `'work, coding'` (FMT-05)
- `it('formats empty tags as empty string in table')` — entry with `tags: []` → row contains `'| |'` or `'|  |'` for the tags cell (use `expect(lines[2]).toContain('| |')` after trimming or check cell is empty)

**`describe('formatEntries — plain text')`** (FMT-02)
- `it('produces one line per entry')` — two entries → output.split('\n') has length 2
- `it('joins columns with delimiter')` — with `delimiter: '|'` and description+duration only, first line contains `|`
- `it('has no header row')` — output has exactly `entries.length` lines; none starts with `Description`
- `it('uses custom delimiter')` — `makeSettings({ outputFormat: 'plaintext', delimiter: ' :: ' })` → line contains ` :: `
- `it('formats tags as comma-separated list in plain text')` — entry with `tags: ['a', 'b']` → line contains `'a, b'` (FMT-05)

**`describe('formatEntries — column filtering')`** (D-03)
- `it('omits disabled columns from table headers')` — disable `project` and `tags`; `lines[0]` must NOT contain `'Project'` or `'Tags'`
- `it('only enabled columns appear in table data row')` — disable `startTime`; output row must not contain the HH:MM pattern at column position
- `it('respects canonical column order in table')` — enable only `duration` and `tags`; `lines[0]` equals `'| Duration | Tags |'` (Duration before Tags per canonical order)
- `it('respects canonical column order in plain text')` — enable only `description` and `duration`; each line is `'Write tests|1h 30m'` (with `|` delimiter; Description before Duration)
- `it('single enabled column produces no extra delimiters in plain text')` — enable only `description`; line equals `'Write tests'` with no delimiter chars

**`describe('formatEntries — multiple entries')`**
- `it('table has one data row per entry')` — two entries → output.split('\n').length === 4 (header + separator + 2 data rows)
- `it('plain text has one line per entry')` — three entries → output.split('\n').length === 3

**Verification:** `npm test` runs all formatter tests with zero failures. All 4 success criteria are covered.

---

## Execution Order

Task 1 → Task 2 (tests import from `src/formatter.ts`; implement first so TypeScript imports resolve cleanly, then write tests against the working implementation)

## Commit Strategy

- After Task 1: `feat(formatter): implement formatEntries pure function`
- After Task 2: `test(formatter): add formatter unit tests`
