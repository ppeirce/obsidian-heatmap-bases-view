# Layout Flexibility for Obsidian Heatmap Plugin

## Problem
The current GitHub-style heatmap (7 rows × N week columns, horizontal scroll) works well for yearly views but wastes space for shorter periods like weekly or monthly views.

## Solution (v1)
Add two configuration options:
1. **Layout Direction**: `horizontal` (current) or `vertical` (calendar-style, grows down)
2. **Cell Size Presets**: Small (11px), Medium (16px), Large (24px)

Plus quality improvements:
- ARIA accessibility attributes
- Sticky axis labels when scrolling
- CSS containment for performance
- DocumentFragment for efficient DOM updates

---

## v1 Scope

### Vertical Layout Behavior
- 7 columns (days: Mon-Sun or Sun-Sat) instead of 7 rows
- Weeks as rows, growing downward
- Month labels on left side (continuous flow, marking transitions)
- Weekday labels at top instead of left

### Accessibility (ARIA)
- Add `role="grid"` on grid container
- Add `aria-label` on each cell with date and value

### Sticky Labels
- Month/weekday labels stay visible when scrolling
- Background + z-index to prevent overlap with cells
- Reserve space so labels don't cover cell content

### Performance
- Build cells into `DocumentFragment`, append once (reduces reflow)
- CSS `content-visibility: auto` and `contain: layout paint size` on cells

---

## Files to Modify

### 1. `src/types.ts`
- Add `LayoutDirection = 'horizontal' | 'vertical'`
- Add `CellSizePreset = 'small' | 'medium' | 'large'`
- Add `CELL_SIZE_VALUES` constant: `{ small: 11, medium: 16, large: 24 }`
- Add `VerticalMonthLabel` interface: `{ name, startRow, endRow }`
- Extend `HeatmapViewConfig` with `layoutDirection` and `cellSize`

### 2. `src/dateUtils.ts`
- Add `generateVerticalMonthLabels(rangeStart, rangeEnd, weekStart)`:
  - Returns `VerticalMonthLabel[]` with row spans for each month
  - Continuous flow: labels mark week transitions between months

### 3. `src/renderer.ts`
- Extend `RenderOptions` with `layoutDirection` and `cellSize`
- Update `createCellElement()`:
  - Swap row/column for vertical: `gridRow = weekNum`, `gridColumn = dayOfWeek`
  - Add `aria-label` with date and display value
- Add `createVerticalMonthLabelsColumn()` for left-side month labels
- Add `createWeekdayLabelsRow()` for top weekday labels (vertical layout)
- Update `renderHeatmap()`:
  - Use `DocumentFragment` for cell creation
  - Apply `--cell-size` CSS variable from preset
  - Add layout class: `heatmap--horizontal` or `heatmap--vertical`
  - Add `role="grid"` to grid container
  - Branch DOM structure for horizontal vs vertical

### 4. `styles.css`
**Vertical layout grid:**
```css
.heatmap-cells--vertical {
  grid-template-columns: repeat(7, var(--cell-size));
  grid-auto-rows: var(--cell-size);
  grid-auto-flow: row;
}

.heatmap--vertical .heatmap-scroll-wrapper {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: 60vh;
}
```

**Sticky labels:**
```css
.heatmap-month-labels,
.heatmap-weekday-labels {
  position: sticky;
  background: var(--background-primary);
  z-index: 1;
}

.heatmap-month-labels { top: 0; }
.heatmap-weekday-labels { left: 0; }
```

**Performance containment:**
```css
.heatmap-cells {
  content-visibility: auto;
  contain: layout paint size;
}
```

**Vertical month labels column:**
```css
.heatmap-month-labels-vertical {
  display: grid;
  grid-template-rows: repeat(var(--total-weeks), calc(var(--cell-size) + var(--cell-gap)));
}

.heatmap-weekday-labels-horizontal {
  display: grid;
  grid-template-columns: repeat(7, var(--cell-size));
  gap: var(--cell-gap);
}
```

### 5. `src/main.ts`
Add two new view options (after `showMonthLabels`):
```ts
{
  type: 'dropdown',
  key: 'layoutDirection',
  displayName: 'Layout direction',
  default: 'horizontal',
  options: {
    'horizontal': 'Horizontal (GitHub-style)',
    'vertical': 'Vertical (calendar-style)',
  },
},
{
  type: 'dropdown',
  key: 'cellSize',
  displayName: 'Cell size',
  default: 'small',
  options: {
    'small': 'Small (11px)',
    'medium': 'Medium (16px)',
    'large': 'Large (24px)',
  },
},
```

### 6. `src/HeatmapView.ts`
- Update `getConfig()` to read `layoutDirection` and `cellSize`
- Pass new options to `renderHeatmap()`

### 7. `src/interactions.ts`
- Update keyboard navigation to respect layout direction:
  - Horizontal: Up/Down = ±1 day, Left/Right = ±7 days
  - Vertical: Up/Down = ±7 days (rows), Left/Right = ±1 day (columns)

### 8. Tests
- `src/dateUtils.test.ts`: Add tests for `generateVerticalMonthLabels()`
- `src/renderer.test.ts`: Add tests for:
  - Layout classes (`heatmap--horizontal`, `heatmap--vertical`)
  - Cell positioning (row/column swap)
  - CSS variables (`--cell-size`)
  - ARIA attributes (`role`, `aria-label`)
- `src/interactions.test.ts`: Add tests for layout-aware keyboard navigation

### 9. `README.md`
- Document new Layout Direction setting
- Document new Cell Size setting
- Update screenshots if applicable

---

## Implementation Order
1. Types (`types.ts`)
2. Date utilities (`dateUtils.ts`)
3. CSS (`styles.css`)
4. Renderer (`renderer.ts`)
5. View config (`HeatmapView.ts`)
6. Options registration (`main.ts`)
7. Keyboard navigation (`interactions.ts`)
8. Tests
9. README

---

## Visual Comparison

**Horizontal (current):**
```
       Jan   Feb   Mar   Apr   ...
Mon    □□□□  □□□□  □□□□  □□□□
Tue    □□□□  □□□□  □□□□  □□□□
Wed    □□□□  □□□□  □□□□  □□□□
...
Sun    □□□□  □□□□  □□□□  □□□□
        → scrolls right →
```

**Vertical (new):**
```
       Mon  Tue  Wed  Thu  Fri  Sat  Sun
Jan    □    □    □    □    □    □    □
       □    □    □    □    □    □    □
       □    □    □    □    □    □    □
       □    □    □    □    □    □    □
Feb    □    □    □    □    □    □    □
       □    □    □    □    □    □    □
       ...
               ↓ scrolls down ↓
```

---

## Future Enhancements (v2+)

### Auto Layout Option
- Add `'auto'` as third layout direction
- Estimate grid dimensions for both orientations
- Choose orientation that minimizes scrolling
- Add ~15% hysteresis to prevent flip-flopping on resize

### Enhanced Keyboard Navigation
- Home/End: Jump to start/end of week
- PageUp/PageDown: Jump to previous/next month
- O(1) cell lookup via `cellIndexByDate` map

### Layout Engine Refactor
- Extract to dedicated `src/layout.ts` module
- Centralize row/column mapping logic
- Cache layout results for reuse in interactions

### Performance for Large Datasets
- Chunk cell insertion with `requestAnimationFrame` for >2000 cells
- Virtual scrolling for multi-decade ranges
