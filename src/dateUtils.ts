import { DateRange, MonthLabel } from './types';

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse an ISO date string (YYYY-MM-DD) into a Date at local midnight.
 */
export function parseISODateString(dateStr: string): Date | null {
	const match = ISO_DATE_REGEX.exec(dateStr.trim());
	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);

	if (isNaN(year) || isNaN(month) || isNaN(day)) {
		return null;
	}

	const date = new Date(year, month, day);
	date.setHours(0, 0, 0, 0);
	return date;
}

/**
 * Patterns for parsing dates from daily note filenames.
 */
const DAILY_NOTE_PATTERNS = [
	/^(\d{4}-\d{2}-\d{2})/,           // 2025-01-15
	/^(\d{4})\/(\d{2})\/(\d{2})/,     // 2025/01/15
	/^(\w+ \d{1,2}, \d{4})/,          // January 15, 2025
];

/**
 * Parse a date from a filename (daily note pattern).
 */
export function parseDateFromFilename(filename: string): Date | null {
	// Remove extension if present
	const name = filename.replace(/\.md$/i, '');

	for (const pattern of DAILY_NOTE_PATTERNS) {
		const match = name.match(pattern);
		if (match) {
			// For the YYYY/MM/DD pattern, reconstruct as YYYY-MM-DD
			let dateStr: string;
			if (match.length === 4) {
				dateStr = `${match[1]}-${match[2]}-${match[3]}`;
			} else {
				dateStr = match[1];
			}

			// If we have a standard ISO string, parse manually to avoid timezone shifts
			const isoParsed = parseISODateString(dateStr);
			if (isoParsed) {
				return isoParsed;
			}

			const parsed = new Date(dateStr);
			if (!isNaN(parsed.getTime())) {
				parsed.setHours(0, 0, 0, 0);
				return parsed;
			}
		}
	}
	return null;
}

/**
 * Parse a date from a property value.
 */
export function parseDateFromProperty(value: unknown): Date | null {
	if (value === null || value === undefined) {
		return null;
	}

	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === 'string') {
		// Try ISO date format first
		const isoParsed = parseISODateString(value);
		if (isoParsed) {
			return isoParsed;
		}

		const parsed = new Date(value);
		if (!isNaN(parsed.getTime())) {
			parsed.setHours(0, 0, 0, 0);
			return parsed;
		}
	}

	if (typeof value === 'number') {
		// Unix timestamp (milliseconds)
		const parsed = new Date(value);
		if (!isNaN(parsed.getTime())) {
			return parsed;
		}
	}

	return null;
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD).
 */
export function formatDateISO(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Format a date string for display in tooltips.
 */
export function formatDateDisplay(dateStr: string): string {
	const date = parseISODateString(dateStr) ?? new Date(dateStr);
	if (isNaN(date.getTime())) {
		return dateStr;
	}
	return date.toLocaleDateString(undefined, {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

/**
 * Generate all dates in a range (inclusive).
 */
export function generateDateRange(start: Date, end: Date): string[] {
	const dates: string[] = [];
	const current = new Date(start);
	current.setHours(0, 0, 0, 0);

	const endNormalized = new Date(end);
	endNormalized.setHours(0, 0, 0, 0);

	while (current <= endNormalized) {
		dates.push(formatDateISO(current));
		current.setDate(current.getDate() + 1);
	}

	return dates;
}

/**
 * Get the day of week (0-6, where 0 is the week start day).
 */
export function getDayOfWeek(date: Date, weekStart: 0 | 1): number {
	const day = date.getDay(); // 0 = Sunday
	if (weekStart === 0) {
		return day;
	}
	// Monday start: Sunday becomes 6, Monday becomes 0
	return day === 0 ? 6 : day - 1;
}

/**
 * Get the week number within a date range.
 * Week 1 always contains the range start date.
 */
export function getWeekNumber(date: Date, rangeStart: Date, weekStart: 0 | 1): number {
	// Clone and normalize dates to midnight
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);

	const start = new Date(rangeStart);
	start.setHours(0, 0, 0, 0);

	// Calculate days since range start
	const diffMs = d.getTime() - start.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	// Get the day-of-week offset for the start date
	const startDayOfWeek = getDayOfWeek(start, weekStart);

	// Week number = (days since start + start's day offset) / 7 + 1
	// This ensures the start date is always in week 1, and subsequent
	// weeks advance when we cross a week boundary
	return Math.floor((diffDays + startDayOfWeek) / 7) + 1;
}

/**
 * Calculate the date range for the heatmap.
 * If dates are provided, use them. Otherwise, auto-detect from data
 * or default to current year.
 */
export function calculateDateRange(
	entries: Map<string, unknown>,
	startDate: string | null,
	endDate: string | null
): DateRange {
	let start: Date;
	let end: Date;

	// Determine end date
	if (endDate) {
		end = parseISODateString(endDate) ?? new Date(endDate);
		if (isNaN(end.getTime())) {
			end = new Date();
		}
	} else {
		end = new Date();
	}
	end.setHours(0, 0, 0, 0);

	// Determine start date
	if (startDate) {
		start = parseISODateString(startDate) ?? new Date(startDate);
		if (isNaN(start.getTime())) {
			start = new Date(end.getFullYear(), 0, 1);
		}
	} else {
		// Auto-detect from data or default to start of current year
		const dates = Array.from(entries.keys())
			.map(d => parseISODateString(d) ?? new Date(d))
			.filter(d => !isNaN(d.getTime()))
			.sort((a, b) => a.getTime() - b.getTime());

		if (dates.length > 0) {
			start = dates[0];
		} else {
			start = new Date(end.getFullYear(), 0, 1);
		}
	}
	start.setHours(0, 0, 0, 0);

	return { start, end };
}

/**
 * Generate month labels for the heatmap header.
 * Each label spans the weeks where that month has days.
 */
export function generateMonthLabels(
	rangeStart: Date,
	rangeEnd: Date,
	weekStart: 0 | 1
): MonthLabel[] {
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	// Track which weeks belong to which month
	// A week belongs to a month if it has any days from that month
	const weekToMonths = new Map<number, Set<number>>(); // week -> set of months

	const current = new Date(rangeStart);
	current.setHours(0, 0, 0, 0);

	const end = new Date(rangeEnd);
	end.setHours(0, 0, 0, 0);

	// First pass: collect which months appear in each week
	while (current <= end) {
		const month = current.getMonth();
		const week = getWeekNumber(current, rangeStart, weekStart);

		let monthSet = weekToMonths.get(week);
		if (!monthSet) {
			monthSet = new Set();
			weekToMonths.set(week, monthSet);
		}
		monthSet.add(month);

		current.setDate(current.getDate() + 1);
	}

	// Second pass: for each month, find its start and end weeks
	// A month's label starts at the first week where it's the "primary" month
	// (has the most days, or is the later month in case of tie at month boundary)
	const labels: MonthLabel[] = [];
	const totalWeeks = getWeekNumber(end, rangeStart, weekStart);

	let currentMonth = -1;
	let currentLabel: MonthLabel | null = null;

	for (let week = 1; week <= totalWeeks; week++) {
		const monthsInWeek = weekToMonths.get(week);
		if (!monthsInWeek) continue;

		// Determine the "primary" month for this week
		// Use the month that appears (preferring later month at boundaries)
		const monthsArray = Array.from(monthsInWeek).sort((a, b) => a - b);

		// For label purposes, use the last month in the week
		// This makes labels appear at the start of each month
		const primaryMonth = monthsArray[monthsArray.length - 1];

		if (primaryMonth !== currentMonth) {
			// Start a new month label
			if (currentLabel) {
				currentLabel.endColumn = week; // Previous month ends at this week
			}

			currentLabel = {
				name: monthNames[primaryMonth],
				startColumn: week,
				endColumn: totalWeeks + 1, // Will be updated
			};
			labels.push(currentLabel);
			currentMonth = primaryMonth;
		}
	}

	// Close the last label
	if (currentLabel) {
		currentLabel.endColumn = totalWeeks + 1;
	}

	return labels;
}

/**
 * Get weekday labels based on week start setting.
 */
export function getWeekdayLabels(weekStart: 0 | 1): string[] {
	const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	if (weekStart === 1) {
		return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	}
	return labels;
}
