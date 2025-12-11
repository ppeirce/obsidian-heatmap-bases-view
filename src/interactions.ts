import { App, setTooltip } from 'obsidian';
import { HeatmapEntry } from './types';
import { formatDateDisplay, parseISODateString } from './dateUtils';

export interface InteractionHandlerOptions {
	app: App;
	entries: Map<string, HeatmapEntry>;
	containerEl: HTMLElement;
}

/**
 * Set up interaction handlers for the heatmap cells.
 */
export function setupInteractions(options: InteractionHandlerOptions): () => void {
	const { app, entries, containerEl } = options;

	// Track event listeners for cleanup
	const cleanupFns: (() => void)[] = [];

	// Handle cell clicks
	const clickHandler = (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const cell = target.closest('.heatmap-cell') as HTMLElement | null;

		if (!cell) return;

		const notePath = cell.dataset.notePath;
		if (notePath) {
			// Open the note
			app.workspace.openLinkText(notePath, '', false);
		}
	};

	containerEl.addEventListener('click', clickHandler);
	cleanupFns.push(() => containerEl.removeEventListener('click', clickHandler));

	// Handle hover for tooltips
	const mouseoverHandler = (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const cell = target.closest('.heatmap-cell') as HTMLElement | null;

		if (!cell) return;

		const dateStr = cell.dataset.date;
		if (!dateStr) return;

		const tooltipContent = buildTooltipContent(dateStr, entries.get(dateStr), cell);
		setTooltip(cell, tooltipContent, { placement: 'top' });
	};

	containerEl.addEventListener('mouseover', mouseoverHandler);
	cleanupFns.push(() => containerEl.removeEventListener('mouseover', mouseoverHandler));

	// Handle keyboard navigation
	const keydownHandler = (event: KeyboardEvent) => {
		const target = event.target as HTMLElement;
		const cell = target.closest('.heatmap-cell') as HTMLElement | null;

		if (!cell) return;

		const dateStr = cell.dataset.date;
		if (!dateStr) return;

		// Handle Enter key to open note
		if (event.key === 'Enter') {
			const notePath = cell.dataset.notePath;
			if (notePath) {
				app.workspace.openLinkText(notePath, '', false);
			}
		}

		// Handle arrow key navigation
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
			event.preventDefault();
			navigateToAdjacentCell(cell, event.key, containerEl);
		}
	};

	containerEl.addEventListener('keydown', keydownHandler);
	cleanupFns.push(() => containerEl.removeEventListener('keydown', keydownHandler));

	// Make cells focusable for keyboard navigation
	const cells = containerEl.querySelectorAll('.heatmap-cell');
	cells.forEach(cell => {
		(cell as HTMLElement).tabIndex = 0;
	});

	// Return cleanup function
	return () => {
		cleanupFns.forEach(fn => fn());
	};
}

/**
 * Build tooltip content for a cell.
 */
function buildTooltipContent(
	dateStr: string,
	entry: HeatmapEntry | undefined,
	cell: HTMLElement
): string {
	const formattedDate = formatDateDisplay(dateStr);

	if (!entry) {
		return `${formattedDate}\nNo note`;
	}

	const displayValue = cell.dataset.displayValue || entry.displayValue;
	const hexColor = cell.style.backgroundColor ? rgbToHex(cell.style.backgroundColor) : '';
	const colorInfo = hexColor ? `\n${hexColor}` : '';
	return `${formattedDate}\n${displayValue}${colorInfo}`;
}

/**
 * Convert RGB color string to hex.
 */
function rgbToHex(rgb: string): string {
	// Handle hex strings passed through
	if (rgb.startsWith('#')) {
		return rgb;
	}

	// Parse rgb(r, g, b) format
	const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (!match) {
		return rgb;
	}

	const r = parseInt(match[1], 10);
	const g = parseInt(match[2], 10);
	const b = parseInt(match[3], 10);

	const toHex = (n: number) => n.toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Navigate to an adjacent cell based on arrow key.
 */
function navigateToAdjacentCell(
	currentCell: HTMLElement,
	key: string,
	containerEl: HTMLElement
): void {
	const currentDate = currentCell.dataset.date;
	if (!currentDate) return;

	const date = parseISODateString(currentDate) ?? new Date(currentDate);
	if (isNaN(date.getTime())) return;
	let targetDate: Date;

	switch (key) {
		case 'ArrowUp':
			targetDate = new Date(date);
			targetDate.setDate(date.getDate() - 1);
			break;
		case 'ArrowDown':
			targetDate = new Date(date);
			targetDate.setDate(date.getDate() + 1);
			break;
		case 'ArrowLeft':
			targetDate = new Date(date);
			targetDate.setDate(date.getDate() - 7);
			break;
		case 'ArrowRight':
			targetDate = new Date(date);
			targetDate.setDate(date.getDate() + 7);
			break;
		default:
			return;
	}

	const targetDateStr = formatDateISO(targetDate);
	const targetCell = containerEl.querySelector(
		`.heatmap-cell[data-date="${targetDateStr}"]`
	) as HTMLElement | null;

	if (targetCell) {
		targetCell.focus();
	}
}

/**
 * Format date to ISO string (duplicated here to avoid circular imports).
 */
function formatDateISO(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
