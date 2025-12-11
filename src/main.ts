import { Plugin, QueryController, ViewOption } from 'obsidian';
import { HeatmapView } from './HeatmapView';

/**
 * Heatmap Bases View Plugin
 *
 * Provides a GitHub-contributions-style heatmap view for Obsidian Bases.
 * Visualizes boolean or numeric properties from daily notes over time.
 */
export default class HeatmapPlugin extends Plugin {
	async onload() {
		this.registerBasesView('heatmap', {
			name: 'Heatmap',
			icon: 'calendar-heat',
			factory: (controller: QueryController, containerEl: HTMLElement) => {
				return new HeatmapView(controller, containerEl);
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
			],
		});
	}

	onunload() {
		// Cleanup is handled automatically by Obsidian
	}
}
