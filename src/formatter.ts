import type { TimeEntry } from './api';
import type { TogglImportSettings } from './main';

export function formatDuration(secs: number): string {
	const hours = Math.floor(secs / 3600);
	const mins = Math.floor((secs % 3600) / 60);
	if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
	if (hours > 0 && mins === 0) return `${hours}h`;
	return `${mins}m`;
}

export function formatStartTime(isoString: string): string {
	const d = new Date(isoString);
	return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

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
