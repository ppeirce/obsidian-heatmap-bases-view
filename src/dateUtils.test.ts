import { describe, it, expect } from 'vitest';
import { parseISODateString, formatDateISO, generateDateRange } from './dateUtils';

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
	});
});
