import { Plugin, Editor, Notice } from 'obsidian';
import { fetchTimeEntries, TimeEntry } from './api';
import { formatEntries } from './formatter';
import { TogglImportSettingTab } from './settings';

export interface TogglImportSettings {
	outputFormat: 'table' | 'plaintext' | 'template';
	columns: {
		description: boolean;
		startTime: boolean;
		duration: boolean;
		tags: boolean;
		project: boolean;
	};
	delimiter: string;
	templateString: string;
	workspaceId: number;
	sortOrder: 'asc' | 'desc';
	dayWrapTime: string;
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
	templateString: '$description ($duration)',
	workspaceId: 0,
	sortOrder: 'asc',
	dayWrapTime: '00:00',
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
			name: 'Import Toggl entries',
			editorCallback: async (editor: Editor) => {
				// D-04: Empty token guard — fail fast before any network call
				const token = await this.getApiToken();
				if (token === '') {
					new Notice('Configure your Toggl API token in Settings \u2192 Toggl Import first.');
					return;
				}

				// D-07: Date validation from active file basename (IMP-02: prefix match)
				const basename = this.app.workspace.getActiveFile()?.basename ?? '';
				const dateMatch = basename.match(/^(\d{4}-\d{2}-\d{2})/);
				if (!dateMatch) {
					new Notice('Note filename must start with a valid date (expected: yyyy-mm-dd, e.g. 2026-01-15 or 2026-01-15 Daily Note).');
					return;
				}
				const date = dateMatch[1] as string;

				// D-05: Fetch with structured error handling
				let entries: TimeEntry[];
				try {
					entries = await fetchTimeEntries(this, date);
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
