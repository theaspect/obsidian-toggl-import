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

	// D-01: Construct date boundaries as local midnight -> UTC
	const start = new Date(date + 'T00:00:00').toISOString();
	const end = new Date(date + 'T23:59:59').toISOString(); // 1-second gap is intentional and benign: Toggl uses inclusive matching at second precision

	// CMD-04: Fetch time entries for date range
	const raw = await togglGet<RawTimeEntry[]>(
		`${BASE}/me/time_entries?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`,
		token,
	);

	// D-07/CMD-08: Filter running entries (silent)
	const completed = raw.filter(e => !(e.duration < 0 || e.stop == null));

	// Day wrap time: exclude entries whose local start is before the configured boundary
	const parts = plugin.settings.dayWrapTime.split(':').map(Number);
	const wrapH = parts[0] ?? NaN;
	const wrapM = parts[1] ?? NaN;
	const wrapMinutes = isNaN(wrapH) || isNaN(wrapM) ? 0 : wrapH * 60 + wrapM;
	const wrapped = wrapMinutes === 0
		? completed
		: completed.filter(e => {
				const startLocal = new Date(e.start);
				return startLocal.getHours() * 60 + startLocal.getMinutes() >= wrapMinutes;
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
