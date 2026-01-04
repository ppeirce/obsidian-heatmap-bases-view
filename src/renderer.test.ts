import { describe, it, expect } from 'vitest';
import { renderHeatmap } from './renderer';
import type { HeatmapEntry, ProcessedData } from './types';
import { CELL_SIZE_VALUES } from './types';

const schemeDefinition = {
	light: { zero: '#000000', max: '#ffffff' },
	dark: { zero: '#000000', max: '#ffffff' },
};

function buildData(): ProcessedData {
	const entry: HeatmapEntry = {
		date: '2024-01-03',
		value: 5,
		note: {} as HeatmapEntry['note'],
		displayValue: '5 changes',
	};

	return {
		entries: new Map([[entry.date, entry]]),
		stats: {
			min: 0,
			max: 5,
			count: 1,
			hasNumeric: true,
		},
	};
}

describe('renderHeatmap', () => {
	it('applies layout class and cell size variable', () => {
		const heatmap = renderHeatmap(
			buildData(),
			{ start: new Date(2024, 0, 1), end: new Date(2024, 0, 3) },
			{
				schemeDefinition,
				weekStart: 1,
				showWeekdayLabels: false,
				showMonthLabels: false,
				layoutDirection: 'horizontal',
				cellSize: 'medium',
			}
		);

		expect(heatmap.classList.contains('heatmap--horizontal')).toBe(true);
		expect(heatmap.style.getPropertyValue('--cell-size'))
			.toBe(`${CELL_SIZE_VALUES.medium}px`);
	});

	it('adds role and aria-labels for accessibility', () => {
		const heatmap = renderHeatmap(
			buildData(),
			{ start: new Date(2024, 0, 1), end: new Date(2024, 0, 3) },
			{
				schemeDefinition,
				weekStart: 1,
				showWeekdayLabels: false,
				showMonthLabels: false,
				layoutDirection: 'horizontal',
				cellSize: 'small',
			}
		);

		const grid = heatmap.querySelector('.heatmap-cells');
		expect(grid?.getAttribute('role')).toBe('grid');

		const cell = heatmap.querySelector('.heatmap-cell[data-date="2024-01-03"]');
		expect(cell?.getAttribute('aria-label')).toContain('2024');
		expect(cell?.getAttribute('aria-label')).toContain('5 changes');
	});

	it('swaps row and column for vertical layout', () => {
		const horizontal = renderHeatmap(
			buildData(),
			{ start: new Date(2024, 0, 1), end: new Date(2024, 0, 3) },
			{
				schemeDefinition,
				weekStart: 1,
				showWeekdayLabels: false,
				showMonthLabels: false,
				layoutDirection: 'horizontal',
				cellSize: 'small',
			}
		);

		const vertical = renderHeatmap(
			buildData(),
			{ start: new Date(2024, 0, 1), end: new Date(2024, 0, 3) },
			{
				schemeDefinition,
				weekStart: 1,
				showWeekdayLabels: false,
				showMonthLabels: false,
				layoutDirection: 'vertical',
				cellSize: 'small',
			}
		);

		expect(vertical.classList.contains('heatmap--vertical')).toBe(true);

		const horizontalCell = horizontal.querySelector('.heatmap-cell[data-date="2024-01-03"]') as HTMLElement;
		const verticalCell = vertical.querySelector('.heatmap-cell[data-date="2024-01-03"]') as HTMLElement;

		expect(horizontalCell.style.gridRow).toBe('3');
		expect(horizontalCell.style.gridColumn).toBe('1');
		expect(verticalCell.style.gridRow).toBe('1');
		expect(verticalCell.style.gridColumn).toBe('3');
	});
});
