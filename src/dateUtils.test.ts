import { describe, it, expect } from 'vitest';
import {
	parseISODateString,
	parseDateFromFilename,
	parseDateFromProperty,
	formatDateISO,
	formatDateDisplay,
	generateDateRange,
	getDayOfWeek,
	getWeekNumber,
	calculateDateRange,
	generateMonthLabels,
	generateVerticalMonthLabels,
	getWeekdayLabels,
} from './dateUtils';

describe('dateUtils', () => {
	describe('parseISODateString', () => {
		it('parses valid ISO date string', () => {
			const result = parseISODateString('2024-01-15');
			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2024);
			expect(result?.getMonth()).toBe(0); // January
			expect(result?.getDate()).toBe(15);
		});

		it('returns null for invalid format', () => {
			expect(parseISODateString('invalid')).toBeNull();
			expect(parseISODateString('01-15-2024')).toBeNull();
			expect(parseISODateString('2024/01/15')).toBeNull();
		});

		it('trims whitespace', () => {
			const result = parseISODateString('  2024-01-15  ');
			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(15);
		});

		it('handles leap year dates', () => {
			const leapDay = parseISODateString('2024-02-29');
			expect(leapDay).not.toBeNull();
			expect(leapDay?.getDate()).toBe(29);
		});

		it('handles year boundaries', () => {
			const dec31 = parseISODateString('2024-12-31');
			expect(dec31?.getMonth()).toBe(11);
			expect(dec31?.getDate()).toBe(31);

			const jan1 = parseISODateString('2025-01-01');
			expect(jan1?.getMonth()).toBe(0);
			expect(jan1?.getDate()).toBe(1);
		});
	});

	describe('parseDateFromFilename', () => {
		it('parses YYYY-MM-DD format', () => {
			const result = parseDateFromFilename('2024-01-15.md');
			expect(result).not.toBeNull();
			expect(formatDateISO(result!)).toBe('2024-01-15');
		});

		it('parses filename without extension', () => {
			const result = parseDateFromFilename('2024-01-15');
			expect(result).not.toBeNull();
			expect(formatDateISO(result!)).toBe('2024-01-15');
		});

		it('parses YYYY/MM/DD format', () => {
			const result = parseDateFromFilename('2024/01/15.md');
			expect(result).not.toBeNull();
			expect(formatDateISO(result!)).toBe('2024-01-15');
		});

		it('returns null for non-date filenames', () => {
			expect(parseDateFromFilename('notes.md')).toBeNull();
			expect(parseDateFromFilename('my-document.md')).toBeNull();
		});

		it('handles case-insensitive extension', () => {
			const result = parseDateFromFilename('2024-01-15.MD');
			expect(result).not.toBeNull();
		});
	});

	describe('parseDateFromProperty', () => {
		it('returns null for null/undefined', () => {
			expect(parseDateFromProperty(null)).toBeNull();
			expect(parseDateFromProperty(undefined)).toBeNull();
		});

		it('handles Date objects', () => {
			const date = new Date(2024, 0, 15);
			const result = parseDateFromProperty(date);
			expect(result).toEqual(date);
		});

		it('returns null for invalid Date objects', () => {
			const invalid = new Date('invalid');
			expect(parseDateFromProperty(invalid)).toBeNull();
		});

		it('parses ISO date strings', () => {
			const result = parseDateFromProperty('2024-01-15');
			expect(result).not.toBeNull();
			expect(formatDateISO(result!)).toBe('2024-01-15');
		});

		it('parses Unix timestamps', () => {
			const timestamp = new Date(2024, 0, 15).getTime();
			const result = parseDateFromProperty(timestamp);
			expect(result).not.toBeNull();
		});

		it('returns null for unparseable values', () => {
			expect(parseDateFromProperty('not a date')).toBeNull();
			expect(parseDateFromProperty({})).toBeNull();
		});
	});

	describe('formatDateISO', () => {
		it('formats date to YYYY-MM-DD', () => {
			const date = new Date(2024, 0, 15); // January 15, 2024
			expect(formatDateISO(date)).toBe('2024-01-15');
		});

		it('pads single-digit months and days', () => {
			const date = new Date(2024, 0, 5); // January 5, 2024
			expect(formatDateISO(date)).toBe('2024-01-05');
		});

		it('handles December correctly', () => {
			const date = new Date(2024, 11, 25);
			expect(formatDateISO(date)).toBe('2024-12-25');
		});
	});

	describe('formatDateDisplay', () => {
		it('formats date for display', () => {
			const result = formatDateDisplay('2024-01-15');
			// Should contain year, month, day info
			expect(result).toContain('2024');
			expect(result).toContain('15');
		});

		it('returns original string for invalid dates', () => {
			const result = formatDateDisplay('not-a-date');
			expect(result).toBe('not-a-date');
		});
	});

	describe('generateDateRange', () => {
		it('generates inclusive date range', () => {
			const start = new Date(2024, 0, 1);
			const end = new Date(2024, 0, 3);
			const range = generateDateRange(start, end);

			expect(range).toHaveLength(3);
			expect(range).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
		});

		it('handles single day range', () => {
			const date = new Date(2024, 0, 1);
			const range = generateDateRange(date, date);

			expect(range).toHaveLength(1);
			expect(range).toEqual(['2024-01-01']);
		});

		it('spans across months', () => {
			const start = new Date(2024, 0, 30);
			const end = new Date(2024, 1, 2);
			const range = generateDateRange(start, end);

			expect(range).toHaveLength(4);
			expect(range).toContain('2024-01-30');
			expect(range).toContain('2024-02-01');
		});

		it('spans across years', () => {
			const start = new Date(2023, 11, 30);
			const end = new Date(2024, 0, 2);
			const range = generateDateRange(start, end);

			expect(range).toHaveLength(4);
			expect(range).toContain('2023-12-31');
			expect(range).toContain('2024-01-01');
		});
	});

	describe('getDayOfWeek', () => {
		it('returns correct day for Sunday start', () => {
			const sunday = new Date(2024, 0, 7); // Jan 7, 2024 is Sunday
			expect(getDayOfWeek(sunday, 0)).toBe(0);

			const monday = new Date(2024, 0, 8);
			expect(getDayOfWeek(monday, 0)).toBe(1);

			const saturday = new Date(2024, 0, 6);
			expect(getDayOfWeek(saturday, 0)).toBe(6);
		});

		it('returns correct day for Monday start', () => {
			const monday = new Date(2024, 0, 8); // Jan 8, 2024 is Monday
			expect(getDayOfWeek(monday, 1)).toBe(0);

			const sunday = new Date(2024, 0, 7);
			expect(getDayOfWeek(sunday, 1)).toBe(6);

			const tuesday = new Date(2024, 0, 9);
			expect(getDayOfWeek(tuesday, 1)).toBe(1);
		});
	});

	describe('getWeekNumber', () => {
		it('returns week 1 for the range start date', () => {
			const start = new Date(2024, 0, 1);
			expect(getWeekNumber(start, start, 0)).toBe(1);
		});

		it('increments week at week boundary (Sunday start)', () => {
			const start = new Date(2024, 0, 1); // Monday
			const nextSunday = new Date(2024, 0, 7); // Sunday

			// Week should increment after crossing to the next week
			expect(getWeekNumber(nextSunday, start, 0)).toBeGreaterThan(1);
		});

		it('increments week at week boundary (Monday start)', () => {
			const start = new Date(2024, 0, 1); // Monday
			const nextMonday = new Date(2024, 0, 8); // Next Monday

			expect(getWeekNumber(nextMonday, start, 1)).toBe(2);
		});
	});

	describe('calculateDateRange', () => {
		it('uses provided start and end dates', () => {
			const entries = new Map<string, unknown>();
			const result = calculateDateRange(entries, '2024-01-01', '2024-12-31');

			expect(formatDateISO(result.start)).toBe('2024-01-01');
			expect(formatDateISO(result.end)).toBe('2024-12-31');
		});

		it('auto-detects start from data when not provided', () => {
			const entries = new Map<string, unknown>([
				['2024-03-15', 1],
				['2024-06-20', 2],
			]);
			const result = calculateDateRange(entries, null, '2024-12-31');

			expect(formatDateISO(result.start)).toBe('2024-03-15');
		});

		it('defaults to current year start when no data', () => {
			const entries = new Map<string, unknown>();
			const result = calculateDateRange(entries, null, null);

			expect(result.start.getMonth()).toBe(0);
			expect(result.start.getDate()).toBe(1);
		});
	});

	describe('generateMonthLabels', () => {
		it('generates labels for a full year', () => {
			const start = new Date(2024, 0, 1);
			const end = new Date(2024, 11, 31);
			const labels = generateMonthLabels(start, end, 0);

			expect(labels.length).toBe(12);
			expect(labels[0].name).toBe('Jan');
			expect(labels[11].name).toBe('Dec');
		});

		it('generates labels for partial year', () => {
			const start = new Date(2024, 5, 1); // June
			const end = new Date(2024, 8, 30); // September
			const labels = generateMonthLabels(start, end, 0);

			expect(labels.length).toBe(4);
			expect(labels[0].name).toBe('Jun');
			expect(labels[3].name).toBe('Sep');
		});

		it('includes startColumn and endColumn', () => {
			const start = new Date(2024, 0, 1);
			const end = new Date(2024, 1, 29);
			const labels = generateMonthLabels(start, end, 0);

			labels.forEach(label => {
				expect(label.startColumn).toBeDefined();
				expect(label.endColumn).toBeDefined();
				expect(label.endColumn).toBeGreaterThanOrEqual(label.startColumn);
			});
		});
	});

	describe('generateVerticalMonthLabels', () => {
		it('generates labels for a full year', () => {
			const start = new Date(2024, 0, 1);
			const end = new Date(2024, 11, 31);
			const labels = generateVerticalMonthLabels(start, end, 0);

			expect(labels.length).toBe(12);
			expect(labels[0].name).toBe('Jan');
			expect(labels[11].name).toBe('Dec');
		});

		it('generates labels for partial year', () => {
			const start = new Date(2024, 5, 1); // June
			const end = new Date(2024, 8, 30); // September
			const labels = generateVerticalMonthLabels(start, end, 0);

			expect(labels.length).toBe(4);
			expect(labels[0].name).toBe('Jun');
			expect(labels[3].name).toBe('Sep');
		});

		it('includes startRow and endRow', () => {
			const start = new Date(2024, 0, 1);
			const end = new Date(2024, 1, 29);
			const labels = generateVerticalMonthLabels(start, end, 0);

			labels.forEach(label => {
				expect(label.startRow).toBeDefined();
				expect(label.endRow).toBeDefined();
				expect(label.endRow).toBeGreaterThanOrEqual(label.startRow);
			});
		});
	});

	describe('getWeekdayLabels', () => {
		it('returns Sunday-first labels when weekStart is 0', () => {
			const labels = getWeekdayLabels(0);
			expect(labels[0]).toBe('Sun');
			expect(labels[6]).toBe('Sat');
		});

		it('returns Monday-first labels when weekStart is 1', () => {
			const labels = getWeekdayLabels(1);
			expect(labels[0]).toBe('Mon');
			expect(labels[6]).toBe('Sun');
		});

		it('returns 7 labels', () => {
			expect(getWeekdayLabels(0)).toHaveLength(7);
			expect(getWeekdayLabels(1)).toHaveLength(7);
		});
	});
});
