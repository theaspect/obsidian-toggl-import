import { describe, it, expect } from 'vitest';
import { formatEntries, formatDuration, formatStartTime } from '../src/formatter';
import type { TimeEntry } from '../src/api';
import type { TogglImportSettings } from '../src/main';

// Baseline settings: all columns enabled, table output, pipe delimiter
function makeSettings(overrides: Partial<TogglImportSettings> = {}): TogglImportSettings {
	return {
		workspaceId: 0,
		outputFormat: 'table',
		delimiter: '|',
		templateString: '${description} (${duration})',
		sortOrder: 'asc' as const,
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

describe('formatEntries — empty input', () => {
	it('returns empty string for empty array', () => {
		expect(formatEntries([], makeSettings())).toBe('');
	});
});

describe('formatDuration', () => {
	it('formats whole hours: 3600 → "1h"', () => {
		expect(formatDuration(3600)).toBe('1h');
	});

	it('formats hours and minutes: 5400 → "1h 30m"', () => {
		expect(formatDuration(5400)).toBe('1h 30m');
	});

	it('formats sub-hour minutes: 90 → "1m"', () => {
		expect(formatDuration(90)).toBe('1m');
	});

	it('formats sub-minute as 0m: 45 → "0m"', () => {
		expect(formatDuration(45)).toBe('0m');
	});

	it('formats zero seconds as 0m: 0 → "0m"', () => {
		expect(formatDuration(0)).toBe('0m');
	});
});

describe('formatStartTime', () => {
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
});

describe('formatEntries — Markdown table', () => {
	it('generates valid GFM table structure', () => {
		const output = formatEntries([makeEntry()], makeSettings());
		const lines = output.split('\n');
		expect(lines[0]).toMatch(/^\|.*\|$/);
		expect(lines[1]).toContain('---');
		expect(lines[2]).toMatch(/^\|.*\|$/);
	});

	it('uses correct column headers in canonical order', () => {
		const output = formatEntries([makeEntry()], makeSettings());
		const lines = output.split('\n');
		expect(lines[0]).toBe('| Description | Start | Duration | Project | Tags |');
	});

	it('separator row uses --- for each column', () => {
		const output = formatEntries([makeEntry()], makeSettings());
		const lines = output.split('\n');
		expect(lines[1]).toBe('| --- | --- | --- | --- | --- |');
	});

	it('data row contains formatted values', () => {
		const output = formatEntries([makeEntry()], makeSettings());
		const lines = output.split('\n');
		expect(lines[2]).toContain('Write tests');
		expect(lines[2]).toContain('1h 30m');
		expect(lines[2]).toContain('work, coding');
	});

	it('formats tags as comma-separated list in table', () => {
		const output = formatEntries([makeEntry({ tags: ['work', 'coding'] })], makeSettings());
		const lines = output.split('\n');
		expect(lines[2]).toContain('work, coding');
	});

	it('formats empty tags as empty string in table', () => {
		const settings = makeSettings();
		// Disable all other columns to isolate tags cell
		settings.columns = {
			description: false,
			startTime: false,
			duration: false,
			project: false,
			tags: true,
		};
		const output = formatEntries([makeEntry({ tags: [] })], settings);
		const lines = output.split('\n');
		// Tags cell should be empty (| |)
		expect(lines[2]).toContain('|  |');
	});
});

describe('formatEntries — plain text', () => {
	it('produces one line per entry', () => {
		const settings = makeSettings({ outputFormat: 'plaintext' });
		const entries = [makeEntry(), makeEntry({ id: 2, description: 'Second' })];
		const output = formatEntries(entries, settings);
		expect(output.split('\n')).toHaveLength(2);
	});

	it('joins columns with delimiter', () => {
		const settings = makeSettings({
			outputFormat: 'plaintext',
			delimiter: '|',
			columns: { description: true, startTime: false, duration: true, project: false, tags: false },
		});
		const output = formatEntries([makeEntry()], settings);
		expect(output.split('\n')[0]).toContain('|');
	});

	it('has no header row', () => {
		const settings = makeSettings({ outputFormat: 'plaintext' });
		const entries = [makeEntry(), makeEntry({ id: 2 })];
		const output = formatEntries(entries, settings);
		const lines = output.split('\n');
		expect(lines).toHaveLength(entries.length);
		expect(lines.every(l => !l.startsWith('Description'))).toBe(true);
	});

	it('uses custom delimiter', () => {
		const settings = makeSettings({ outputFormat: 'plaintext', delimiter: ' :: ' });
		const output = formatEntries([makeEntry()], settings);
		expect(output.split('\n')[0]).toContain(' :: ');
	});

	it('formats tags as comma-separated list in plain text', () => {
		const settings = makeSettings({ outputFormat: 'plaintext' });
		const output = formatEntries([makeEntry({ tags: ['a', 'b'] })], settings);
		expect(output.split('\n')[0]).toContain('a, b');
	});
});

describe('formatEntries — column filtering', () => {
	it('omits disabled columns from table headers', () => {
		const settings = makeSettings({
			columns: { description: true, startTime: true, duration: true, project: false, tags: false },
		});
		const output = formatEntries([makeEntry()], settings);
		const lines = output.split('\n');
		expect(lines[0]).not.toContain('Project');
		expect(lines[0]).not.toContain('Tags');
	});

	it('only enabled columns appear in table data row', () => {
		const settings = makeSettings({
			columns: { description: true, startTime: false, duration: true, project: false, tags: false },
		});
		const output = formatEntries([makeEntry()], settings);
		const lines = output.split('\n');
		// Should not contain any HH:MM pattern at all since startTime is disabled
		expect(lines[2]).not.toMatch(/\d{2}:\d{2}/);
	});

	it('respects canonical column order in table', () => {
		const settings = makeSettings({
			columns: { description: false, startTime: false, duration: true, project: false, tags: true },
		});
		const output = formatEntries([makeEntry()], settings);
		const lines = output.split('\n');
		expect(lines[0]).toBe('| Duration | Tags |');
	});

	it('respects canonical column order in plain text', () => {
		const settings = makeSettings({
			outputFormat: 'plaintext',
			delimiter: '|',
			columns: { description: true, startTime: false, duration: true, project: false, tags: false },
		});
		const output = formatEntries([makeEntry()], settings);
		expect(output.split('\n')[0]).toBe('Write tests|1h 30m');
	});

	it('single enabled column produces no extra delimiters in plain text', () => {
		const settings = makeSettings({
			outputFormat: 'plaintext',
			delimiter: '|',
			columns: { description: true, startTime: false, duration: false, project: false, tags: false },
		});
		const output = formatEntries([makeEntry()], settings);
		expect(output.split('\n')[0]).toBe('Write tests');
	});
});

describe('formatEntries — multiple entries', () => {
	it('table has one data row per entry', () => {
		const entries = [makeEntry(), makeEntry({ id: 2, description: 'Second' })];
		const output = formatEntries(entries, makeSettings());
		// header + separator + 2 data rows = 4 lines
		expect(output.split('\n')).toHaveLength(4);
	});

	it('plain text has one line per entry', () => {
		const settings = makeSettings({ outputFormat: 'plaintext' });
		const entries = [
			makeEntry(),
			makeEntry({ id: 2, description: 'Second' }),
			makeEntry({ id: 3, description: 'Third' }),
		];
		const output = formatEntries(entries, settings);
		expect(output.split('\n')).toHaveLength(3);
	});
});

describe('formatEntries — template mode', () => {
	it('substitutes description and duration variables', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${description} (${duration})',
		});
		const output = formatEntries([makeEntry()], settings);
		expect(output).toBe('Write tests (1h 30m)');
	});

	it('expression support: ${project ?? "n/a"} returns n/a for empty project', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${project ?? "n/a"}',
		});
		const output = formatEntries([makeEntry({ project_name: '' })], settings);
		expect(output).toBe('n/a');
	});

	it('expression support: ${tags || "none"} returns none for empty tags', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${tags || "none"}',
		});
		const output = formatEntries([makeEntry({ tags: [] })], settings);
		expect(output).toBe('none');
	});

	it('unknown variable passthrough: ${foo} appears literally in output', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${foo} ${description}',
		});
		const output = formatEntries([makeEntry()], settings);
		expect(output).toBe('${foo} Write tests');
	});

	it('empty field resolution: ${project} returns empty string when project_name is empty', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${project}',
		});
		const output = formatEntries([makeEntry({ project_name: '' })], settings);
		expect(output).toBe('');
	});

	it('empty tags: ${tags} returns empty string when tags array is empty', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${tags}',
		});
		const output = formatEntries([makeEntry({ tags: [] })], settings);
		expect(output).toBe('');
	});

	it('multi-entry: 3 entries produce 3 lines separated by newline, no header row', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${description}',
		});
		const entries = [
			makeEntry({ description: 'Task A' }),
			makeEntry({ id: 2, description: 'Task B' }),
			makeEntry({ id: 3, description: 'Task C' }),
		];
		const output = formatEntries(entries, settings);
		const lines = output.split('\n');
		expect(lines).toHaveLength(3);
		expect(lines[0]).toBe('Task A');
		expect(lines[1]).toBe('Task B');
		expect(lines[2]).toBe('Task C');
	});

	it('empty entries array returns empty string', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${description}',
		});
		expect(formatEntries([], settings)).toBe('');
	});

	it('broken template (unclosed brace) does not throw, returns raw template string', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${description',
		});
		expect(() => formatEntries([makeEntry()], settings)).not.toThrow();
		const output = formatEntries([makeEntry()], settings);
		expect(output).toBe('${description');
	});

	it('all 5 variables substitute correctly in a single template', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${description} ${start} ${duration} ${tags} ${project}',
		});
		const entry = makeEntry();
		const output = formatEntries([entry], settings);
		expect(output).toContain('Write tests');
		expect(output).toContain('1h 30m');
		expect(output).toContain('work, coding');
		expect(output).toContain('Plugin Dev');
		// start should be an HH:MM pattern
		expect(output).toMatch(/\d{2}:\d{2}/);
	});

	it('tags renders as comma-separated: tags ["a","b"] with ${tags} returns "a, b"', () => {
		const settings = makeSettings({
			outputFormat: 'template',
			templateString: '${tags}',
		});
		const output = formatEntries([makeEntry({ tags: ['a', 'b'] })], settings);
		expect(output).toBe('a, b');
	});
});
