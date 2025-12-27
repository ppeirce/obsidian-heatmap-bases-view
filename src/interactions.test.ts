import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupInteractions } from './interactions';
import type { HeatmapEntry } from './types';
import type HeatmapPlugin from './main';

// Mock the obsidian module
vi.mock('obsidian', () => ({
	setTooltip: vi.fn(),
}));

import { setTooltip } from 'obsidian';

describe('interactions', () => {
	let containerEl: HTMLElement;
	let mockApp: any;
	let mockPlugin: any;
	let entries: Map<string, HeatmapEntry>;

	beforeEach(() => {
		// Create a clean container for each test
		containerEl = document.createElement('div');
		containerEl.className = 'heatmap-container';
		document.body.appendChild(containerEl);

		// Create mock Obsidian app
		mockApp = {
			workspace: {
				openLinkText: vi.fn(),
			},
		};

		// Create mock plugin
		mockPlugin = {
			settings: {
				showHexColorInTooltip: true,
			},
		};

		// Initialize entries map
		entries = new Map();
		entries.set('2024-01-15', {
			date: '2024-01-15',
			value: 5,
			notePath: 'notes/2024-01-15.md',
			displayValue: '5 changes',
		});

		vi.clearAllMocks();
	});

	afterEach(() => {
		// Cleanup DOM
		if (containerEl.parentNode) {
			containerEl.parentNode.removeChild(containerEl);
		}
	});

	describe('setupInteractions', () => {
		it('returns a cleanup function', () => {
			const cleanup = setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			expect(typeof cleanup).toBe('function');
		});

		it('sets up click event listener', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.notePath = 'notes/2024-01-15.md';
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			// Simulate click
			cell.click();

			expect(mockApp.workspace.openLinkText).toHaveBeenCalledWith('notes/2024-01-15.md', '', false);
		});

		it('handles click on non-cell elements', () => {
			const nonCell = document.createElement('div');
			containerEl.appendChild(nonCell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			// Click on non-cell should not throw
			nonCell.click();
			expect(mockApp.workspace.openLinkText).not.toHaveBeenCalled();
		});

		it('handles click on cell without notePath', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			// No notePath set
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			cell.click();
			expect(mockApp.workspace.openLinkText).not.toHaveBeenCalled();
		});

		it('sets up hover/mouseover event listener for tooltips', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			cell.style.backgroundColor = 'rgb(57, 211, 83)';
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			// Simulate mouseover
			const event = new MouseEvent('mouseover', { bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			expect(setTooltip).toHaveBeenCalled();
		});

		it('sets up keyboard event listener for Enter key', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			cell.dataset.notePath = 'notes/2024-01-15.md';
			cell.tabIndex = 0;
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			// Focus and dispatch Enter key
			cell.focus();
			const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			expect(mockApp.workspace.openLinkText).toHaveBeenCalledWith('notes/2024-01-15.md', '', false);
		});

		it('sets up keyboard event listener for arrow keys', () => {
			// Create a 2x2 grid of cells
			const cells = [];
			const dates = ['2024-01-15', '2024-01-16', '2024-01-22', '2024-01-23'];
			dates.forEach(date => {
				const cell = document.createElement('div');
				cell.className = 'heatmap-cell';
				cell.dataset.date = date;
				cell.tabIndex = 0;
				containerEl.appendChild(cell);
				cells.push(cell);
			});

			const cleanup = setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			// Test arrow down (next day)
			cells[0].focus();
			const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
			Object.defineProperty(downEvent, 'target', { value: cells[0] });
			const downEventWithPrevented = downEvent;
			downEventWithPrevented.preventDefault = vi.fn();
			containerEl.dispatchEvent(downEventWithPrevented);

			cleanup();
		});

		it('removes event listeners on cleanup', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.notePath = 'notes/2024-01-15.md';
			containerEl.appendChild(cell);

			const cleanup = setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			// Click should work before cleanup
			cell.click();
			expect(mockApp.workspace.openLinkText).toHaveBeenCalled();

			// Reset mock
			vi.clearAllMocks();

			// Call cleanup
			cleanup();

			// Click should not trigger handler after cleanup
			cell.click();
			expect(mockApp.workspace.openLinkText).not.toHaveBeenCalled();
		});

		it('makes all heatmap cells focusable', () => {
			const cell1 = document.createElement('div');
			cell1.className = 'heatmap-cell';
			cell1.dataset.date = '2024-01-15';

			const cell2 = document.createElement('div');
			cell2.className = 'heatmap-cell';
			cell2.dataset.date = '2024-01-16';

			containerEl.appendChild(cell1);
			containerEl.appendChild(cell2);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			// Both cells should be focusable
			expect(cell1.tabIndex).toBe(0);
			expect(cell2.tabIndex).toBe(0);
		});
	});

	describe('click interaction', () => {
		it('opens note when cell with notePath is clicked', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.notePath = 'path/to/note.md';
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			const clickEvent = new MouseEvent('click', { bubbles: true });
			Object.defineProperty(clickEvent, 'target', { value: cell });
			containerEl.dispatchEvent(clickEvent);

			expect(mockApp.workspace.openLinkText).toHaveBeenCalledWith('path/to/note.md', '', false);
		});

		it('handles click event on nested elements within cell', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.notePath = 'notes/2024-01-15.md';

			const nestedElement = document.createElement('span');
			cell.appendChild(nestedElement);
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			// Click on nested element should bubble to cell
			const clickEvent = new MouseEvent('click', { bubbles: true });
			Object.defineProperty(clickEvent, 'target', { value: nestedElement });
			containerEl.dispatchEvent(clickEvent);

			expect(mockApp.workspace.openLinkText).toHaveBeenCalledWith('notes/2024-01-15.md', '', false);
		});
	});

	describe('tooltip interaction', () => {
		it('shows tooltip on mouseover with date and value', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			cell.style.backgroundColor = 'rgb(57, 211, 83)';
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			const event = new MouseEvent('mouseover', { bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			expect(setTooltip).toHaveBeenCalledWith(
				cell,
				expect.stringContaining('Jan 15'),
				{ placement: 'top' }
			);
		});

		it('shows tooltip with display value from entry', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			const event = new MouseEvent('mouseover', { bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			expect(setTooltip).toHaveBeenCalledWith(
				cell,
				expect.stringContaining('5 changes'),
				{ placement: 'top' }
			);
		});

		it('shows tooltip with hex color when setting enabled', () => {
			mockPlugin.settings.showHexColorInTooltip = true;

			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			cell.style.backgroundColor = 'rgb(57, 211, 83)';
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			const event = new MouseEvent('mouseover', { bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			// Should include hex color in tooltip
			const callArgs = (setTooltip as any).mock.calls[0];
			expect(callArgs[1]).toContain('#39d353');
		});

		it('shows tooltip without hex color when setting disabled', () => {
			mockPlugin.settings.showHexColorInTooltip = false;

			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			cell.style.backgroundColor = 'rgb(57, 211, 83)';
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			const event = new MouseEvent('mouseover', { bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			// Should not include hex color
			const callArgs = (setTooltip as any).mock.calls[0];
			expect(callArgs[1]).not.toContain('#');
		});

		it('handles mouseover on cell with no entry', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-12-25'; // Date not in entries
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			const event = new MouseEvent('mouseover', { bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			expect(setTooltip).toHaveBeenCalledWith(
				cell,
				expect.stringContaining('No note'),
				{ placement: 'top' }
			);
		});
	});

	describe('keyboard navigation', () => {
		it('opens note on Enter key', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			cell.dataset.notePath = 'notes/2024-01-15.md';
			cell.tabIndex = 0;
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			cell.focus();
			const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			expect(mockApp.workspace.openLinkText).toHaveBeenCalledWith('notes/2024-01-15.md', '', false);
		});

		it('handles Enter key on cell without notePath', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			// No notePath
			cell.tabIndex = 0;
			containerEl.appendChild(cell);

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			cell.focus();
			const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
			Object.defineProperty(event, 'target', { value: cell });
			containerEl.dispatchEvent(event);

			expect(mockApp.workspace.openLinkText).not.toHaveBeenCalled();
		});

		it('handles arrow keys (basic test - DOM navigation is complex)', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			cell.tabIndex = 0;
			containerEl.appendChild(cell);

			const mockPreventDefault = vi.fn();

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			cell.focus();
			const event = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				bubbles: true,
			});
			Object.defineProperty(event, 'target', { value: cell });
			Object.defineProperty(event, 'preventDefault', {
				value: mockPreventDefault,
			});
			containerEl.dispatchEvent(event);

			// preventDefault should be called
			expect(mockPreventDefault).toHaveBeenCalled();
		});

		it('ignores non-arrow keys', () => {
			const cell = document.createElement('div');
			cell.className = 'heatmap-cell';
			cell.dataset.date = '2024-01-15';
			cell.tabIndex = 0;
			containerEl.appendChild(cell);

			const mockPreventDefault = vi.fn();

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			cell.focus();
			const event = new KeyboardEvent('keydown', {
				key: 'a',
				bubbles: true,
			});
			Object.defineProperty(event, 'target', { value: cell });
			Object.defineProperty(event, 'preventDefault', {
				value: mockPreventDefault,
			});
			containerEl.dispatchEvent(event);

			// preventDefault should not be called for non-arrow key
			expect(mockPreventDefault).not.toHaveBeenCalled();
		});
	});

	describe('accessibility', () => {
		it('all cells can receive keyboard focus', () => {
			const cells = [];
			for (let i = 0; i < 3; i++) {
				const cell = document.createElement('div');
				cell.className = 'heatmap-cell';
				cell.dataset.date = `2024-01-${15 + i}`;
				containerEl.appendChild(cell);
				cells.push(cell);
			}

			setupInteractions({
				app: mockApp,
				entries,
				containerEl,
				plugin: mockPlugin,
			});

			cells.forEach(cell => {
				expect(cell.tabIndex).toBe(0);
				// Should be focusable
				cell.focus();
				expect(document.activeElement).toBe(cell);
			});
		});
	});
});
