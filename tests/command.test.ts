import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures all mock functions are available when vi.mock factory runs (hoisted to top)
const {
	mockNotice,
	mockFetchTimeEntries,
	mockFormatEntries,
	mockAddCommand,
	mockGetActiveFile,
	mockReplaceSelection,
} = vi.hoisted(() => ({
	mockNotice: vi.fn(),
	mockFetchTimeEntries: vi.fn(),
	mockFormatEntries: vi.fn(),
	mockAddCommand: vi.fn(),
	mockGetActiveFile: vi.fn(),
	mockReplaceSelection: vi.fn(),
}));

// Mock obsidian module — plugin base class + Notice
vi.mock('obsidian', () => ({
	Plugin: class {
		app = {
			workspace: { getActiveFile: mockGetActiveFile },
			loadLocalStorage: vi.fn().mockReturnValue(null),
			saveLocalStorage: vi.fn(),
		};
		addCommand = mockAddCommand;
		addSettingTab = vi.fn();
		async loadData() { return {}; }
		async saveData() {}
	},
	Notice: mockNotice,
	PluginSettingTab: class {},
	Setting: class {},
	requestUrl: vi.fn(),
}));

// Mock API and formatter at the module boundary — T-05-01: prevents real network calls
vi.mock('../src/api', () => ({ fetchTimeEntries: mockFetchTimeEntries }));
vi.mock('../src/formatter', () => ({ formatEntries: mockFormatEntries }));
vi.mock('../src/settings', () => ({ TogglImportSettingTab: class {} }));

// Import AFTER mocks are set up
import TogglImportPlugin from '../src/main';

/**
 * Helper: instantiate the plugin, configure settings, call onload(), and return
 * the editorCallback extracted from the registered command spec.
 */
async function loadPluginAndGetCallback() {
	const plugin = new TogglImportPlugin();
	plugin.settings = {
		outputFormat: 'table',
		columns: {
			description: true,
			startTime: true,
			duration: true,
			tags: false,
			project: false,
		},
		delimiter: '|',
		templateString: '$description ($duration)',
		workspaceId: 42,
		sortOrder: 'asc' as const,
		dayWrapTime: '00:00',
	};
	await plugin.onload();
	(plugin as any).getApiToken = vi.fn().mockResolvedValue('token');
	const spec = mockAddCommand.mock.calls[0][0];
	const editor = { replaceSelection: mockReplaceSelection } as any;
	return { plugin, spec, editorCallback: spec.editorCallback, editor };
}

describe('Import Toggl Entries command', () => {
	beforeEach(() => {
		mockNotice.mockReset();
		mockFetchTimeEntries.mockReset();
		mockFormatEntries.mockReset();
		mockAddCommand.mockReset();
		mockGetActiveFile.mockReset();
		mockReplaceSelection.mockReset();
	});

	// CMD-01: command registration
	it('CMD-01: registers Import Toggl Entries command on onload', async () => {
		const plugin = new TogglImportPlugin();
		await plugin.onload();

		expect(mockAddCommand).toHaveBeenCalledOnce();
		const spec = mockAddCommand.mock.calls[0][0];
		expect(spec.id).toBe('import-toggl-entries');
		expect(spec.name).toBe('Import Toggl Entries');
		expect(typeof spec.editorCallback).toBe('function');
	});

	// CMD-02: reads active note basename as date and passes to fetchTimeEntries
	it('CMD-02: reads active note basename as date and calls fetchTimeEntries', async () => {
		mockGetActiveFile.mockReturnValue({ basename: '2024-06-15' });
		mockFetchTimeEntries.mockResolvedValue([{ id: 1 }]);
		mockFormatEntries.mockReturnValue('formatted');

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockFetchTimeEntries).toHaveBeenCalledWith(expect.anything(), '2024-06-15');
	});

	// CMD-03 / D-07: rejects non-date filename
	it('CMD-03: rejects non-date filename, shows notice, makes no API call', async () => {
		mockGetActiveFile.mockReturnValue({ basename: 'not-a-date' });

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockNotice).toHaveBeenCalledWith(
			'Note filename must start with a valid date (expected: yyyy-mm-dd, e.g. 2026-01-15 or 2026-01-15 Daily Note).'
		);
		expect(mockFetchTimeEntries).not.toHaveBeenCalled();
	});

	// CMD-03: null active file also shows the date validation notice
	it('CMD-03: null active file shows date validation notice, no API call', async () => {
		mockGetActiveFile.mockReturnValue(null);

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockNotice).toHaveBeenCalledWith(
			'Note filename must start with a valid date (expected: yyyy-mm-dd, e.g. 2026-01-15 or 2026-01-15 Daily Note).'
		);
		expect(mockFetchTimeEntries).not.toHaveBeenCalled();
	});

	// D-04: empty token guard fires before date validation
	it('CMD-03b / D-04: empty token guard fires before date check', async () => {
		// Set valid date so if token guard fails, date check would succeed
		mockGetActiveFile.mockReturnValue({ basename: '2024-06-15' });

		const { editorCallback, editor, plugin } = await loadPluginAndGetCallback();
		(plugin as any).getApiToken = vi.fn().mockResolvedValue('');
		await editorCallback(editor);

		expect(mockNotice).toHaveBeenCalledWith(
			'Configure your Toggl API token in Settings \u2192 Toggl Import first.'
		);
		expect(mockFetchTimeEntries).not.toHaveBeenCalled();
	});

	// CMD-05: API error message surfaces as Notice
	it('CMD-05: API error message surfaces as Notice, no insert', async () => {
		mockGetActiveFile.mockReturnValue({ basename: '2024-06-15' });
		mockFetchTimeEntries.mockRejectedValue(
			new Error('Toggl API error: invalid API token (401)')
		);

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockNotice).toHaveBeenCalledWith('Toggl API error: invalid API token (401)');
		expect(mockReplaceSelection).not.toHaveBeenCalled();
	});

	// CMD-05: non-Error rejection falls back to unknown error message
	it('CMD-05: non-Error rejection shows generic error notice', async () => {
		mockGetActiveFile.mockReturnValue({ basename: '2024-06-15' });
		mockFetchTimeEntries.mockRejectedValue('weird');

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockNotice).toHaveBeenCalledWith('Toggl API error: unknown error');
		expect(mockReplaceSelection).not.toHaveBeenCalled();
	});

	// CMD-06: empty entries shows informational notice and does not insert
	it('CMD-06: empty entries shows info notice, no insert', async () => {
		mockGetActiveFile.mockReturnValue({ basename: '2024-06-15' });
		mockFetchTimeEntries.mockResolvedValue([]);
		mockFormatEntries.mockReturnValue('');

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockNotice).toHaveBeenCalledWith('No entries found for this date.');
		expect(mockReplaceSelection).not.toHaveBeenCalled();
	});

	// IMP-02: prefix filename tests
	it('IMP-02: basename with date prefix and suffix calls fetchTimeEntries with the date only', async () => {
		mockGetActiveFile.mockReturnValue({ basename: '2026-12-31 Daily Note' });
		mockFetchTimeEntries.mockResolvedValue([{ id: 1 }]);
		mockFormatEntries.mockReturnValue('x');

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockFetchTimeEntries).toHaveBeenCalledWith(expect.anything(), '2026-12-31');
	});

	it('IMP-02: exact yyyy-mm-dd basename still passes', async () => {
		mockGetActiveFile.mockReturnValue({ basename: '2026-12-31' });
		mockFetchTimeEntries.mockResolvedValue([{ id: 1 }]);
		mockFormatEntries.mockReturnValue('x');

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockFetchTimeEntries).toHaveBeenCalledWith(expect.anything(), '2026-12-31');
	});

	it('IMP-02: basename without date prefix shows updated error notice', async () => {
		mockGetActiveFile.mockReturnValue({ basename: 'prefix-without-date-foo' });

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		expect(mockNotice).toHaveBeenCalledWith(
			'Note filename must start with a valid date (expected: yyyy-mm-dd, e.g. 2026-01-15 or 2026-01-15 Daily Note).'
		);
		expect(mockFetchTimeEntries).not.toHaveBeenCalled();
	});

	// CMD-07 / REIMP-01: insert at cursor with trailing newline + success notice
	it('CMD-07 / REIMP-01: inserts formatted entries at cursor with trailing newline and success notice', async () => {
		const formattedText = '| a | b |\n|---|---|\n| x | y |';
		mockGetActiveFile.mockReturnValue({ basename: '2024-06-15' });
		mockFetchTimeEntries.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
		mockFormatEntries.mockReturnValue(formattedText);

		const { editorCallback, editor } = await loadPluginAndGetCallback();
		await editorCallback(editor);

		// REIMP-01: append-only — replaceSelection is the ONLY mutation method
		expect(mockReplaceSelection).toHaveBeenCalledOnce();
		expect(mockReplaceSelection).toHaveBeenCalledWith(formattedText + '\n');

		// Success notice shows entry count
		expect(mockNotice).toHaveBeenCalledWith('Imported 3 entries');
	});
});
