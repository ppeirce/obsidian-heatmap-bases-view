# Layout Flexibility for Obsidian Heatmap Plugin

## Problem
The current GitHub-style heatmap (7 rows × N week columns, horizontal scroll) works well for yearly views but wastes space for shorter periods like weekly or monthly views.

## Solution
Add two configuration options:
1. **Layout Direction**: `horizontal` (current) or `vertical` (calendar-style, grows down)
2. **Cell Size Presets**: Small (11px), Medium (16px), Large (24px)

### Vertical Layout Behavior
- 7 columns (days: Mon-Sun or Sun-Sat) instead of 7 rows
- Weeks as rows, growing downward
- Month labels on left side (continuous flow, marking transitions)
- Weekday labels at top instead of left

## Files to Modify

### 1. `src/types.ts`
- Add `LayoutDirection = 'horizontal' | 'vertical'`
- Add `CellSizePreset = 'small' | 'medium' | 'large'`
- Add `CELL_SIZE_VALUES` constant mapping presets to pixels
- Add `VerticalMonthLabel` interface for row-based labels
- Extend `HeatmapViewConfig` with `layoutDirection` and `cellSize`

### 2. `src/dateUtils.ts`
- Add `generateVerticalMonthLabels()` function
  - Returns `VerticalMonthLabel[]` with `name`, `startRow`, `endRow`
  - Labels mark which weeks belong to which month

### 3. `src/renderer.ts`
- Extend `RenderOptions` with `layoutDirection` and `cellSize`
- Update `createCellElement()` to swap row/column for vertical layout:
  ```ts
  if (layoutDirection === 'vertical') {
    cell.style.gridRow = String(column);    // week → row
    cell.style.gridColumn = String(row);    // day → column
  }
  ```
- Add `createVerticalMonthLabelsColumn()` for left-side month labels
- Add `createWeekdayLabelsRow()` for top weekday labels
- Update `renderHeatmap()`:
  - Apply `--cell-size` CSS variable from preset
  - Add layout class: `heatmap--horizontal` or `heatmap--vertical`
  - Branch rendering logic for horizontal vs vertical structure

### 4. `styles.css`
- Add `.heatmap-cells--vertical` with inverted grid:
  ```css
  grid-template-columns: repeat(7, var(--cell-size));
  grid-auto-rows: var(--cell-size);
  grid-auto-flow: row;
  ```
- Add vertical scroll for `.heatmap--vertical .heatmap-scroll-wrapper`
- Add `.heatmap-month-labels-vertical` for row-spanning month labels
- Add `.heatmap-weekday-labels-horizontal` for top label row

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
- `src/renderer.test.ts`: Add tests for layout classes, cell positioning, CSS variables
- `src/interactions.test.ts`: Add tests for layout-aware keyboard navigation

### 9. `README.md`
- Document new Layout Direction setting
- Document new Cell Size setting

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
