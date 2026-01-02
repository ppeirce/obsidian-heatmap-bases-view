import { App, Modal, Plugin, PluginSettingTab, Setting, QueryController, ViewOption } from 'obsidian';
import { HeatmapView } from './HeatmapView';
import { HeatmapPluginSettings, DEFAULT_SETTINGS, ColorSchemeItem, DEFAULT_COLOR_SCHEMES } from './types';
import { isValidHexColor } from './colorUtils';

/**
 * Heatmap Bases View Plugin
 *
 * Provides a GitHub-contributions-style heatmap view for Obsidian Bases.
 * Visualizes boolean or numeric properties from daily notes over time.
 */
export default class HeatmapPlugin extends Plugin {
	settings: HeatmapPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new HeatmapSettingTab(this.app, this));

		// Register with Page Preview plugin for hover previews
		// Note: registerHoverLinkSource is not in the public type definitions but exists at runtime
		(this.app.workspace as unknown as {
			registerHoverLinkSource: (id: string, info: { display: string; defaultMod: boolean }) => void;
		}).registerHoverLinkSource('heatmap-bases-view', {
			display: 'Heatmap',
			defaultMod: true,
		});

		this.registerBasesView('heatmap', {
			name: 'Heatmap',
			icon: 'calendar-heat',
			factory: (controller: QueryController, containerEl: HTMLElement) => {
				return new HeatmapView(controller, containerEl, this);
			},
			options: (): ViewOption[] => [
				{
					type: 'property',
					key: 'dateProperty',
					displayName: 'Date property',
					placeholder: 'Use filename for daily notes',
				},
				{
					type: 'property',
					key: 'valueProperty',
					displayName: 'Value property',
				},
				{
					type: 'text',
					key: 'startDate',
					displayName: 'Start date',
					placeholder: 'YYYY-MM-DD (leave empty for auto)',
				},
				{
					type: 'text',
					key: 'endDate',
					displayName: 'End date',
					placeholder: 'YYYY-MM-DD (leave empty for today)',
				},
				{
					type: 'dropdown',
					key: 'colorScheme',
					displayName: 'Color scheme',
					default: 'green',
					options: this.getColorSchemeOptions(),
				},
				{
					type: 'dropdown',
					key: 'weekStart',
					displayName: 'Week starts on',
					default: '0',
					options: {
						'0': 'Sunday',
						'1': 'Monday',
					},
				},
				{
					type: 'toggle',
					key: 'showWeekdayLabels',
					displayName: 'Show weekday labels',
					default: true,
				},
				{
					type: 'toggle',
					key: 'showMonthLabels',
					displayName: 'Show month labels',
					default: true,
				},
				{
					type: 'text',
					key: 'minValue',
					displayName: 'Min value',
					placeholder: 'Auto (based on data)',
				},
				{
					type: 'text',
					key: 'maxValue',
					displayName: 'Max value',
					placeholder: 'Auto (based on data)',
				},
			],
		});
	}

	onunload() {
		// Cleanup is handled automatically by Obsidian
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as HeatmapPluginSettings | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
		// Ensure colorSchemes exists (migration from old settings)
		if (!this.settings.colorSchemes || this.settings.colorSchemes.length === 0) {
			this.settings.colorSchemes = DEFAULT_COLOR_SCHEMES;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Build dropdown options from color schemes in settings.
	 */
	getColorSchemeOptions(): Record<string, string> {
		const options: Record<string, string> = {};
		for (const scheme of this.settings.colorSchemes) {
			options[scheme.id] = scheme.name;
		}
		return options;
	}
}

/**
 * Settings tab for the Heatmap plugin.
 */
class HeatmapSettingTab extends PluginSettingTab {
	plugin: HeatmapPlugin;

	constructor(app: App, plugin: HeatmapPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Tooltip setting
		new Setting(containerEl)
			.setName('Show hex color in tooltip')
			.setDesc('Display the hex color code in cell tooltips on hover')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showHexColorInTooltip)
				.onChange(async (value) => {
					this.plugin.settings.showHexColorInTooltip = value;
					await this.plugin.saveSettings();
				}));

		// Color Schemes section
		new Setting(containerEl)
			.setName('Color schemes')
			.setHeading();

		new Setting(containerEl)
			.setDesc('Add, edit, or remove color schemes used in heatmaps. Changes are available in the view settings.')
			.addButton(btn => btn
				.setButtonText('Add color scheme')
				.setCta()
				.onClick(() => this.addScheme()));

		// List each scheme
		for (const scheme of this.plugin.settings.colorSchemes) {
			this.renderSchemeRow(containerEl, scheme);
		}
	}

	private renderSchemeRow(containerEl: HTMLElement, scheme: ColorSchemeItem): void {
		const setting = new Setting(containerEl)
			.setName(scheme.name)
			.setDesc(`${scheme.zeroColor} → ${scheme.maxColor}`)
			.addButton(btn => btn
				.setIcon('pencil')
				.setTooltip('Edit')
				.onClick(() => this.editScheme(scheme)))
			.addButton(btn => btn
				.setIcon('trash')
				.setTooltip('Delete')
				.onClick(() => this.deleteScheme(scheme)));

		// Add color preview swatch
		const previewEl = setting.controlEl.createDiv('heatmap-color-scheme-preview');
		previewEl.setCssProps({ 'background': `linear-gradient(to right, ${scheme.zeroColor}, ${scheme.maxColor})` });
		// Move preview to the left of buttons
		setting.controlEl.insertBefore(previewEl, setting.controlEl.firstChild);
	}

	private addScheme(): void {
		const newScheme: ColorSchemeItem = {
			id: '',
			name: '',
			zeroColor: '#ebedf0',
			maxColor: '#39d353',
		};

		new EditSchemeModal(this.app, newScheme, true, (result) => {
			this.plugin.settings.colorSchemes.push(result);
			void this.plugin.saveSettings().then(() => this.display());
		}).open();
	}

	private editScheme(scheme: ColorSchemeItem): void {
		new EditSchemeModal(this.app, scheme, false, (result) => {
			const index = this.plugin.settings.colorSchemes.findIndex(s => s.id === scheme.id);
			if (index !== -1) {
				this.plugin.settings.colorSchemes[index] = result;
				void this.plugin.saveSettings().then(() => this.display());
			}
		}).open();
	}

	private async deleteScheme(scheme: ColorSchemeItem): Promise<void> {
		const index = this.plugin.settings.colorSchemes.findIndex(s => s.id === scheme.id);
		if (index !== -1) {
			this.plugin.settings.colorSchemes.splice(index, 1);
			// Ensure we always have at least one scheme
			if (this.plugin.settings.colorSchemes.length === 0) {
				this.plugin.settings.colorSchemes = [...DEFAULT_COLOR_SCHEMES];
			}
			await this.plugin.saveSettings();
			this.display();
		}
	}
}

/**
 * Modal for editing or creating a color scheme.
 */
class EditSchemeModal extends Modal {
	private scheme: ColorSchemeItem;
	private isNew: boolean;
	private onSave: (scheme: ColorSchemeItem) => void;
	private errorEl: HTMLElement | null = null;

	constructor(app: App, scheme: ColorSchemeItem, isNew: boolean, onSave: (scheme: ColorSchemeItem) => void) {
		super(app);
		this.scheme = { ...scheme };
		this.isNew = isNew;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: this.isNew ? 'Add color scheme' : 'Edit color scheme' });

		new Setting(contentEl)
			.setName('Name')
			.setDesc('Display name for this color scheme')
			.addText(text => text
				.setPlaceholder('My custom scheme')
				.setValue(this.scheme.name)
				.onChange(value => this.scheme.name = value));

		new Setting(contentEl)
			.setName('Zero color')
			.setDesc('Color for empty/zero values (hex format, e.g. #ebedf0)')
			.addText(text => text
				.setPlaceholder('#ebedf0')
				.setValue(this.scheme.zeroColor)
				.onChange(value => this.scheme.zeroColor = value));

		new Setting(contentEl)
			.setName('Max color')
			.setDesc('Color for maximum values (hex format, e.g. #39d353)')
			.addText(text => text
				.setPlaceholder('#39d353')
				.setValue(this.scheme.maxColor)
				.onChange(value => this.scheme.maxColor = value));

		// Error message area
		this.errorEl = contentEl.createDiv('heatmap-modal-error');

		// Buttons
		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Save')
				.setCta()
				.onClick(() => this.save()))
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}

	private save(): void {
		// Validate
		if (!this.scheme.name.trim()) {
			this.showError('Name is required');
			return;
		}
		if (!isValidHexColor(this.scheme.zeroColor)) {
			this.showError('Zero color must be a valid hex color (e.g. #ebedf0)');
			return;
		}
		if (!isValidHexColor(this.scheme.maxColor)) {
			this.showError('Max color must be a valid hex color (e.g. #39d353)');
			return;
		}

		// Normalize colors
		if (!this.scheme.zeroColor.startsWith('#')) {
			this.scheme.zeroColor = '#' + this.scheme.zeroColor;
		}
		if (!this.scheme.maxColor.startsWith('#')) {
			this.scheme.maxColor = '#' + this.scheme.maxColor;
		}

		// Generate id from name if new
		if (this.isNew) {
			this.scheme.id = this.scheme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			if (!this.scheme.id) {
				this.scheme.id = 'scheme';
			}
		}

		this.onSave(this.scheme);
		this.close();
	}

	private showError(message: string): void {
		if (this.errorEl) {
			this.errorEl.textContent = message;
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
