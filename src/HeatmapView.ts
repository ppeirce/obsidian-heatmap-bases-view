import {
	BasesView,
	BasesEntry,
	QueryController,
} from 'obsidian';
import { ColorScheme, HeatmapViewConfig, ProcessedData } from './types';
import { processData, detectValueType } from './data';
import { renderHeatmap, createEmptyState, RenderOptions } from './renderer';
import { setupInteractions } from './interactions';
import { calculateDateRange } from './dateUtils';
import type HeatmapPlugin from './main';

/**
 * Heatmap view implementation for Obsidian Bases.
 */
export class HeatmapView extends BasesView {
	readonly type = 'heatmap';

	private containerEl: HTMLElement;
	private cleanupInteractions: (() => void) | null = null;
	private processedData: ProcessedData | null = null;

	constructor(
		controller: QueryController,
		parentEl: HTMLElement,
		private plugin: HeatmapPlugin
	) {
		super(controller);
		this.containerEl = parentEl.createDiv('heatmap-view-container');
	}


	/**
	 * Get the current view configuration with defaults.
	 */
	private getConfig(): HeatmapViewConfig {
		const config = this.config;

		// Parse optional numeric values
		const minValueStr = config.get('minValue') as string;
		const maxValueStr = config.get('maxValue') as string;
		const minValue = minValueStr ? parseFloat(minValueStr) : null;
		const maxValue = maxValueStr ? parseFloat(maxValueStr) : null;

		return {
			dateProperty: (config.get('dateProperty') as string) || '__filename__',
			valueProperty: (config.get('valueProperty') as string) || '',
			startDate: (config.get('startDate') as string) || null,
			endDate: (config.get('endDate') as string) || null,
			colorScheme: (config.get('colorScheme') as ColorScheme) || 'green',
			weekStart: parseInt(config.get('weekStart') as string || '0', 10) as 0 | 1,
			showWeekdayLabels: config.get('showWeekdayLabels') !== false,
			showMonthLabels: config.get('showMonthLabels') !== false,
			minValue: minValue !== null && !isNaN(minValue) ? minValue : null,
			maxValue: maxValue !== null && !isNaN(maxValue) ? maxValue : null,
		};
	}

	/**
	 * Called when query data changes.
	 */
	onDataUpdated(): void {
		this.render();
	}

	/**
	 * Render the heatmap view.
	 */
	private render(): void {
		// Clean up previous interactions
		if (this.cleanupInteractions) {
			this.cleanupInteractions();
			this.cleanupInteractions = null;
		}

		// Clear container
		this.containerEl.empty();

		const viewConfig = this.getConfig();

		// Check for required configuration
		if (!viewConfig.valueProperty) {
			const emptyState = createEmptyState(
				'Configure value property',
				'Select a property to visualize in the view settings.'
			);
			this.containerEl.appendChild(emptyState);
			return;
		}

		// Get entries from query data
		const queryData = this.data;

		// If data hasn't loaded yet, don't render anything.
		// onDataUpdated() will be called again when data is ready.
		if (!queryData) {
			return;
		}

		const entries: BasesEntry[] = queryData.data || [];

		if (entries.length === 0) {
			const emptyState = createEmptyState(
				'No data to display',
				'No notes found in the current filter. Check your Base filters.'
			);
			this.containerEl.appendChild(emptyState);
			return;
		}

		// Detect value type for validation
		const valueType = detectValueType(entries, viewConfig.valueProperty, viewConfig.dateProperty);
		if (valueType === 'unsupported') {
			const emptyState = createEmptyState(
				'Unsupported property type',
				`"${viewConfig.valueProperty}" is not a boolean or number property. Heatmap requires boolean or number properties.`
			);
			this.containerEl.appendChild(emptyState);
			return;
		}

		// Process data
		this.processedData = processData(
			entries,
			viewConfig.dateProperty,
			viewConfig.valueProperty
		);

		// Override stats with config values if provided
		if (viewConfig.minValue !== null) {
			this.processedData.stats.min = viewConfig.minValue;
		}
		if (viewConfig.maxValue !== null) {
			this.processedData.stats.max = viewConfig.maxValue;
		}

		// Check if we have any valid dated entries
		if (this.processedData.entries.size === 0) {
			const emptyState = createEmptyState(
				'No dated notes found',
				'No notes with valid dates were found. Check your date property setting.'
			);
			this.containerEl.appendChild(emptyState);
			return;
		}

		// Calculate date range
		const dateRange = calculateDateRange(
			this.processedData.entries,
			viewConfig.startDate,
			viewConfig.endDate
		);

		// Render options
		const renderOptions: RenderOptions = {
			colorScheme: viewConfig.colorScheme,
			weekStart: viewConfig.weekStart,
			showWeekdayLabels: viewConfig.showWeekdayLabels,
			showMonthLabels: viewConfig.showMonthLabels,
		};

		// Render heatmap
		const heatmapEl = renderHeatmap(this.processedData, dateRange, renderOptions);
		this.containerEl.appendChild(heatmapEl);

		// Set up interactions
		this.cleanupInteractions = setupInteractions({
			app: this.app,
			entries: this.processedData.entries,
			containerEl: heatmapEl,
			plugin: this.plugin,
		});
	}
}
