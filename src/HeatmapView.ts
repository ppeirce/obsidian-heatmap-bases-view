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

declare global {
	interface Window {
		HEATMAP_DEBUG?: boolean;
	}
}

type HeatmapQueryController = QueryController & {
	runQuery?: () => void;
	notifyView?: (viewType: string, event: string) => void;
};

function debugLog(...args: unknown[]): void {
	if (typeof window === 'undefined' || !window.HEATMAP_DEBUG) {
		return;
	}
	// eslint-disable-next-line no-console
	console.log('[HeatmapView]', ...args);
}

/**
 * Heatmap view implementation for Obsidian Bases.
 */
export class HeatmapView extends BasesView {
	type = 'heatmap';

	private containerEl: HTMLElement;
	private isViewVisible = false;

	onload(): void {
		super.onload();
		debugLog('HeatmapView onload');
		this.isViewVisible = true;
		if (!this.processedData) {
			this.requestInitialQuery();
		}
	}

	onunload(): void {
		super.onunload();
		debugLog('HeatmapView onunload');
		this.isViewVisible = false;
	}
	private controllerRef: HeatmapQueryController;
	private cleanupInteractions: (() => void) | null = null;
	private processedData: ProcessedData | null = null;
	private initialQueryRequested = false;

	constructor(
		controller: QueryController,
		containerEl: HTMLElement
	) {
		super(controller);
		this.controllerRef = controller as HeatmapQueryController;
		this.containerEl = containerEl;
		debugLog('Constructed HeatmapView');
		if (window.HEATMAP_DEBUG) {
			try {
				const proto = Object.getPrototypeOf(controller) ?? {};
				debugLog('QueryController prototype methods', Object.getOwnPropertyNames(proto));
			} catch (err) {
				debugLog('Failed to inspect controller prototype', err);
			}
		}

		this.requestInitialQuery();
	}

	/**
	 * Get the current view configuration with defaults.
	 */
	private getConfig(): HeatmapViewConfig {
		const config = this.config;

		return {
			dateProperty: (config.get('dateProperty') as string) || '__filename__',
			valueProperty: (config.get('valueProperty') as string) || '',
			startDate: (config.get('startDate') as string) || null,
			endDate: (config.get('endDate') as string) || null,
			colorScheme: (config.get('colorScheme') as ColorScheme) || 'green',
			weekStart: parseInt(config.get('weekStart') as string || '0', 10) as 0 | 1,
			showWeekdayLabels: config.get('showWeekdayLabels') !== false,
			showMonthLabels: config.get('showMonthLabels') !== false,
		};
	}

	/**
	 * Called when query data changes.
	 */
	onDataUpdated(): void {
		debugLog('onDataUpdated called', {
			entryCount: this.data?.data?.length ?? 0,
		});
		if (!this.initialQueryRequested) {
			this.requestInitialQuery();
		}
		this.render();
	}

	/**
	 * Render the heatmap view.
	 */
	private render(): void {
		debugLog('render start');
		// Clean up previous interactions
		if (this.cleanupInteractions) {
			this.cleanupInteractions();
			this.cleanupInteractions = null;
		}

		// Clear container
		this.containerEl.empty();
		this.containerEl.addClass('heatmap-view');

		const viewConfig = this.getConfig();

		// Check for required configuration
		if (!viewConfig.valueProperty) {
			debugLog('render aborted: missing valueProperty');
			const emptyState = createEmptyState(
				'Configure value property',
				'Select a property to visualize in the view settings.'
			);
			this.containerEl.appendChild(emptyState);
			return;
		}

		// Get entries from query data
		const queryData = this.data;
		const entries: BasesEntry[] = queryData?.data || [];

		if (entries.length === 0) {
			if (this.requestInitialQuery()) {
				debugLog('render waiting for query results');
				const emptyState = createEmptyState(
					'Loading data…',
					'Fetching notes for this Base.'
				);
				this.containerEl.appendChild(emptyState);
				return;
			}

			debugLog('render aborted: no entries from query');
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
			debugLog('render aborted: unsupported property type');
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

		// Check if we have any valid dated entries
		if (this.processedData.entries.size === 0) {
			debugLog('render aborted: no dated entries after processing');
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

		debugLog('render proceeding', {
			entryCount: this.processedData.entries.size,
			stats: this.processedData.stats,
			viewConfig,
		});

		// Render heatmap
		const heatmapEl = renderHeatmap(this.processedData, dateRange, renderOptions);
		this.containerEl.appendChild(heatmapEl);

		// Set up interactions
		this.cleanupInteractions = setupInteractions({
			app: this.app,
			entries: this.processedData.entries,
			containerEl: heatmapEl,
		});
	}

	/**
	 * Ensure the Bases query has been executed when this view is active.
	 * Returns true if a query was requested during this call.
	 */
	private requestInitialQuery(): boolean {
		if (this.initialQueryRequested || !this.isViewVisible) {
			return false;
		}

		this.initialQueryRequested = true;
		try {
			if (typeof this.controllerRef.runQuery === 'function') {
				this.controllerRef.runQuery();
				debugLog('Requested initial Bases query via runQuery()');
			} else if (typeof this.controllerRef.notifyView === 'function') {
				this.controllerRef.notifyView(this.type, 'request-query');
				debugLog('Requested initial Bases query via notifyView()');
			} else {
				debugLog('No supported method to request Bases query');
				this.initialQueryRequested = false;
				return false;
			}
		} catch (err) {
			this.initialQueryRequested = false;
			debugLog('Failed to run initial query', err);
		}
		return true;
	}
}
