import { App, PluginSettingTab, Setting, Notice, ButtonComponent } from 'obsidian';
import TogglImportPlugin, { TogglImportSettings } from './main';
import { togglGet, BASE } from './api';

export class TogglImportSettingTab extends PluginSettingTab {
	plugin: TogglImportPlugin;

	constructor(app: App, plugin: TogglImportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		let testBtn: ButtonComponent;

		const currentToken = (this.plugin.app.loadLocalStorage('toggl-api-token') as string | null) ?? '';

		// --- Connection section ---
		new Setting(containerEl).setName('Connection').setHeading();

		new Setting(containerEl)
			.setName('Toggl API token')
			.setDesc('Stored locally on this device \u2014 not synced to Obsidian Sync.')
			.addText(text => text
				.setPlaceholder('Enter your API token')
				.setValue(currentToken)
				.onChange((value) => {
					this.plugin.app.saveLocalStorage('toggl-api-token', value);
					if (testBtn) testBtn.setDisabled(value.trim() === '');
				})
				.then(c => { c.inputEl.type = 'password'; })
			)
			.addButton((btn: ButtonComponent) => {
				testBtn = btn;
				btn.setButtonText('Test')
					.setDisabled(currentToken.trim() === '')
					.onClick(async () => {
						btn.setDisabled(true);
						btn.setButtonText('Testing...');
						try {
							const token = (this.plugin.app.loadLocalStorage('toggl-api-token') as string | null) ?? '';
							const me = await togglGet<{ fullname: string }>(`${BASE}/me`, token);
							new Notice(`Connected as ${me.fullname}`);
						} catch (err: unknown) {
							new Notice(err instanceof Error ? err.message : 'Toggl API error: unknown error');
						} finally {
							const current = (this.plugin.app.loadLocalStorage('toggl-api-token') as string | null) ?? '';
							btn.setDisabled(current.trim() === '');
							btn.setButtonText('Test');
						}
					});
			});

		new Setting(containerEl)
			.setName('Sort order')
			.setDesc('Order in which imported entries appear.')
			.addDropdown(drop => drop
				.addOption('asc', 'Ascending (oldest first)')
				.addOption('desc', 'Descending (newest first)')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value) => {
					this.plugin.settings.sortOrder = value as 'asc' | 'desc';
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Day wrap time')
			.setDesc('Entries starting before this time (HH:MM) are treated as the previous day. Default 00:00 disables this.')
			.addText(text => text
				.setPlaceholder('00:00')
				.setValue(this.plugin.settings.dayWrapTime)
				.then(t => { t.inputEl.addClass('toggl-import-day-wrap-input'); })
				.onChange(async (value) => {
					if (!/^\d{2}:\d{2}$/.test(value)) {
						new Notice('Day wrap time must be in HH:MM format (e.g. 02:00). Value not saved.');
						return;
					}
					this.plugin.settings.dayWrapTime = value;
					await this.plugin.saveSettings();
				})
			);

		// --- Formatting section ---
		new Setting(containerEl).setName('Formatting').setHeading();

		new Setting(containerEl)
			.setName('Output format')
			.addDropdown(drop => drop
				.addOption('plaintext', 'Plain text')
				.addOption('template', 'Custom template')
				.addOption('table', 'Markdown table')
				.setValue(this.plugin.settings.outputFormat)
				.onChange(async (value) => {
					this.plugin.settings.outputFormat = value as 'table' | 'plaintext' | 'template';
					this.display();
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Delimiter')
			.setDesc('Character(s) used to separate columns in plain text output.')
			.setDisabled(this.plugin.settings.outputFormat !== 'plaintext')
			.addText(text => text
				.setValue(this.plugin.settings.delimiter)
				.setDisabled(this.plugin.settings.outputFormat !== 'plaintext')
				.onChange(async (value) => {
					this.plugin.settings.delimiter = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Template')
			.setDesc('Available: description, start, duration, tags, project')
			// addText (wide): deliberately using text input rather than addTextArea —
			// the single-line wide input (styled by quick task 260416-vuj) is preferred
			// for template strings over a multi-line textarea.
			.setDisabled(this.plugin.settings.outputFormat !== 'template')
			.addText(text => text
				.setPlaceholder('e.g. $description ($duration)')
				.setValue(this.plugin.settings.templateString)
				.setDisabled(this.plugin.settings.outputFormat !== 'template')
				.onChange(async (value) => {
					this.plugin.settings.templateString = value;
					await this.plugin.saveSettings();
				})
			);

		// --- Columns section ---
		new Setting(containerEl).setName('Columns').setHeading();

		const columns: Array<{ key: keyof TogglImportSettings['columns']; label: string }> = [
			{ key: 'description', label: 'Description' },
			{ key: 'startTime',   label: 'Start time' },
			{ key: 'duration',    label: 'Duration' },
			{ key: 'tags',        label: 'Tags' },
			{ key: 'project',     label: 'Project' },
		];

		const isTemplate = this.plugin.settings.outputFormat === 'template';

		for (const col of columns) {
			new Setting(containerEl)
				.setName(col.label)
				.setDisabled(isTemplate)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.columns[col.key])
					.setDisabled(isTemplate)
					.onChange(async (value) => {
						this.plugin.settings.columns[col.key] = value;
						await this.plugin.saveSettings();
					})
				);
		}
	}
}
