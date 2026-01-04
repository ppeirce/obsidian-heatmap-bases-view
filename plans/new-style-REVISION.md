# Layout Flexibility for Obsidian Heatmap Plugin (Revised)

## Problem
The current GitHub-style heatmap (7 rows x N week columns, horizontal scroll) works well for yearly views but wastes space for shorter periods like weekly or monthly views.

## Solution
Add two configuration options:
1. **Layout direction**: `horizontal` (current), `vertical` (calendar-style, grows down), or `auto` (choose best fit)
2. **Cell size presets**: Small (11px), Medium (16px), Large (24px)

### Vertical layout behavior
- 7 columns (days: Mon-Sun or Sun-Sat) instead of 7 rows
- Weeks as rows, growing downward
- Month labels on left side (continuous flow, marking transitions)
- Weekday labels at top instead of left

### Auto layout behavior
- Estimate grid width/height for both orientations using date range, weekStart, and cell size.
- Choose the orientation that minimizes scrolling in the dominant axis of the container.
- Add a small hysteresis (for example 15 percent) to prevent flip-flopping during minor resizes.

## Files to modify

### 1. `src/types.ts`
- Add `LayoutDirection = 'horizontal' | 'vertical' | 'auto'`
- Add `CellSizePreset = 'small' | 'medium' | 'large'`
- Add `CELL_SIZE_VALUES` constant mapping presets to pixels
- Add `VerticalMonthLabel` interface for row-based labels
- Extend `HeatmapViewConfig` with `layoutDirection` and `cellSize`

### 2. `src/layout.ts` (new)
- Add `buildHeatmapLayout(...)` that returns cell positions, label positions, and grid dimensions for both orientations.
- Centralize row/column mapping for horizontal/vertical/auto to avoid duplicating layout math.
- Expose a `cellIndexByDate` map to make keyboard navigation O(1).

### 3. `src/dateUtils.ts`
- Keep low-level date helpers (range generation, week/day math).
- Move orientation-specific label generation into `layout.ts`.

### 4. `src/renderer.ts`
- Extend `RenderOptions` with `layoutDirection` and `cellSize`
- Update `createCellElement()` to swap row/column for vertical layout:
  ```ts
  if (layoutDirection === 'vertical') {
    cell.style.gridRow = String(column);    // week -> row
    cell.style.gridColumn = String(row);    // day -> column
  }
  ```
- Add `createVerticalMonthLabelsColumn()` for left-side month labels
- Add `createWeekdayLabelsRow()` for top weekday labels
- Use `buildHeatmapLayout(...)` output to drive cell positions and labels
- Add `role="grid"` on the grid container and `aria-label` on each cell (date + value)

### 5. `styles.css`
- Add `.heatmap-cells--vertical` with inverted grid:
  ```css
  grid-template-columns: repeat(7, var(--cell-size));
  grid-auto-rows: var(--cell-size);
  grid-auto-flow: row;
  ```
- Add vertical scroll for `.heatmap--vertical .heatmap-scroll-wrapper`
- Add `.heatmap-month-labels-vertical` for row-spanning month labels
- Add `.heatmap-weekday-labels-horizontal` for top label row
- Make axis labels sticky inside the scroll wrapper (with background and z-index)
- Reserve space for sticky axes so labels do not overlap cells
- Add `content-visibility: auto` and `contain: layout paint size` to `.heatmap-cells`

### 6. `src/main.ts`
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
    'auto': 'Auto (fit to range)',
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

### 7. `src/HeatmapView.ts`
- Update `getConfig()` to read `layoutDirection` and `cellSize`
- Pass new options to `renderHeatmap()`
- Pass container sizing hints to `buildHeatmapLayout(...)` for auto selection

### 8. `src/interactions.ts`
- Update keyboard navigation to respect layout direction:
  - Horizontal: Up/Down = plus or minus 1 day, Left/Right = plus or minus 7 days
  - Vertical: Up/Down = plus or minus 7 days (rows), Left/Right = plus or minus 1 day (columns)
- Add jump keys:
  - Home/End = start/end of week (respect weekStart)
  - PageUp/PageDown = previous/next month
- Use `cellIndexByDate` from layout for O(1) navigation

### 9. Tests
- `src/layout.test.ts`: Add tests for `buildHeatmapLayout()` in both orientations plus auto
- `src/renderer.test.ts`: Add tests for layout classes, cell positioning, CSS variables, aria labels
- `src/interactions.test.ts`: Add tests for layout-aware navigation plus Home/End/PageUp/PageDown

### 10. `README.md`
- Document new layout direction setting (including auto)
- Document new cell size setting
- Document new keyboard shortcuts

## Performance considerations
- Build cells into a `DocumentFragment` and append once to reduce reflow.
- Cache layout results per dateRange/weekStart/layoutDirection for reuse in interactions.
- If rendering over a threshold (for example 2000 cells), chunk insertion with `requestAnimationFrame`.

## Implementation order
1. Types (`types.ts`)
2. Layout engine (`layout.ts`)
3. Date utilities (`dateUtils.ts`)
4. CSS (`styles.css`)
5. Renderer (`renderer.ts`)
6. View config (`HeatmapView.ts`)
7. Options registration (`main.ts`)
8. Keyboard navigation (`interactions.ts`)
9. Tests
10. README

## Visual comparison

**Horizontal (current):**
```
       Jan   Feb   Mar   Apr   ...
Mon    ####  ####  ####  ####
Tue    ####  ####  ####  ####
Wed    ####  ####  ####  ####
...
Sun    ####  ####  ####  ####
        -> scrolls right ->
```

**Vertical (new):**
```
       Mon  Tue  Wed  Thu  Fri  Sat  Sun
Jan    ##   ##   ##   ##   ##   ##   ##
       ##   ##   ##   ##   ##   ##   ##
       ##   ##   ##   ##   ##   ##   ##
       ##   ##   ##   ##   ##   ##   ##
Feb    ##   ##   ##   ##   ##   ##   ##
       ##   ##   ##   ##   ##   ##   ##
       ...
               v scrolls down v
```
