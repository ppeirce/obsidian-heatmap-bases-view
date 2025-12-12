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
	colorScheme: ColorScheme;  // "green" | "purple" | "blue" | etc.
	weekStart: 0 | 1;          // 0 = Sunday, 1 = Monday
	showWeekdayLabels: boolean;
	showMonthLabels: boolean;
	minValue: number | null;   // override min for intensity scale (null = auto)
	maxValue: number | null;   // override max for intensity scale (null = auto)
}

export type ColorScheme = 'green' | 'purple' | 'blue' | 'orange' | 'gray';

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
}

export const DEFAULT_SETTINGS: HeatmapPluginSettings = {
	showHexColorInTooltip: false,
};
