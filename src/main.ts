import { Plugin, Editor, Notice } from 'obsidian';
import { fetchTimeEntries, TimeEntry } from './api';
import { formatEntries } from './formatter';
import { TogglImportSettingTab } from './settings';

export interface TogglImportSettings {
	outputFormat: 'table' | 'plaintext';
	columns: {
		description: boolean;
		startTime: boolean;
		duration: boolean;
		tags: boolean;
		project: boolean;
	};
	delimiter: string;
	workspaceId: number;
}

export const DEFAULT_SETTINGS: TogglImportSettings = {
	outputFormat: 'table',
	columns: {
		description: true,
		startTime: true,
		duration: true,
		tags: false,
		project: false,
	},
	delimiter: '|',
	workspaceId: 0,
};

export default class TogglImportPlugin extends Plugin {
	settings!: TogglImportSettings;

	async getApiToken(): Promise<string> {
		return (this.app.loadLocalStorage('toggl-api-token') as string | null) ?? '';
	}

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new TogglImportSettingTab(this.app, this));
		this.addCommand({
			id: 'import-toggl-entries',
			name: 'Import Toggl Entries',
			editorCallback: async (editor: Editor) => {
				// D-04: Empty token guard — fail fast before any network call
				const token = await this.getApiToken();
				if (token === '') {
					new Notice('Configure your Toggl API token in Settings \u2192 Toggl Import first.');
					return;
				}

				// D-07: Date validation from active file basename
				const basename = this.app.workspace.getActiveFile()?.basename ?? '';
				if (!/^\d{4}-\d{2}-\d{2}$/.test(basename)) {
					new Notice('Active note filename is not a valid date (expected yyyy-mm-dd).');
					return;
				}

				// D-05: Fetch with structured error handling
				let entries: TimeEntry[];
				try {
					entries = await fetchTimeEntries(this, basename);
				} catch (err: unknown) {
					new Notice(err instanceof Error ? err.message : 'Toggl API error: unknown error');
					return;
				}

				// D-06: Empty result short-circuit (no insert)
				const formatted = formatEntries(entries, this.settings);
				if (formatted === '') {
					new Notice('No entries found for this date.');
					return;
				}

				// D-01 / D-02 / D-03: Insert at cursor with trailing newline + success notice
				editor.replaceSelection(formatted + '\n');
				new Notice(`Imported ${entries.length} entries`);
			},
		});
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		const raw = (await this.loadData()) ?? {};
		if (raw && typeof raw === 'object' && 'apiToken' in raw) {
			delete (raw as Record<string, unknown>).apiToken;
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, this.settings ?? {}, raw);
		// Persist sanitized form so data.json no longer carries the legacy field
		await this.saveSettings();
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
