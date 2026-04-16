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

// Internal: render a single entry using a template string with ${variable} placeholders.
// Supports expressions (??, ||) via new Function. Unknown ${foo} tokens pass through as-is.
// Empty field values ('' for project, tags) are passed as null so ${project ?? 'n/a'} works.
// Simple ${var} references are preprocessed to ${var ?? ''} to ensure null renders as ''.
function renderTemplate(template: string, vars: Record<string, string | null>): string {
	const KNOWN_VARS = ['description', 'start', 'duration', 'tags', 'project'];
	// Step 1: Temporarily replace unknown ${...} tokens so they survive evaluation
	const placeholders: Map<string, string> = new Map();
	let idx = 0;
	let processed = template.replace(/\$\{([^}]+)\}/g, (match, expr: string) => {
		const trimmed = expr.trim();
		// Check if expression references any known variable
		const refsKnown = KNOWN_VARS.some(v => trimmed.includes(v));
		if (!refsKnown) {
			const key = `__PLACEHOLDER_${idx++}__`;
			placeholders.set(key, match);
			return key;
		}
		// For simple bare variable references (e.g. ${project}), add ?? '' so null renders as ''
		const isBareVar = KNOWN_VARS.includes(trimmed);
		if (isBareVar) {
			return `\${${trimmed} ?? ''}`;
		}
		return match;
	});

	// Step 2: Build and call new Function with the 5 known variables
	try {
		const body = `return \`${processed}\`;`;
		const fn = new Function('description', 'start', 'duration', 'tags', 'project', body);
		let result = fn(vars.description, vars.start, vars.duration, vars.tags, vars.project) as string;

		// Step 3: Restore unknown placeholders to their original ${...} text
		for (const [key, original] of placeholders) {
			result = result.replace(key, original);
		}
		return result;
	} catch {
		// Broken template (SyntaxError) — return raw template string as-is
		return template;
	}
}

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
	} else if (settings.outputFormat === 'plaintext') {
		// D-08: plain text — one line per entry, no header
		return entries
			.map(e => enabled.map(c => c.getValue(e)).join(settings.delimiter))
			.join('\n');
	} else if (settings.outputFormat === 'template') {
		// D-11: template mode — one line per entry, no header row
		// Pass null for empty optional fields so ?? expressions work (e.g. ${project ?? 'n/a'})
		return entries.map(e => {
			const tagsStr = e.tags.join(', ');
			const projectStr = e.project_name ?? '';
			return renderTemplate(settings.templateString, {
				description: e.description,
				start: formatStartTime(e.start),
				duration: formatDuration(e.duration),
				tags: tagsStr === '' ? null : tagsStr,
				project: projectStr === '' ? null : projectStr,
			});
		}).join('\n');
	}
	return '';
}
