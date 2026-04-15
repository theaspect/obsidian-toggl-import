import { App, PluginSettingTab, Setting } from 'obsidian';
import TogglImportPlugin, { TogglImportSettings } from './main';

export class TogglImportSettingTab extends PluginSettingTab {
	plugin: TogglImportPlugin;

	constructor(app: App, plugin: TogglImportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Toggl API token')
			.setDesc('Stored locally on this device \u2014 not synced to Obsidian Sync.')
			.addText(text => text
				.setPlaceholder('Enter your API token')
				.setValue((this.plugin.app.loadLocalStorage('toggl-api-token') as string | null) ?? '')
				.onChange((value) => {
					this.plugin.app.saveLocalStorage('toggl-api-token', value);
				})
				.then(c => { c.inputEl.type = 'password'; })
			);

		new Setting(containerEl)
			.setName('Output format')
			.addDropdown(drop => drop
				.addOption('table', 'Markdown table')
				.addOption('plaintext', 'Plain text')
				.setValue(this.plugin.settings.outputFormat)
				.onChange(async (value) => {
					this.plugin.settings.outputFormat = value as 'table' | 'plaintext';
					this.display();
					await this.plugin.saveSettings();
				})
			);

		if (this.plugin.settings.outputFormat === 'plaintext') {
			new Setting(containerEl)
				.setName('Delimiter')
				.setDesc('Character(s) used to separate columns in plain text output.')
				.addText(text => text
					.setValue(this.plugin.settings.delimiter)
					.onChange(async (value) => {
						this.plugin.settings.delimiter = value;
						await this.plugin.saveSettings();
					})
				);
		}

		new Setting(containerEl).setName('Columns').setHeading();

		const columns: Array<{ key: keyof TogglImportSettings['columns']; label: string }> = [
			{ key: 'description', label: 'Description' },
			{ key: 'startTime',   label: 'Start time' },
			{ key: 'duration',    label: 'Duration' },
			{ key: 'tags',        label: 'Tags' },
			{ key: 'project',     label: 'Project' },
		];

		for (const col of columns) {
			new Setting(containerEl)
				.setName(col.label)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.columns[col.key])
					.onChange(async (value) => {
						this.plugin.settings.columns[col.key] = value;
						await this.plugin.saveSettings();
					})
				);
		}
	}
}
