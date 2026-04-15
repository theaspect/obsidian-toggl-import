import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLoadLocalStorage, mockSaveLocalStorage, mockLoadData, mockSaveData, mockAddCommand } = vi.hoisted(() => ({
	mockLoadLocalStorage: vi.fn(),
	mockSaveLocalStorage: vi.fn(),
	mockLoadData: vi.fn(),
	mockSaveData: vi.fn(),
	mockAddCommand: vi.fn(),
}));

vi.mock('obsidian', () => ({
	Plugin: class {
		app = {
			workspace: { getActiveFile: vi.fn() },
			loadLocalStorage: mockLoadLocalStorage,
			saveLocalStorage: mockSaveLocalStorage,
		};
		addCommand = mockAddCommand;
		addSettingTab = vi.fn();
		loadData = mockLoadData;
		saveData = mockSaveData;
	},
	Notice: vi.fn(),
	PluginSettingTab: class {},
	Setting: class {},
	requestUrl: vi.fn(),
}));

vi.mock('../src/api', () => ({ fetchTimeEntries: vi.fn() }));
vi.mock('../src/formatter', () => ({ formatEntries: vi.fn() }));
vi.mock('../src/settings', () => ({ TogglImportSettingTab: class {} }));

import TogglImportPlugin from '../src/main';

describe('TogglImportPlugin.getApiToken', () => {
	beforeEach(() => {
		mockLoadLocalStorage.mockReset();
		mockSaveLocalStorage.mockReset();
		mockLoadData.mockReset();
		mockSaveData.mockReset();
		mockAddCommand.mockReset();
	});

	it('SEC-02: returns token from localStorage key "toggl-api-token"', async () => {
		mockLoadLocalStorage.mockReturnValue('stored-token-xyz');
		const plugin = new TogglImportPlugin();
		const token = await plugin.getApiToken();
		expect(mockLoadLocalStorage).toHaveBeenCalledWith('toggl-api-token');
		expect(token).toBe('stored-token-xyz');
	});

	it('SEC-02: returns empty string when localStorage returns null', async () => {
		mockLoadLocalStorage.mockReturnValue(null);
		const plugin = new TogglImportPlugin();
		const token = await plugin.getApiToken();
		expect(token).toBe('');
	});
});

describe('TogglImportPlugin.loadSettings', () => {
	beforeEach(() => {
		mockLoadLocalStorage.mockReset();
		mockSaveLocalStorage.mockReset();
		mockLoadData.mockReset();
		mockSaveData.mockReset();
	});

	it('SEC-02: strips legacy apiToken from data.json and persists cleaned settings', async () => {
		mockLoadData.mockResolvedValue({ apiToken: 'legacy-plaintext-token', workspaceId: 99, delimiter: '|' });
		const plugin = new TogglImportPlugin();
		await plugin.loadSettings();
		expect(plugin.settings).not.toHaveProperty('apiToken');
		expect(plugin.settings.workspaceId).toBe(99);
		expect(mockSaveData).toHaveBeenCalledOnce();
		const savedArg = mockSaveData.mock.calls[0][0];
		expect(savedArg).not.toHaveProperty('apiToken');
		expect(savedArg.workspaceId).toBe(99);
	});

	it('SEC-02: preserves non-token fields when no legacy apiToken exists', async () => {
		mockLoadData.mockResolvedValue({ workspaceId: 42, outputFormat: 'plaintext' });
		const plugin = new TogglImportPlugin();
		await plugin.loadSettings();
		expect(plugin.settings.workspaceId).toBe(42);
		expect(plugin.settings.outputFormat).toBe('plaintext');
		expect(plugin.settings).not.toHaveProperty('apiToken');
	});
});
