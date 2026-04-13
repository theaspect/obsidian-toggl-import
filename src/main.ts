import { Plugin } from 'obsidian';
import { TogglImportSettingTab } from './settings';

export interface TogglImportSettings {
	apiToken: string;
	outputFormat: 'table' | 'plaintext';
	columns: {
		description: boolean;
		startTime: boolean;
		duration: boolean;
		tags: boolean;
		project: boolean;
	};
	delimiter: string;
}

export const DEFAULT_SETTINGS: TogglImportSettings = {
	apiToken: '',
	outputFormat: 'table',
	columns: {
		description: true,
		startTime: true,
		duration: true,
		tags: false,
		project: false,
	},
	delimiter: '|',
};

export default class TogglImportPlugin extends Plugin {
	settings!: TogglImportSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new TogglImportSettingTab(this.app, this));
		// Phase 5: register import command
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
