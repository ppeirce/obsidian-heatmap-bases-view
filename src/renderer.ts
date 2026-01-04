import {
	HeatmapEntry,
	ProcessedData,
	CellState,
	MonthLabel,
	DateRange,
	LayoutDirection,
	CellSizePreset,
	CELL_SIZE_VALUES,
	VerticalMonthLabel,
} from './types';
import {
	generateDateRange,
	getDayOfWeek,
	getWeekNumber,
	generateMonthLabels,
	generateVerticalMonthLabels,
	getWeekdayLabels,
	parseISODateString,
	formatDateDisplay,
} from './dateUtils';
import {
	calculateIntensityNumeric,
	calculateIntensityBoolean,
	getColorForIntensity,
	isDarkMode,
	ColorSchemeDefinition,
} from './colorUtils';

export interface RenderOptions {
	schemeDefinition: ColorSchemeDefinition;
	weekStart: 0 | 1;
	showWeekdayLabels: boolean;
	showMonthLabels: boolean;
	layoutDirection: LayoutDirection;
	cellSize: CellSizePreset;
}

/**
 * Build the cell state for a given date.
 */
function getCellState(
	date: string,
	entries: Map<string, HeatmapEntry>,
	stats: ProcessedData['stats']
): CellState {
	const entry = entries.get(date);

	if (!entry) {
		return { type: 'empty' };
	}

	if (entry.value === null) {
		return { type: 'zero', note: entry.note };
	}

	// Calculate intensity - 0 is now part of the gradient
	let intensity: number;
	if (stats.hasNumeric) {
		intensity = calculateIntensityNumeric(entry.value, stats.min, stats.max);
	} else {
		// Boolean mode
		intensity = calculateIntensityBoolean(entry.value > 0);
	}

	return { type: 'filled', note: entry.note, intensity };
}

/**
 * Create a cell element for the heatmap grid.
 */
function createCellElement(
	date: string,
	state: CellState,
	row: number,
	column: number,
	entry: HeatmapEntry | undefined,
	schemeDefinition: ColorSchemeDefinition
): HTMLElement {
	const cell = document.createElement('div');
	cell.className = 'heatmap-cell';
	cell.dataset.date = date;
	cell.style.gridRow = String(row);
	cell.style.gridColumn = String(column);

	const dark = isDarkMode();

	if (state.type === 'empty') {
		cell.classList.add('heatmap-cell--empty');
	} else if (state.type === 'zero') {
		// Note exists but value is null - style like empty but still clickable
		cell.classList.add('heatmap-cell--zero');
		cell.dataset.notePath = state.note.path;
		// No backgroundColor set - uses CSS default (same as empty)
	} else if (state.type === 'filled') {
		cell.classList.add('heatmap-cell--filled');
		cell.dataset.notePath = state.note.path;
		cell.dataset.intensity = String(state.intensity);
		cell.style.backgroundColor = getColorForIntensity(state.intensity, schemeDefinition, dark);
	}

	// Store display value for tooltip
	if (entry) {
		cell.dataset.displayValue = entry.displayValue;
	}

	const formattedDate = formatDateDisplay(date);
	const displayValue = entry ? entry.displayValue : 'No note';
	cell.setAttribute('aria-label', `${formattedDate}: ${displayValue}`);

	return cell;
}

/**
 * Create the month labels row.
 * Uses CSS grid to align labels with the cells below.
 */
function createMonthLabelsRow(
	monthLabels: MonthLabel[],
	totalWeeks: number
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'heatmap-month-labels heatmap-month-labels-horizontal';

	// Set the number of columns to match the cells grid
	row.style.setProperty('--total-weeks', String(totalWeeks));

	for (const label of monthLabels) {
		const span = document.createElement('span');
		span.className = 'heatmap-month-label';
		span.textContent = label.name;
		span.style.gridColumnStart = String(label.startColumn);
		span.style.gridColumnEnd = String(label.endColumn);
		row.appendChild(span);
	}

	return row;
}

/**
 * Create the weekday labels column for horizontal layout.
 */
function createWeekdayLabels(weekStart: 0 | 1): HTMLElement {
	const container = document.createElement('div');
	container.className = 'heatmap-weekday-labels';

	const labels = getWeekdayLabels(weekStart);

	// Only show Mon, Wed, Fri (or corresponding for Sunday start)
	const indices = weekStart === 1 ? [0, 2, 4] : [1, 3, 5];

	for (let i = 0; i < 7; i++) {
		const span = document.createElement('span');
		span.className = 'heatmap-weekday-label';
		if (indices.includes(i)) {
			span.textContent = labels[i];
		}
		container.appendChild(span);
	}

	return container;
}

/**
 * Create the month labels column for vertical layout.
 */
function createVerticalMonthLabelsColumn(
	monthLabels: VerticalMonthLabel[],
	totalWeeks: number
): HTMLElement {
	const column = document.createElement('div');
	column.className = 'heatmap-month-labels heatmap-month-labels-vertical';
	column.style.setProperty('--total-weeks', String(totalWeeks));

	for (const label of monthLabels) {
		const span = document.createElement('span');
		span.className = 'heatmap-month-label';
		span.textContent = label.name;
		span.style.gridRowStart = String(label.startRow);
		span.style.gridRowEnd = String(label.endRow);
		column.appendChild(span);
	}

	return column;
}

/**
 * Create the weekday labels row for vertical layout.
 */
function createWeekdayLabelsRow(weekStart: 0 | 1): HTMLElement {
	const container = document.createElement('div');
	container.className = 'heatmap-weekday-labels-horizontal';

	const labels = getWeekdayLabels(weekStart);
	for (const label of labels) {
		const span = document.createElement('span');
		span.className = 'heatmap-weekday-label';
		span.textContent = label;
		container.appendChild(span);
	}

	return container;
}

/**
 * Create an empty state message.
 */
export function createEmptyState(message: string, description: string): HTMLElement {
	const container = document.createElement('div');
	container.className = 'heatmap-empty-state';

	const icon = document.createElement('div');
	icon.className = 'heatmap-empty-state-icon';
	icon.textContent = '\u26A0'; // Warning symbol
	container.appendChild(icon);

	const title = document.createElement('div');
	title.className = 'heatmap-empty-state-title';
	title.textContent = message;
	container.appendChild(title);

	const desc = document.createElement('div');
	desc.className = 'heatmap-empty-state-description';
	desc.textContent = description;
	container.appendChild(desc);

	return container;
}

/**
 * Render the complete heatmap DOM structure.
 */
export function renderHeatmap(
	data: ProcessedData,
	dateRange: DateRange,
	options: RenderOptions
): HTMLElement {
	const { entries, stats } = data;
	const {
		schemeDefinition,
		weekStart,
		showWeekdayLabels,
		showMonthLabels,
		layoutDirection,
		cellSize,
	} = options;

	// Generate all dates in range
	const allDates = generateDateRange(dateRange.start, dateRange.end);

	// Calculate total number of weeks for grid sizing
	const totalWeeks = getWeekNumber(dateRange.end, dateRange.start, weekStart);

	// Create main container
	const container = document.createElement('div');
	container.className = 'heatmap-container';
	container.classList.add(
		layoutDirection === 'vertical' ? 'heatmap--vertical' : 'heatmap--horizontal'
	);
	container.style.setProperty('--cell-size', `${CELL_SIZE_VALUES[cellSize]}px`);

	// Apply theme class
	if (isDarkMode()) {
		container.classList.add('heatmap--dark');
	} else {
		container.classList.add('heatmap--light');
	}

	// Create scroll wrapper
	const scrollWrapper = document.createElement('div');
	scrollWrapper.className = 'heatmap-scroll-wrapper';
	if (layoutDirection === 'vertical') {
		scrollWrapper.classList.add('heatmap-scroll-wrapper--vertical');
	}

	// Create inner wrapper that holds month labels and grid together
	const innerWrapper = document.createElement('div');
	innerWrapper.className = 'heatmap-inner-wrapper';
	if (showWeekdayLabels && layoutDirection === 'horizontal') {
		innerWrapper.classList.add('heatmap-inner-wrapper--with-labels');
	}

	// Create grid container
	const grid = document.createElement('div');
	grid.className = 'heatmap-grid';

	// Create cells container
	const cellsContainer = document.createElement('div');
	cellsContainer.className = 'heatmap-cells';
	cellsContainer.classList.add(
		layoutDirection === 'vertical' ? 'heatmap-cells--vertical' : 'heatmap-cells--horizontal'
	);
	cellsContainer.setAttribute('role', 'grid');

	// Create cells for each date
	const cellFragment = document.createDocumentFragment();
	for (const dateStr of allDates) {
		const date = parseISODateString(dateStr) ?? new Date(dateStr);
		if (isNaN(date.getTime())) {
			continue;
		}
		const dayOfWeek = getDayOfWeek(date, weekStart);
		const weekNum = getWeekNumber(date, dateRange.start, weekStart);

		const state = getCellState(dateStr, entries, stats);
		const entry = entries.get(dateStr);
		const row = layoutDirection === 'vertical' ? weekNum : dayOfWeek + 1;
		const column = layoutDirection === 'vertical' ? dayOfWeek + 1 : weekNum;

		const cell = createCellElement(
			dateStr,
			state,
			row,
			column,
			entry,
			schemeDefinition
		);

		cellFragment.appendChild(cell);
	}
	cellsContainer.appendChild(cellFragment);

	if (layoutDirection === 'vertical') {
		grid.classList.add('heatmap-grid--vertical');
		if (showWeekdayLabels) {
			const weekdayRow = createWeekdayLabelsRow(weekStart);
			if (showMonthLabels) {
				weekdayRow.classList.add('heatmap-weekday-labels-horizontal--with-months');
			}
			grid.appendChild(weekdayRow);
		}
		const gridBody = document.createElement('div');
		gridBody.className = 'heatmap-grid-body';

		if (showMonthLabels) {
			const monthLabels = generateVerticalMonthLabels(dateRange.start, dateRange.end, weekStart);
			gridBody.appendChild(createVerticalMonthLabelsColumn(monthLabels, totalWeeks));
		}

		gridBody.appendChild(cellsContainer);
		grid.appendChild(gridBody);
		innerWrapper.appendChild(grid);
	} else {
		if (showMonthLabels) {
			const monthLabels = generateMonthLabels(dateRange.start, dateRange.end, weekStart);
			innerWrapper.appendChild(createMonthLabelsRow(monthLabels, totalWeeks));
		}
		if (showWeekdayLabels) {
			grid.appendChild(createWeekdayLabels(weekStart));
		}
		grid.appendChild(cellsContainer);
		innerWrapper.appendChild(grid);
	}

	scrollWrapper.appendChild(innerWrapper);
	container.appendChild(scrollWrapper);

	return container;
}
