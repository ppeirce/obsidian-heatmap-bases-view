import {
	TFile,
	BasesEntry,
	BasesPropertyId,
	Value,
	NumberValue,
	BooleanValue,
	StringValue,
	NullValue,
	DateValue,
} from 'obsidian';
import { HeatmapEntry, ProcessedData } from './types';
import { parseDateFromFilename, formatDateISO } from './dateUtils';

/**
 * Value types that can be visualized in the heatmap.
 */
export type ValueType = 'boolean' | 'number' | 'unsupported';

/**
 * Interface for accessing the internal value of PrimitiveValue.
 * This is a runtime property not exposed in the public type declarations.
 */
interface PrimitiveValueInternal<T> {
	value: T;
}

/**
 * Convert a property name to BasesPropertyId format.
 * Property IDs are formatted as "type.name"
 */
function toPropertyId(propertyName: string): BasesPropertyId {
	// If it already looks like a property ID, use it as-is
	if (propertyName.includes('.')) {
		return propertyName as BasesPropertyId;
	}
	// Default to frontmatter property
	return `frontmatter.${propertyName}` as BasesPropertyId;
}

/**
 * Extract a primitive value from an Obsidian Value object.
 */
function extractPrimitiveValue(value: Value | null): unknown {
	if (value === null || value instanceof NullValue) {
		return null;
	}

	// Access the internal value property for PrimitiveValue subclasses
	if (value instanceof NumberValue || value instanceof BooleanValue || value instanceof StringValue) {
		return (value as unknown as PrimitiveValueInternal<unknown>).value;
	}

	// For DateValue, convert to ISO string
	if (value instanceof DateValue) {
		return value.toString();
	}

	// Fallback to string representation
	return value.toString();
}

/**
 * Extract the date from a BasesEntry based on configuration.
 */
export function extractDate(
	entry: BasesEntry,
	dateProperty: string
): string | null {
	if (dateProperty === '__filename__' || !dateProperty) {
		// Parse from filename
		const parsed = parseDateFromFilename(entry.file.basename);
		return parsed ? formatDateISO(parsed) : null;
	}

	// Get from property
	const propId = toPropertyId(dateProperty);
	const value = entry.getValue(propId);

	if (value === null || value instanceof NullValue) {
		return null;
	}

	// Handle DateValue directly
	if (value instanceof DateValue) {
		const dateStr = value.toString();
		// DateValue.toString() should return ISO format
		const parsed = new Date(dateStr);
		return !isNaN(parsed.getTime()) ? formatDateISO(parsed) : null;
	}

	// Try to parse from string representation
	const strValue = value.toString();
	const parsed = new Date(strValue);
	return !isNaN(parsed.getTime()) ? formatDateISO(parsed) : null;
}

/**
 * Extract and normalize the value from a BasesEntry.
 */
export function extractValue(
	entry: BasesEntry,
	valueProperty: string
): { value: number | null; displayValue: string; type: ValueType } {
	const propId = toPropertyId(valueProperty);
	const obsidianValue = entry.getValue(propId);

	// Handle missing/null property
	if (obsidianValue === null || obsidianValue instanceof NullValue) {
		return { value: null, displayValue: `${valueProperty}: not set`, type: 'unsupported' };
	}

	// Handle BooleanValue
	if (obsidianValue instanceof BooleanValue) {
		const boolVal = (obsidianValue as unknown as PrimitiveValueInternal<boolean>).value;
		return {
			value: boolVal ? 1 : 0,
			displayValue: boolVal ? 'Yes' : 'No',
			type: 'boolean',
		};
	}

	// Handle NumberValue
	if (obsidianValue instanceof NumberValue) {
		const numVal = (obsidianValue as unknown as PrimitiveValueInternal<number>).value;
		return {
			value: numVal,
			displayValue: String(numVal),
			type: 'number',
		};
	}

	// Handle StringValue - try to parse as number or boolean
	if (obsidianValue instanceof StringValue) {
		const strVal = (obsidianValue as unknown as PrimitiveValueInternal<string>).value;

		// Try parsing as number
		const num = parseFloat(strVal);
		if (!isNaN(num)) {
			return {
				value: num,
				displayValue: strVal,
				type: 'number',
			};
		}

		// Try parsing as boolean strings
		const lower = strVal.toLowerCase();
		if (lower === 'true' || lower === 'yes') {
			return { value: 1, displayValue: 'Yes', type: 'boolean' };
		}
		if (lower === 'false' || lower === 'no') {
			return { value: 0, displayValue: 'No', type: 'boolean' };
		}

		// Unsupported string
		return {
			value: null,
			displayValue: strVal,
			type: 'unsupported',
		};
	}

	// Fallback - try to use isTruthy() for other Value types
	const isTruthy = obsidianValue.isTruthy();
	return {
		value: isTruthy ? 1 : 0,
		displayValue: obsidianValue.toString(),
		type: 'boolean',
	};
}

/**
 * Process BasesEntry results into heatmap data.
 */
export function processData(
	entries: BasesEntry[],
	dateProperty: string,
	valueProperty: string
): ProcessedData {
	const heatmapEntries = new Map<string, HeatmapEntry>();
	let min = Infinity;
	let max = -Infinity;
	let count = 0;
	let hasNumeric = false;

	for (const entry of entries) {
		const date = extractDate(entry, dateProperty);
		if (!date) {
			continue; // Skip entries without valid dates
		}

		const { value, displayValue, type } = extractValue(entry, valueProperty);

		// Track if we have numeric values (not just boolean)
		if (type === 'number' && value !== null && value !== 0 && value !== 1) {
			hasNumeric = true;
		}

		// Update stats for non-null, positive values
		if (value !== null && value > 0) {
			min = Math.min(min, value);
			max = Math.max(max, value);
			count++;
		}

		// If multiple entries have the same date, keep the one with higher value
		// or the first one if equal
		const existing = heatmapEntries.get(date);
		if (existing) {
			if (value !== null && (existing.value === null || value > existing.value)) {
				heatmapEntries.set(date, { date, value, note: entry.file, displayValue });
			}
		} else {
			heatmapEntries.set(date, { date, value, note: entry.file, displayValue });
		}
	}

	// Handle edge cases
	if (min === Infinity) min = 0;
	if (max === -Infinity) max = 1;
	if (min === max && min > 0) {
		// Single value case - set min to 0 for better intensity scaling
		min = 0;
	}

	return {
		entries: heatmapEntries,
		stats: {
			min,
			max,
			count,
			hasNumeric,
		},
	};
}

/**
 * Detect the value type for a property across all entries.
 */
export function detectValueType(
	entries: BasesEntry[],
	valueProperty: string,
	dateProperty: string
): ValueType {
	let seenBoolean = false;
	let seenNumber = false;
	let seenValidEntry = false;

	const propId = toPropertyId(valueProperty);

	for (const entry of entries) {
		// Only consider entries that have valid dates
		const date = extractDate(entry, dateProperty);
		if (!date) continue;

		const obsidianValue = entry.getValue(propId);
		if (obsidianValue === null || obsidianValue instanceof NullValue) continue;

		seenValidEntry = true;

		if (obsidianValue instanceof BooleanValue) {
			seenBoolean = true;
		} else if (obsidianValue instanceof NumberValue) {
			const numVal = (obsidianValue as unknown as PrimitiveValueInternal<number>).value;
			// Check if it's used as a boolean (0 or 1) or as a real number
			if (numVal !== 0 && numVal !== 1) {
				seenNumber = true;
			} else {
				seenBoolean = true;
			}
		} else if (obsidianValue instanceof StringValue) {
			const strVal = (obsidianValue as unknown as PrimitiveValueInternal<string>).value;
			const num = parseFloat(strVal);
			if (!isNaN(num)) {
				if (num !== 0 && num !== 1) {
					seenNumber = true;
				} else {
					seenBoolean = true;
				}
			} else {
				const lower = strVal.toLowerCase();
				if (['true', 'false', 'yes', 'no'].includes(lower)) {
					seenBoolean = true;
				} else {
					return 'unsupported';
				}
			}
		} else {
			// Other Value types - try to use as boolean via isTruthy
			seenBoolean = true;
		}
	}

	// If we didn't see any valid entries, treat as unsupported
	if (!seenValidEntry) {
		return 'unsupported';
	}

	if (seenNumber) return 'number';
	if (seenBoolean) return 'boolean';
	return 'unsupported';
}
