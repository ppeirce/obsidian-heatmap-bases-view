import { App, Plugin, PluginSettingTab, Setting, QueryController, ViewOption } from 'obsidian';
import { HeatmapView } from './HeatmapView';
import { HeatmapPluginSettings, DEFAULT_SETTINGS } from './types';

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
					options: {
						'green': 'Green',
						'purple': 'Purple',
						'blue': 'Blue',
						'orange': 'Orange',
						'gray': 'Gray',
					},
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as HeatmapPluginSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

		new Setting(containerEl)
			.setName('Show hex color in tooltip')
			.setDesc('Display the hex color code in cell tooltips on hover')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showHexColorInTooltip)
				.onChange(async (value) => {
					this.plugin.settings.showHexColorInTooltip = value;
					await this.plugin.saveSettings();
				}));
	}
}
