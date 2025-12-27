import {
	BasesEntry,
	BasesPropertyId,
	NumberValue,
	BooleanValue,
	StringValue,
	NullValue,
	DateValue,
} from 'obsidian';
import { HeatmapEntry, ProcessedData } from './types';
import { parseDateFromFilename, formatDateISO, parseISODateString } from './dateUtils';

/**
 * Value types that can be visualized in the heatmap.
 */
export type ValueType = 'boolean' | 'number' | 'unsupported';

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
 * Extract the date from a BasesEntry based on configuration.
 */
export function extractDate(
	entry: BasesEntry,
	dateProperty: string
): string | null {
	if (dateProperty === '__filename__' || !dateProperty) {
		// Parse from filename
		try {
			const parsed = parseDateFromFilename(entry.file.basename);
			if (!parsed) {
				console.warn(
					`Failed to parse date from filename: "${entry.file.basename}"`,
					{ file: entry.file.path }
				);
				return null;
			}
			return formatDateISO(parsed);
		} catch (error) {
			console.warn(
				`Error parsing date from filename: "${entry.file.basename}"`,
				{ file: entry.file.path, error: String(error) }
			);
			return null;
		}
	}

	// Get from property
	const propId = toPropertyId(dateProperty);
	const value = entry.getValue(propId);

	if (value === null || value instanceof NullValue) {
		return null;
	}

	try {
		// Handle DateValue directly
		if (value instanceof DateValue) {
			const dateStr = value.toString();
			// DateValue.toString() should return ISO format
			const parsed = parseISODateString(dateStr) ?? new Date(dateStr);
			if (isNaN(parsed.getTime())) {
				console.warn(
					`Invalid date in property "${dateProperty}": "${dateStr}"`,
					{ file: entry.file.path, property: dateProperty }
				);
				return null;
			}
			return formatDateISO(parsed);
		}

		// Try to parse from string representation
		const strValue = value.toString();
		const parsed = parseISODateString(strValue) ?? new Date(strValue);
		if (isNaN(parsed.getTime())) {
			console.warn(
				`Invalid date in property "${dateProperty}": "${strValue}"`,
				{ file: entry.file.path, property: dateProperty }
			);
			return null;
		}
		return formatDateISO(parsed);
	} catch (error) {
		console.warn(
			`Error parsing date from property "${dateProperty}"`,
			{ file: entry.file.path, property: dateProperty, error: String(error) }
		);
		return null;
	}
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
		const boolVal = obsidianValue.isTruthy();
		return {
			value: boolVal ? 1 : 0,
			displayValue: boolVal ? 'Yes' : 'No',
			type: 'boolean',
		};
	}

	// Handle NumberValue
	if (obsidianValue instanceof NumberValue) {
		const numVal = Number(obsidianValue.toString());
		if (isNaN(numVal)) {
			return {
				value: null,
				displayValue: obsidianValue.toString(),
				type: 'unsupported',
			};
		}
		return {
			value: numVal,
			displayValue: String(numVal),
			type: 'number',
		};
	}

	// Handle StringValue - try to parse as number or boolean
	if (obsidianValue instanceof StringValue) {
		const strVal = obsidianValue.toString();

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
	let skippedEntries = 0;

	for (const entry of entries) {
		const date = extractDate(entry, dateProperty);
		if (!date) {
			skippedEntries++;
			continue; // Skip entries without valid dates
		}

		const { value, displayValue, type } = extractValue(entry, valueProperty);

		// Track if we have numeric values (not just boolean)
		if (type === 'number' && value !== null && value !== 0 && value !== 1) {
			hasNumeric = true;
		}

		// Update stats for non-null values (including 0)
		if (value !== null) {
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

	// Log summary if entries were skipped
	if (skippedEntries > 0) {
		console.warn(
			`Data processing summary: ${skippedEntries} entries skipped due to invalid dates.`,
			{
				totalEntries: entries.length,
				skippedEntries,
				successfulEntries: heatmapEntries.size,
				dateProperty,
			}
		);
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
			const numVal = Number(obsidianValue.toString());
			if (isNaN(numVal)) {
				return 'unsupported';
			}
			// Check if it's used as a boolean (0 or 1) or as a real number
			if (numVal !== 0 && numVal !== 1) {
				seenNumber = true;
			} else {
				seenBoolean = true;
			}
		} else if (obsidianValue instanceof StringValue) {
			const strVal = obsidianValue.toString();
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
