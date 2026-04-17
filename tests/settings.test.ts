import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
	mockNotice,
	mockTogglGet,
	mockLoadLocalStorage,
	capturedOnClick,
	fakeButton,
} = vi.hoisted(() => {
	const captured: { fn: ((evt?: unknown) => Promise<void>) | null } = { fn: null };
	const fake = {
		setButtonText: vi.fn().mockReturnThis(),
		setDisabled: vi.fn().mockReturnThis(),
		onClick: vi.fn(function (this: any, cb: any) { captured.fn = cb; return this; }),
	};
	return {
		mockNotice: vi.fn(),
		mockTogglGet: vi.fn(),
		mockLoadLocalStorage: vi.fn(),
		capturedOnClick: captured,
		fakeButton: fake,
	};
});

vi.mock('obsidian', () => {
	class FakeSetting {
		constructor(_containerEl: unknown) {}
		setName(_: string) { return this; }
		setDesc(_: string) { return this; }
		setHeading() { return this; }
		addText(cb: (t: any) => void) {
			const text = {
				setPlaceholder: vi.fn().mockReturnThis(),
				setValue: vi.fn().mockReturnThis(),
				onChange: vi.fn().mockReturnThis(),
				then: vi.fn().mockReturnThis(),
				inputEl: { type: 'text' },
			};
			cb(text);
			return this;
		}
		addDropdown(cb: (d: any) => void) {
			const drop = {
				addOption: vi.fn().mockReturnThis(),
				setValue: vi.fn().mockReturnThis(),
				onChange: vi.fn().mockReturnThis(),
			};
			cb(drop);
			return this;
		}
		addToggle(cb: (t: any) => void) {
			const toggle = {
				setValue: vi.fn().mockReturnThis(),
				setDisabled: vi.fn().mockReturnThis(),
				onChange: vi.fn().mockReturnThis(),
			};
			cb(toggle);
			return this;
		}
		addTextArea(cb: (t: any) => void) {
			const text = {
				setPlaceholder: vi.fn().mockReturnThis(),
				setValue: vi.fn().mockReturnThis(),
				onChange: vi.fn().mockReturnThis(),
			};
			cb(text);
			return this;
		}
		addButton(cb: (b: any) => void) {
			cb(fakeButton);
			return this;
		}
	}
	return {
		App: class {},
		PluginSettingTab: class {
			app: any; plugin: any;
			constructor(app: any, plugin: any) { this.app = app; this.plugin = plugin; }
		},
		Setting: FakeSetting,
		Notice: mockNotice,
		ButtonComponent: class {},
		requestUrl: vi.fn(),
	};
});

vi.mock('../src/api', () => ({
	togglGet: mockTogglGet,
	BASE: 'https://api.track.toggl.com/api/v9',
}));

import { TogglImportSettingTab } from '../src/settings';

function makeTab() {
	const containerEl = {
		empty: vi.fn(),
		// Minimal stub — FakeSetting constructor ignores it
	};
	const plugin = {
		app: { loadLocalStorage: mockLoadLocalStorage, saveLocalStorage: vi.fn() },
		settings: {
			outputFormat: 'table' as const,
			columns: { description: true, startTime: true, duration: true, tags: false, project: false },
			delimiter: '|',
			templateString: '$description ($duration)',
			workspaceId: 42,
			sortOrder: 'asc' as const,
			dayWrapTime: '00:00',
		},
		saveSettings: vi.fn().mockResolvedValue(undefined),
	} as any;
	const tab = new TogglImportSettingTab({} as any, plugin);
	(tab as any).containerEl = containerEl;
	return { tab, plugin, containerEl };
}

describe('Test connection button (SEC-01)', () => {
	beforeEach(() => {
		mockNotice.mockReset();
		mockTogglGet.mockReset();
		mockLoadLocalStorage.mockReset();
		fakeButton.setButtonText.mockClear();
		fakeButton.setDisabled.mockClear();
		fakeButton.onClick.mockClear();
		capturedOnClick.fn = null;
	});

	it('SEC-01: shows success notice with fullname from /me response', async () => {
		mockLoadLocalStorage.mockReturnValue('valid-token');
		mockTogglGet.mockResolvedValue({ fullname: 'Jane Doe' });
		const { tab } = makeTab();
		tab.display();
		expect(capturedOnClick.fn).not.toBeNull();
		await capturedOnClick.fn!();
		expect(mockTogglGet).toHaveBeenCalledWith(
			'https://api.track.toggl.com/api/v9/me',
			'valid-token'
		);
		expect(mockNotice).toHaveBeenCalledWith('Connected as Jane Doe');
	});

	it('SEC-01: shows error notice mirroring togglGet error message on 401', async () => {
		mockLoadLocalStorage.mockReturnValue('bad-token');
		mockTogglGet.mockRejectedValue(new Error('Toggl API error: invalid API token (401)'));
		const { tab } = makeTab();
		tab.display();
		await capturedOnClick.fn!();
		expect(mockNotice).toHaveBeenCalledWith('Toggl API error: invalid API token (401)');
	});

	it('SEC-01: disables button during request and re-enables after success', async () => {
		mockLoadLocalStorage.mockReturnValue('valid-token');
		let resolveIt: (v: any) => void = () => {};
		mockTogglGet.mockReturnValue(new Promise(r => { resolveIt = r; }));
		const { tab } = makeTab();
		tab.display();
		const pending = capturedOnClick.fn!();
		// While in flight: disabled true should have fired before any await
		expect(fakeButton.setDisabled).toHaveBeenCalledWith(true);
		resolveIt({ fullname: 'Jane Doe' });
		await pending;
		// After settle: token is non-empty so re-enabled (false)
		expect(fakeButton.setDisabled).toHaveBeenCalledWith(false);
	});

	it('SEC-01: disables button during request and re-enables after failure', async () => {
		mockLoadLocalStorage.mockReturnValue('bad-token');
		let rejectIt: (e: any) => void = () => {};
		mockTogglGet.mockReturnValue(new Promise((_, r) => { rejectIt = r; }));
		const { tab } = makeTab();
		tab.display();
		const pending = capturedOnClick.fn!();
		expect(fakeButton.setDisabled).toHaveBeenCalledWith(true);
		rejectIt(new Error('Toggl API error: network request failed'));
		await pending;
		expect(fakeButton.setDisabled).toHaveBeenCalledWith(false);
		expect(mockNotice).toHaveBeenCalledWith('Toggl API error: network request failed');
	});

	it('SEC-01: button is disabled initially when token is empty', () => {
		mockLoadLocalStorage.mockReturnValue('');
		const { tab } = makeTab();
		tab.display();
		expect(fakeButton.setDisabled).toHaveBeenCalledWith(true);
	});

	it('SEC-01: button is enabled initially when token is present', () => {
		mockLoadLocalStorage.mockReturnValue('some-token');
		const { tab } = makeTab();
		tab.display();
		expect(fakeButton.setDisabled).toHaveBeenCalledWith(false);
	});

	it('SEC-01: non-Error rejection falls back to generic message', async () => {
		mockLoadLocalStorage.mockReturnValue('token');
		mockTogglGet.mockRejectedValue('weird');
		const { tab } = makeTab();
		tab.display();
		await capturedOnClick.fn!();
		expect(mockNotice).toHaveBeenCalledWith('Toggl API error: unknown error');
	});
});
