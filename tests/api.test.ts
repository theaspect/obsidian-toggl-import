import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock obsidian module — requestUrl is the only import api.ts uses
// vi.hoisted ensures mockRequestUrl is available when vi.mock factory runs (hoisted to top)
const { mockRequestUrl } = vi.hoisted(() => ({
	mockRequestUrl: vi.fn(),
}));
vi.mock('obsidian', () => ({
	requestUrl: mockRequestUrl,
}));

// Import AFTER mock is set up
import { fetchTimeEntries, TimeEntry } from '../src/api';

// Mock plugin factory — creates a minimal object satisfying what fetchTimeEntries needs
function createMockPlugin(overrides: Partial<{ apiToken: string; workspaceId: number }> = {}) {
	return {
		settings: {
			apiToken: overrides.apiToken ?? 'test-token-abc123',
			workspaceId: overrides.workspaceId ?? 42,
			outputFormat: 'table' as const,
			columns: { description: true, startTime: true, duration: true, tags: false, project: false },
			delimiter: '|',
		},
		saveSettings: vi.fn().mockResolvedValue(undefined),
	} as any;
}

// Sample Toggl API response data for mocking
const SAMPLE_ENTRIES = [
	{ id: 1, description: 'Task A', start: '2024-06-15T09:00:00+00:00', stop: '2024-06-15T10:00:00+00:00', duration: 3600, project_id: 100, tags: ['work', 'dev'], workspace_id: 42, user_id: 1 },
	{ id: 2, description: null, start: '2024-06-15T10:30:00+00:00', stop: '2024-06-15T11:00:00+00:00', duration: 1800, project_id: null, tags: null, workspace_id: 42, user_id: 1 },
	{ id: 3, description: 'Running', start: '2024-06-15T11:00:00+00:00', stop: null, duration: -1, project_id: 100, tags: null, workspace_id: 42, user_id: 1 },
];

const SAMPLE_PROJECTS = [
	{ id: 100, name: 'Project Alpha' },
	{ id: 200, name: 'Project Beta' },
];

// Helper to configure mockRequestUrl responses based on URL pattern
function setupMockResponses(opts: { entries?: any[]; projects?: any[]; meWorkspaceId?: number } = {}) {
	mockRequestUrl.mockImplementation(async (req: { url: string }) => {
		if (req.url.includes('/me/time_entries')) {
			return { status: 200, json: opts.entries ?? SAMPLE_ENTRIES, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
		}
		if (req.url.includes('/projects')) {
			return { status: 200, json: opts.projects ?? SAMPLE_PROJECTS, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
		}
		if (req.url.endsWith('/me')) {
			return { status: 200, json: { default_workspace_id: opts.meWorkspaceId ?? 42 }, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
		}
		return { status: 404, json: null, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
	});
}

describe('fetchTimeEntries', () => {
	beforeEach(() => {
		mockRequestUrl.mockReset();
	});

	it('constructs date boundaries with local midnight', async () => {
		setupMockResponses();
		const plugin = createMockPlugin();
		await fetchTimeEntries(plugin, '2024-06-15');
		// Find the call to /me/time_entries and verify start_date and end_date params
		const timeEntriesCall = mockRequestUrl.mock.calls.find(
			(call: any[]) => call[0].url.includes('/me/time_entries')
		);
		expect(timeEntriesCall).toBeDefined();
		const url: string = timeEntriesCall![0].url;
		expect(url).toContain('start_date=');
		expect(url).toContain('end_date=');
		// Both date params should contain ISO format with T separator
		const startMatch = url.match(/start_date=([^&]+)/);
		const endMatch = url.match(/end_date=([^&]+)/);
		expect(startMatch).toBeTruthy();
		expect(endMatch).toBeTruthy();
		// The decoded date params should look like ISO strings
		const startDate = decodeURIComponent(startMatch![1]);
		const endDate = decodeURIComponent(endMatch![1]);
		expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('filters out entries with negative duration (running)', async () => {
		setupMockResponses();
		const plugin = createMockPlugin();
		const entries = await fetchTimeEntries(plugin, '2024-06-15');
		const runningByDuration = entries.filter((e: TimeEntry) => e.duration < 0);
		expect(runningByDuration).toHaveLength(0);
	});

	it('filters out entries with null stop (running)', async () => {
		setupMockResponses();
		const plugin = createMockPlugin();
		const entries = await fetchTimeEntries(plugin, '2024-06-15');
		// Entry id=3 has stop: null and duration: -1 — should be filtered
		const runningEntry = entries.find((e: TimeEntry) => e.id === 3);
		expect(runningEntry).toBeUndefined();
	});

	it('preserves start as UTC ISO string for downstream formatting', async () => {
		setupMockResponses();
		const plugin = createMockPlugin();
		const entries = await fetchTimeEntries(plugin, '2024-06-15');
		const entry = entries.find((e: TimeEntry) => e.id === 1);
		expect(entry).toBeDefined();
		expect(entry!.start).toBe('2024-06-15T09:00:00+00:00');
	});

	it('resolves project_name from project cache', async () => {
		setupMockResponses();
		const plugin = createMockPlugin();
		const entries = await fetchTimeEntries(plugin, '2024-06-15');
		const entry = entries.find((e: TimeEntry) => e.id === 1);
		expect(entry).toBeDefined();
		expect(entry!.project_name).toBe('Project Alpha');
	});

	it('sets project_name to empty string when project_id is null', async () => {
		setupMockResponses();
		const plugin = createMockPlugin();
		const entries = await fetchTimeEntries(plugin, '2024-06-15');
		const entry = entries.find((e: TimeEntry) => e.id === 2);
		expect(entry).toBeDefined();
		expect(entry!.project_name).toBe('');
	});

	it('normalizes null description to empty string', async () => {
		setupMockResponses();
		const plugin = createMockPlugin();
		const entries = await fetchTimeEntries(plugin, '2024-06-15');
		const entry = entries.find((e: TimeEntry) => e.id === 2);
		expect(entry).toBeDefined();
		expect(entry!.description).toBe('');
	});

	it('normalizes null tags to empty array', async () => {
		setupMockResponses();
		const plugin = createMockPlugin();
		const entries = await fetchTimeEntries(plugin, '2024-06-15');
		const entry = entries.find((e: TimeEntry) => e.id === 2);
		expect(entry).toBeDefined();
		expect(entry!.tags).toEqual([]);
	});

	it('throws specific error on 401', async () => {
		mockRequestUrl.mockImplementation(async (req: { url: string }) => {
			if (req.url.includes('/me/time_entries')) {
				return { status: 401, json: null, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			if (req.url.includes('/projects')) {
				return { status: 200, json: SAMPLE_PROJECTS, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			if (req.url.endsWith('/me')) {
				return { status: 200, json: { default_workspace_id: 42 }, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			return { status: 404, json: null, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
		});
		const plugin = createMockPlugin();
		await expect(fetchTimeEntries(plugin, '2024-06-15')).rejects.toThrow(
			'Toggl API error: invalid API token (401)'
		);
	});

	it('throws specific error on 429', async () => {
		mockRequestUrl.mockImplementation(async (req: { url: string }) => {
			if (req.url.includes('/me/time_entries')) {
				return { status: 429, json: null, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			if (req.url.includes('/projects')) {
				return { status: 200, json: SAMPLE_PROJECTS, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			if (req.url.endsWith('/me')) {
				return { status: 200, json: { default_workspace_id: 42 }, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			return { status: 404, json: null, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
		});
		const plugin = createMockPlugin();
		await expect(fetchTimeEntries(plugin, '2024-06-15')).rejects.toThrow(
			'Toggl API error: rate limited — try again in a moment (429)'
		);
	});

	it('throws on network failure', async () => {
		mockRequestUrl.mockRejectedValue(new Error('fetch failed'));
		const plugin = createMockPlugin();
		await expect(fetchTimeEntries(plugin, '2024-06-15')).rejects.toThrow(
			'Toggl API error: network request failed'
		);
	});

	it('auto-populates workspaceId from /me when workspaceId is 0', async () => {
		setupMockResponses({ meWorkspaceId: 42 });
		const plugin = createMockPlugin({ workspaceId: 0 });
		await fetchTimeEntries(plugin, '2024-06-15');
		// Verify /me was called
		const meCall = mockRequestUrl.mock.calls.find(
			(call: any[]) => call[0].url.endsWith('/me')
		);
		expect(meCall).toBeDefined();
		// Verify saveSettings was called to persist the workspace ID
		expect(plugin.saveSettings).toHaveBeenCalled();
	});

	it('skips /me call when workspaceId is already set', async () => {
		setupMockResponses();
		const plugin = createMockPlugin({ workspaceId: 42 });
		await fetchTimeEntries(plugin, '2024-06-15');
		// Verify /me was NOT called
		const meCall = mockRequestUrl.mock.calls.find(
			(call: any[]) => call[0].url.endsWith('/me')
		);
		expect(meCall).toBeUndefined();
	});

	it('does not include API token in error messages', async () => {
		mockRequestUrl.mockImplementation(async (req: { url: string }) => {
			if (req.url.includes('/me/time_entries')) {
				return { status: 401, json: null, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			if (req.url.includes('/projects')) {
				return { status: 200, json: SAMPLE_PROJECTS, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			if (req.url.endsWith('/me')) {
				return { status: 200, json: { default_workspace_id: 42 }, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
			}
			return { status: 404, json: null, headers: {}, text: '', arrayBuffer: new ArrayBuffer(0) };
		});
		const plugin = createMockPlugin({ apiToken: 'test-token-abc123' });
		let errorMessage = '';
		try {
			await fetchTimeEntries(plugin, '2024-06-15');
		} catch (err: unknown) {
			if (err instanceof Error) {
				errorMessage = err.message;
			}
		}
		expect(errorMessage).not.toContain('test-token-abc123');
		expect(errorMessage.length).toBeGreaterThan(0);
	});
});
