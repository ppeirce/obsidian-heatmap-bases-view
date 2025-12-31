import { TFile } from 'obsidian';

/**
 * Represents a single note's data for the heatmap.
 */
export interface HeatmapEntry {
	date: string;          // ISO date string "YYYY-MM-DD"
	value: number | null;  // null = note exists but property missing/false
	note: TFile;           // reference to the note
	displayValue: string;  // formatted value for tooltip
}

/**
 * Output of DataProcessor, input to HeatmapRenderer.
 */
export interface ProcessedData {
	entries: Map<string, HeatmapEntry>;
	stats: {
		min: number;
		max: number;
		count: number;
		hasNumeric: boolean;  // false if all boolean
	};
}

/**
 * Configuration for the heatmap view, stored in the Base file.
 */
export interface HeatmapViewConfig {
	dateProperty: string;      // property name or "__filename__"
	valueProperty: string;     // property name to visualize
	startDate: string | null;  // ISO date or null for auto
	endDate: string | null;    // ISO date or null for auto
	colorScheme: ColorScheme;  // scheme id from plugin settings
	weekStart: 0 | 1;          // 0 = Sunday, 1 = Monday
	showWeekdayLabels: boolean;
	showMonthLabels: boolean;
	minValue: number | null;   // override min for intensity scale (null = auto)
	maxValue: number | null;   // override max for intensity scale (null = auto)
}

// ColorScheme is now a string (scheme id) since schemes are user-configurable
export type ColorScheme = string;

/**
 * A user-configurable color scheme stored in plugin settings.
 */
export interface ColorSchemeItem {
	id: string;           // Unique identifier (e.g., 'green', 'my-custom')
	name: string;         // Display name (e.g., 'Green', 'My Custom')
	zeroColor: string;    // Hex color for zero/empty values
	maxColor: string;     // Hex color for max intensity
	isDefault?: boolean;  // True for built-in schemes
}

/**
 * Represents the visual state of a single cell.
 */
export type CellState =
	| { type: 'empty' }                           // no note for this date
	| { type: 'zero'; note: TFile }               // note exists, value is 0/false
	| { type: 'filled'; note: TFile; intensity: number }; // 0-1 intensity

/**
 * Date range for rendering.
 */
export interface DateRange {
	start: Date;
	end: Date;
}

/**
 * Cell data for rendering and interaction.
 */
export interface CellData {
	date: string;
	state: CellState;
	row: number;    // 1-7 for day of week
	column: number; // week number in range
}

/**
 * Month label position for rendering.
 */
export interface MonthLabel {
	name: string;
	startColumn: number;
	endColumn: number;
}

/**
 * Plugin-wide settings.
 */
export interface HeatmapPluginSettings {
	showHexColorInTooltip: boolean;
	colorSchemes: ColorSchemeItem[];
}

/**
 * Default color schemes that ship with the plugin.
 */
export const DEFAULT_COLOR_SCHEMES: ColorSchemeItem[] = [
	{ id: 'green', name: 'Green', zeroColor: '#ebedf0', maxColor: '#39d353', isDefault: true },
	{ id: 'purple', name: 'Purple', zeroColor: '#ebedf0', maxColor: '#a78bfa', isDefault: true },
	{ id: 'blue', name: 'Blue', zeroColor: '#ebedf0', maxColor: '#38bdf8', isDefault: true },
	{ id: 'orange', name: 'Orange', zeroColor: '#ebedf0', maxColor: '#fb923c', isDefault: true },
	{ id: 'gray', name: 'Gray', zeroColor: '#ebedf0', maxColor: '#adbac7', isDefault: true },
];

export const DEFAULT_SETTINGS: HeatmapPluginSettings = {
	showHexColorInTooltip: false,
	colorSchemes: DEFAULT_COLOR_SCHEMES,
};
