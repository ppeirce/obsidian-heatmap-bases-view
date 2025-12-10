# Obsidian Heatmap Bases View Plugin

A custom Bases view plugin that displays a GitHub-contributions-style heatmap for visualizing daily note properties over time.

## Overview

The plugin registers a new view type ("Heatmap") for Obsidian Bases. Users can filter their base to daily notes, select a boolean or numeric property, and see a calendar heatmap visualization of that property across a configurable date range.

## Requirements

- Obsidian 1.10+ (Bases API)
- Notes with a date property (or daily notes with dates parseable from filename)
- Boolean or numeric properties to visualize

## Core Features

### Property visualization
- Boolean properties: binary on/off display
- Numeric properties: gradient intensity based on min/max of visible data
- Single property per view (users create multiple views for multiple habits)

### Date handling
- Configurable date property (or parse from filename for daily notes)
- Custom date range selection (start date, end date)
- Assumes one note per date (no aggregation)

### Visual states
Each cell has one of three states:
- No note exists for date: hollow/outline style
- Note exists, value is false/0: filled but dim
- Note exists, value is true/positive: filled with intensity color

### Layout
- Horizontal scrolling grid (GitHub-style)
- Weeks as columns, days as rows
- Month labels along top
- Optional weekday labels on left

### Interactions
- Hover: tooltip with date, value, note title
- Click: open corresponding note
- Right-click: context menu (open in new tab, etc.)

## Configuration Options

These appear in the Bases view configuration panel:

| Option | Type | Description |
|--------|------|-------------|
| dateProperty | property selector | Which property contains the date (or "filename" for daily notes) |
| valueProperty | property selector | Which boolean/number property to visualize |
| startDate | date | Start of date range |
| endDate | date | End of date range |
| colorScheme | dropdown | Color palette (green, purple, blue, etc.) |
| weekStart | dropdown | Sunday or Monday |

## Technical Design

### Plugin registration

```typescript
export default class HeatmapPlugin extends Plugin {
  onload() {
    this.registerBasesLayout({
      name: 'Heatmap',
      icon: 'grid-3x3',
      factory: (controller, containerEl) => {
        return new HeatmapView(this.app, controller, containerEl);
      },
      options: () => [
        // config options defined here
      ],
    });
  }
}
```

### HeatmapView class

Extends BasesView and implements:
- `onload()`: subscribe to controller.data, initial render
- `onDataChange()`: re-render when query results update
- `onConfigChange()`: re-render when view options change
- `onunload()`: cleanup

### Data processing

1. Receive query results from controller (array of notes matching base filters)
2. Extract date and value from each note based on configured properties
3. Build a Map<dateString, { value, note }> for O(1) lookup
4. Compute min/max for numeric properties
5. Generate date range array from startDate to endDate
6. Render grid, looking up each date in the map

### Rendering

DOM-based rendering (not Canvas) for simplicity and accessibility:
- Container div with horizontal overflow-x: auto
- CSS Grid for the heatmap cells
- Each cell is a div with data attributes for date/value
- Event delegation for hover/click handlers

### Theming

Use Obsidian CSS custom properties for automatic light/dark support:
- `--interactive-accent` for primary color
- `--background-secondary` for empty cells
- `--background-modifier-border` for cell borders
- `--text-muted` for labels

Color schemes implemented as CSS classes that override the accent color with a custom gradient.

## File Structure

```
obsidian-heatmap-view/
├── src/
│   ├── main.ts           # plugin entry, registration
│   ├── HeatmapView.ts    # BasesView implementation
│   ├── heatmap.ts        # grid rendering logic
│   ├── dateUtils.ts      # date parsing, range generation
│   └── types.ts          # shared types
├── styles.css            # heatmap styles
├── manifest.json
├── package.json
├── tsconfig.json
└── esbuild.config.mjs
```

## Implementation Plan

### Phase 1: Minimal viable view
- Plugin scaffolding from obsidian-sample-plugin
- Register heatmap view with hardcoded options
- Render basic grid from query results
- Click to open note

### Phase 2: Configuration
- Implement all config options via options() API
- Date range picker
- Property selectors
- Color scheme dropdown

### Phase 3: Polish
- Hover tooltips
- Empty vs zero/false visual distinction
- Smooth scrolling and scroll position memory
- Keyboard navigation

### Phase 4: Release prep
- Test with popular themes
- Write documentation
- Submit to community plugins

## Open Questions

- Should we support formula properties (computed values)?
- Date range presets ("This year", "Last 6 months", "Last 30 days")?
- Export as image?

## References

- Obsidian Maps plugin: https://github.com/obsidianmd/obsidian-maps (official Bases view example)
- Obsidian API types: https://github.com/obsidianmd/obsidian-api
- Bases documentation: https://help.obsidian.md/bases
