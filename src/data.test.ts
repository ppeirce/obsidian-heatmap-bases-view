import { describe, it, expect } from 'vitest';
import { extractDate, extractValue, processData, detectValueType } from './data';
import { NumberValue, BooleanValue, StringValue, DateValue, NullValue } from 'obsidian';

// Helper to create mock BasesEntry
interface MockFile {
	basename: string;
}

interface MockBasesEntry {
	file: MockFile;
	getValue: (propId: string) => unknown;
}

function createMockEntry(
	basename: string,
	properties: Record<string, unknown> = {}
): MockBasesEntry {
	return {
		file: { basename },
		getValue: (propId: string) => {
			// Extract property name from "frontmatter.propName" format
			const propName = propId.includes('.') ? propId.split('.')[1] : propId;
			return properties[propName] ?? null;
		},
	};
}

describe('data', () => {
	describe('extractDate', () => {
		it('extracts date from filename when dateProperty is __filename__', () => {
			const entry = createMockEntry('2024-01-15.md');
			const result = extractDate(entry as never, '__filename__');
			expect(result).toBe('2024-01-15');
		});

		it('extracts date from filename when dateProperty is empty', () => {
			const entry = createMockEntry('2024-01-15.md');
			const result = extractDate(entry as never, '');
			expect(result).toBe('2024-01-15');
		});

		it('returns null for non-date filename', () => {
			const entry = createMockEntry('my-note.md');
			const result = extractDate(entry as never, '__filename__');
			expect(result).toBeNull();
		});

		it('extracts date from DateValue property', () => {
			const entry = createMockEntry('note.md', {
				date: new DateValue('2024-03-20'),
			});
			const result = extractDate(entry as never, 'date');
			expect(result).toBe('2024-03-20');
		});

		it('extracts date from string property', () => {
			const entry = createMockEntry('note.md', {
				created: new StringValue('2024-06-15'),
			});
			const result = extractDate(entry as never, 'created');
			expect(result).toBe('2024-06-15');
		});

		it('returns null for null property', () => {
			const entry = createMockEntry('note.md', {
				date: new NullValue(),
			});
			const result = extractDate(entry as never, 'date');
			expect(result).toBeNull();
		});

		it('returns null for missing property', () => {
			const entry = createMockEntry('note.md', {});
			const result = extractDate(entry as never, 'nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('extractValue', () => {
		it('extracts NumberValue correctly', () => {
			const entry = createMockEntry('note.md', {
				count: new NumberValue(42),
			});
			const result = extractValue(entry as never, 'count');
			expect(result.value).toBe(42);
			expect(result.type).toBe('number');
		});

		it('extracts BooleanValue true correctly', () => {
			const entry = createMockEntry('note.md', {
				completed: new BooleanValue(true),
			});
			const result = extractValue(entry as never, 'completed');
			expect(result.value).toBe(1);
			expect(result.displayValue).toBe('Yes');
			expect(result.type).toBe('boolean');
		});

		it('extracts BooleanValue false correctly', () => {
			const entry = createMockEntry('note.md', {
				completed: new BooleanValue(false),
			});
			const result = extractValue(entry as never, 'completed');
			expect(result.value).toBe(0);
			expect(result.displayValue).toBe('No');
			expect(result.type).toBe('boolean');
		});

		it('parses numeric string as number', () => {
			const entry = createMockEntry('note.md', {
				score: new StringValue('3.14'),
			});
			const result = extractValue(entry as never, 'score');
			expect(result.value).toBe(3.14);
			expect(result.type).toBe('number');
		});

		it('parses "yes" string as boolean true', () => {
			const entry = createMockEntry('note.md', {
				active: new StringValue('yes'),
			});
			const result = extractValue(entry as never, 'active');
			expect(result.value).toBe(1);
			expect(result.type).toBe('boolean');
		});

		it('parses "no" string as boolean false', () => {
			const entry = createMockEntry('note.md', {
				active: new StringValue('no'),
			});
			const result = extractValue(entry as never, 'active');
			expect(result.value).toBe(0);
			expect(result.type).toBe('boolean');
		});

		it('returns unsupported for non-parseable strings', () => {
			const entry = createMockEntry('note.md', {
				text: new StringValue('hello world'),
			});
			const result = extractValue(entry as never, 'text');
			expect(result.value).toBeNull();
			expect(result.type).toBe('unsupported');
		});

		it('handles NullValue', () => {
			const entry = createMockEntry('note.md', {
				value: new NullValue(),
			});
			const result = extractValue(entry as never, 'value');
			expect(result.value).toBeNull();
			expect(result.type).toBe('unsupported');
		});

		it('handles missing property', () => {
			const entry = createMockEntry('note.md', {});
			const result = extractValue(entry as never, 'missing');
			expect(result.value).toBeNull();
			expect(result.type).toBe('unsupported');
		});
	});

	describe('processData', () => {
		it('processes entries into heatmap data', () => {
			const entries = [
				createMockEntry('2024-01-01.md', { value: new NumberValue(5) }),
				createMockEntry('2024-01-02.md', { value: new NumberValue(10) }),
				createMockEntry('2024-01-03.md', { value: new NumberValue(3) }),
			];

			const result = processData(entries as never[], '__filename__', 'value');

			expect(result.entries.size).toBe(3);
			expect(result.stats.min).toBe(3);
			expect(result.stats.max).toBe(10);
			expect(result.stats.count).toBe(3);
		});

		it('skips entries without valid dates', () => {
			const entries = [
				createMockEntry('2024-01-01.md', { value: new NumberValue(5) }),
				createMockEntry('not-a-date.md', { value: new NumberValue(10) }),
			];

			const result = processData(entries as never[], '__filename__', 'value');

			expect(result.entries.size).toBe(1);
			expect(result.stats.count).toBe(1);
		});

		it('handles duplicate dates by keeping higher value', () => {
			const entries = [
				createMockEntry('2024-01-01.md', { value: new NumberValue(5) }),
				createMockEntry('2024-01-01.md', { value: new NumberValue(10) }),
			];

			const result = processData(entries as never[], '__filename__', 'value');

			expect(result.entries.size).toBe(1);
			expect(result.entries.get('2024-01-01')?.value).toBe(10);
		});

		it('tracks hasNumeric correctly', () => {
			const boolEntries = [
				createMockEntry('2024-01-01.md', { done: new BooleanValue(true) }),
				createMockEntry('2024-01-02.md', { done: new BooleanValue(false) }),
			];
			const boolResult = processData(boolEntries as never[], '__filename__', 'done');
			expect(boolResult.stats.hasNumeric).toBe(false);

			const numEntries = [
				createMockEntry('2024-01-01.md', { count: new NumberValue(42) }),
			];
			const numResult = processData(numEntries as never[], '__filename__', 'count');
			expect(numResult.stats.hasNumeric).toBe(true);
		});

		it('handles empty entries', () => {
			const result = processData([], '__filename__', 'value');

			expect(result.entries.size).toBe(0);
			expect(result.stats.min).toBe(0);
			expect(result.stats.max).toBe(1);
			expect(result.stats.count).toBe(0);
		});

		it('handles single value correctly', () => {
			const entries = [
				createMockEntry('2024-01-01.md', { value: new NumberValue(5) }),
			];

			const result = processData(entries as never[], '__filename__', 'value');

			// Single value case: min should be set to 0 for intensity scaling
			expect(result.stats.min).toBe(0);
			expect(result.stats.max).toBe(5);
		});
	});

	describe('detectValueType', () => {
		it('detects boolean type', () => {
			const entries = [
				createMockEntry('2024-01-01.md', { done: new BooleanValue(true) }),
				createMockEntry('2024-01-02.md', { done: new BooleanValue(false) }),
			];

			const result = detectValueType(entries as never[], 'done', '__filename__');
			expect(result).toBe('boolean');
		});

		it('detects number type', () => {
			const entries = [
				createMockEntry('2024-01-01.md', { score: new NumberValue(42) }),
				createMockEntry('2024-01-02.md', { score: new NumberValue(100) }),
			];

			const result = detectValueType(entries as never[], 'score', '__filename__');
			expect(result).toBe('number');
		});

		it('treats 0/1 values as boolean', () => {
			const entries = [
				createMockEntry('2024-01-01.md', { flag: new NumberValue(0) }),
				createMockEntry('2024-01-02.md', { flag: new NumberValue(1) }),
			];

			const result = detectValueType(entries as never[], 'flag', '__filename__');
			expect(result).toBe('boolean');
		});

		it('returns unsupported for non-parseable strings', () => {
			const entries = [
				createMockEntry('2024-01-01.md', { text: new StringValue('hello') }),
			];

			const result = detectValueType(entries as never[], 'text', '__filename__');
			expect(result).toBe('unsupported');
		});

		it('returns unsupported when no valid entries', () => {
			const entries = [
				createMockEntry('not-a-date.md', { value: new NumberValue(5) }),
			];

			const result = detectValueType(entries as never[], 'value', '__filename__');
			expect(result).toBe('unsupported');
		});

		it('returns unsupported for empty entries', () => {
			const result = detectValueType([], 'value', '__filename__');
			expect(result).toBe('unsupported');
		});
	});
});
