import { requestUrl } from 'obsidian';
import type TogglImportPlugin from './main';

export const BASE = 'https://api.track.toggl.com/api/v9';

function authHeader(token: string): string {
	return 'Basic ' + btoa(token + ':api_token');
}

export async function togglGet<T>(url: string, token: string): Promise<T> {
	let resp;
	try {
		resp = await requestUrl({
			url,
			headers: { Authorization: authHeader(token) },
			throw: false,
		});
	} catch {
		throw new Error('Toggl API error: network request failed');
	}
	if (resp.status === 401) throw new Error('Toggl API error: invalid API token (401)');
	if (resp.status === 429) throw new Error('Toggl API error: rate limited — try again in a moment (429)');
	if (resp.status < 200 || resp.status >= 300) {
		throw new Error(`Toggl API error: ${resp.status}`);
	}
	if (resp.json == null) {
		throw new Error(`Toggl API error: empty response body (${resp.status})`);
	}
	return resp.json as T;
}

interface RawTimeEntry {
	id: number;
	description: string | null;
	start: string;
	stop: string | null;
	duration: number;
	project_id: number | null;
	tags: string[] | null;
	workspace_id: number;
	user_id: number;
}

export interface TimeEntry {
	id: number;
	description: string;
	start: string;
	stop: string;
	duration: number;
	project_name: string;
	tags: string[];
}

/**
 * Session-scoped project name cache. Populated once on first import and never
 * invalidated during the Obsidian session. If project names are renamed in Toggl,
 * Obsidian must be restarted to pick up the changes. Reset via _resetProjectCache()
 * in tests only.
 */
let projectCache: Map<number, string> | null = null;

async function loadProjectCache(workspaceId: number, token: string): Promise<void> {
	if (projectCache !== null) return;
	const projects = await togglGet<Array<{ id: number; name: string }>>(
		`${BASE}/workspaces/${workspaceId}/projects`,
		token,
	);
	if (!Array.isArray(projects)) {
		throw new Error('Toggl API error: unexpected response from projects endpoint');
	}
	projectCache = new Map(projects.map(p => [p.id, p.name]));
}

function resolveProject(projectId: number | null): string {
	if (projectId === null) return '';
	return projectCache?.get(projectId) ?? '';
}

export async function fetchTimeEntries(
	plugin: TogglImportPlugin,
	date: string,
): Promise<TimeEntry[]> {
	const token = await plugin.getApiToken();

	// D-06: Auto-populate workspaceId from /me on first import
	if (plugin.settings.workspaceId === 0) {
		const me = await togglGet<{ default_workspace_id: number }>(
			`${BASE}/me`,
			token,
		);
		plugin.settings.workspaceId = me.default_workspace_id;
		await plugin.saveSettings();
	}

	const workspaceId = plugin.settings.workspaceId;

	// D-02/D-03: Load project cache (no-op if already loaded this session)
	await loadProjectCache(workspaceId, token);

	// Parse wrap time early — drives both date range and filter logic
	const parts = plugin.settings.dayWrapTime.split(':').map(Number);
	const wrapH = parts[0] ?? NaN;
	const wrapM = parts[1] ?? NaN;
	const wrapMinutes = isNaN(wrapH) || isNaN(wrapM) ? 0 : wrapH * 60 + wrapM;

	// D-01: Construct date boundaries as local midnight -> UTC
	// When wrap is set, extend end to next_day@wrapTime to capture overnight entries
	const start = new Date(date + 'T00:00:00').toISOString();
	let end: string;
	const nextDay = addOneDay(date);
	if (wrapMinutes > 0) {
		const wrapHH = String(wrapH).padStart(2, '0');
		const wrapMM = String(wrapM).padStart(2, '0');
		end = new Date(nextDay + 'T' + wrapHH + ':' + wrapMM + ':00').toISOString();
	} else {
		end = new Date(date + 'T23:59:59').toISOString(); // 1-second gap is intentional and benign
	}

	// CMD-04: Fetch time entries for date range
	const raw = await togglGet<RawTimeEntry[]>(
		`${BASE}/me/time_entries?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`,
		token,
	);

	// D-07/CMD-08: Filter running entries (silent)
	const completed = raw.filter(e => !(e.duration < 0 || e.stop == null));

	// Day wrap time: keep entries that belong to this logical day
	// - current date: entries at/after wrap time (earlier ones belong to the previous day)
	// - next day: entries before wrap time (they are overnight overflow into this day)
	const wrapped = wrapMinutes === 0
		? completed
		: completed.filter(e => {
				const startLocal = new Date(e.start);
				const startLocalMinutes = startLocal.getHours() * 60 + startLocal.getMinutes();
				const entryDate = localDateStr(startLocal);
				if (entryDate === date) {
					// Current day: keep entries at or after wrap time
					return startLocalMinutes >= wrapMinutes;
				}
				if (entryDate === nextDay) {
					// Next day: keep overnight overflow entries before wrap time
					return startLocalMinutes < wrapMinutes;
				}
				return false;
			});

	// IMP-01: Sort by start time per user setting (ascending default)
	wrapped.sort((a, b) => {
		const cmp = a.start.localeCompare(b.start);
		return plugin.settings.sortOrder === 'desc' ? -cmp : cmp;
	});

	// Normalize and enrich entries
	return wrapped.map(e => ({
		id: e.id,
		description: e.description ?? '',
		start: e.start,
		stop: e.stop!,
		duration: e.duration,
		project_name: resolveProject(e.project_id),
		tags: e.tags ?? [],
	}));
}

/** @internal — exported only for testing */
export function _resetProjectCache(): void {
	projectCache = null;
}

function addOneDay(date: string): string {
	const d = new Date(date + 'T12:00:00'); // noon avoids DST edge cases
	d.setDate(d.getDate() + 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
