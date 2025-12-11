# Heatmap Bases View - Architecture

## System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        Obsidian App                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Bases Core Plugin                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Table View  │  │  Map View   │  │  Heatmap View       ││  │
│  │  │  (builtin)  │  │  (plugin)   │  │  (this plugin)      ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │
│  │                           ▲                                │  │
│  │                           │                                │  │
│  │                  ┌────────┴────────┐                       │  │
│  │                  │ QueryController │                       │  │
│  │                  │   (Bases API)   │                       │  │
│  │                  └────────┬────────┘                       │  │
│  │                           │                                │  │
│  │                  ┌────────┴────────┐                       │  │
│  │                  │  Base Filters   │                       │  │
│  │                  │  & Query Engine │                       │  │
│  │                  └─────────────────┘                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                     ┌────────┴────────┐                         │
│                     │      Vault      │                         │
│                     │  (Markdown +    │                         │
│                     │   Properties)   │                         │
│                     └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

The plugin operates as a view provider within the Bases ecosystem. It receives filtered query results from the Bases QueryController and renders them as a heatmap. The plugin has no direct vault access for querying—all data flows through the Bases API.


## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         HeatmapPlugin                           │
│                         (main.ts)                               │
│  - Registers view with Bases API                                │
│  - Defines configuration options                                │
│  - Creates HeatmapView instances                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ creates
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         HeatmapView                             │
│                      (HeatmapView.ts)                           │
│  - Subscribes to QueryController data                           │
│  - Manages view lifecycle                                       │
│  - Coordinates data processing and rendering                    │
│  - Handles user interactions                                    │
└───────┬─────────────────────┬───────────────────────┬───────────┘
        │                     │                       │
        ▼                     ▼                       ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│  DataProcessor│    │  HeatmapRenderer│    │  InteractionHandler │
│  (data.ts)    │    │  (renderer.ts)  │    │  (interactions.ts)  │
│               │    │                 │    │                     │
│ - Extract     │    │ - Build DOM     │    │ - Hover tooltips    │
│   dates/values│    │ - Apply styles  │    │ - Click to open     │
│ - Build lookup│    │ - Color mapping │    │ - Context menu      │
│   map         │    │ - Layout grid   │    │ - Keyboard nav      │
│ - Compute     │    │                 │    │                     │
│   min/max     │    │                 │    │                     │
└───────────────┘    └─────────────────┘    └─────────────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐    ┌─────────────────┐
│  DateUtils    │    │  ColorUtils     │
│ (dateUtils.ts)│    │ (colorUtils.ts) │
│               │    │                 │
│ - Parse dates │    │ - Color schemes │
│ - Range gen   │    │ - Intensity calc│
│ - Formatting  │    │ - Theme adapt   │
└───────────────┘    └─────────────────┘
```


## Data Flow

### Initialization Flow

```
1. User creates/opens Base with Heatmap view selected
                    │
                    ▼
2. Bases API calls factory(controller, containerEl)
                    │
                    ▼
3. HeatmapPlugin creates new HeatmapView instance
                    │
                    ▼
4. HeatmapView.onload()
   ├── Read config from controller.config
   ├── Subscribe to controller.data
   └── Trigger initial render
                    │
                    ▼
5. QueryController emits current data
                    │
                    ▼
6. HeatmapView.onDataChange(data)
   └── Process and render
```

### Render Flow

```
QueryController.data (array of notes)
          │
          ▼
┌─────────────────────────────────────┐
│         DataProcessor               │
│                                     │
│  Input:                             │
│    - notes: TFile[]                 │
│    - dateProperty: string           │
│    - valueProperty: string          │
│                                     │
│  Process:                           │
│    1. For each note:                │
│       - Extract date from property  │
│         or parse from filename      │
│       - Extract value (bool/number) │
│       - Store in Map<date, entry>   │
│    2. Compute value stats (min/max) │
│                                     │
│  Output:                            │
│    - entries: Map<string, Entry>    │
│    - stats: { min, max, count }     │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│         HeatmapRenderer             │
│                                     │
│  Input:                             │
│    - entries: Map<string, Entry>    │
│    - stats: { min, max }            │
│    - config: ViewConfig             │
│    - dateRange: [start, end]        │
│                                     │
│  Process:                           │
│    1. Generate all dates in range   │
│    2. For each date:                │
│       - Look up entry (or null)     │
│       - Compute cell state          │
│       - Compute color intensity     │
│       - Create cell element         │
│    3. Arrange cells in grid         │
│    4. Add month/day labels          │
│                                     │
│  Output:                            │
│    - DOM tree ready to mount        │
└──────────────────┬──────────────────┘
                   │
                   ▼
         containerEl.replaceChildren()
```

### Interaction Flow

```
User hovers cell
      │
      ▼
InteractionHandler.onHover(cell)
      │
      ├── Extract date from cell.dataset.date
      ├── Look up entry from Map
      ├── Format tooltip content
      └── Show tooltip at cursor position

User clicks cell
      │
      ▼
InteractionHandler.onClick(cell)
      │
      ├── Extract date from cell.dataset.date
      ├── Look up entry from Map
      ├── If entry exists:
      │     └── app.workspace.openLinkText(entry.note.path)
      └── If no entry:
            └── Optional: create new daily note?
```


## Data Structures

### Entry

Represents a single note's data for the heatmap.

```typescript
interface HeatmapEntry {
  date: string;          // ISO date string "YYYY-MM-DD"
  value: number | null;  // null = note exists but property missing/false
  note: TFile;           // reference to the note
  displayValue: string;  // formatted value for tooltip
}
```

### ProcessedData

Output of DataProcessor, input to HeatmapRenderer.

```typescript
interface ProcessedData {
  entries: Map<string, HeatmapEntry>;
  stats: {
    min: number;
    max: number;
    count: number;
    hasNumeric: boolean;  // false if all boolean
  };
}
```

### ViewConfig

Configuration for the heatmap view, stored in the Base file.

```typescript
interface HeatmapViewConfig {
  dateProperty: string;      // property name or "__filename__"
  valueProperty: string;     // property name to visualize
  startDate: string | null;  // ISO date or null for auto
  endDate: string | null;    // ISO date or null for auto
  colorScheme: ColorScheme;  // "green" | "purple" | "blue" | etc.
  weekStart: 0 | 1;          // 0 = Sunday, 1 = Monday
  showWeekdayLabels: boolean;
  showMonthLabels: boolean;
}

type ColorScheme = "green" | "purple" | "blue" | "orange" | "gray";
```

### CellState

Represents the visual state of a single cell.

```typescript
type CellState = 
  | { type: "empty" }                           // no note for this date
  | { type: "zero"; note: TFile }               // note exists, value is 0/false
  | { type: "filled"; note: TFile; intensity: number }; // 0-1 intensity
```


## Rendering Strategy

### DOM Structure

```html
<div class="heatmap-container">
  <div class="heatmap-scroll-wrapper">
    
    <!-- Month labels row -->
    <div class="heatmap-month-labels">
      <span class="heatmap-month-label" style="grid-column: 1 / 5">Jan</span>
      <span class="heatmap-month-label" style="grid-column: 5 / 9">Feb</span>
      <!-- ... -->
    </div>
    
    <!-- Main grid -->
    <div class="heatmap-grid">
      
      <!-- Optional weekday labels column -->
      <div class="heatmap-weekday-labels">
        <span>Mon</span>
        <span>Wed</span>
        <span>Fri</span>
      </div>
      
      <!-- Cells container (CSS Grid) -->
      <div class="heatmap-cells">
        <div class="heatmap-cell heatmap-cell--empty" 
             data-date="2025-01-01"
             style="grid-row: 4; grid-column: 1;">
        </div>
        <div class="heatmap-cell heatmap-cell--filled" 
             data-date="2025-01-02"
             data-intensity="0.75"
             style="grid-row: 5; grid-column: 1; 
                    --cell-intensity: 0.75;">
        </div>
        <!-- ... -->
      </div>
    </div>
  </div>
  
  <!-- Legend -->
  <div class="heatmap-legend">
    <span class="heatmap-legend-label">Less</span>
    <div class="heatmap-legend-cells">
      <div class="heatmap-legend-cell" style="--cell-intensity: 0"></div>
      <div class="heatmap-legend-cell" style="--cell-intensity: 0.25"></div>
      <div class="heatmap-legend-cell" style="--cell-intensity: 0.5"></div>
      <div class="heatmap-legend-cell" style="--cell-intensity: 0.75"></div>
      <div class="heatmap-legend-cell" style="--cell-intensity: 1"></div>
    </div>
    <span class="heatmap-legend-label">More</span>
  </div>
</div>
```

### CSS Grid Layout

The cells use CSS Grid with a fixed 7-row structure (one per weekday). Columns represent weeks.

```css
.heatmap-cells {
  display: grid;
  grid-template-rows: repeat(7, var(--cell-size));
  grid-auto-columns: var(--cell-size);
  grid-auto-flow: column;
  gap: var(--cell-gap);
}
```

Cell position is determined by:
- Row (1-7): day of week
- Column: week number within the date range

### Cell Sizing

```css
:root {
  --cell-size: 11px;
  --cell-gap: 3px;
  --cell-radius: 2px;
}
```

Minimum container width for a full year:
- 53 weeks × (11px + 3px) = 742px


## Color System

### Intensity Calculation

For numeric properties:
```typescript
function calculateIntensity(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return (value - min) / (max - min);
}
```

For boolean properties:
```typescript
function calculateIntensity(value: boolean): number {
  return value ? 1 : 0;
}
```

### Color Schemes

Each scheme defines a gradient from low to high intensity.

```css
/* Green (GitHub-style) */
.heatmap--green {
  --color-empty: var(--background-secondary);
  --color-zero: #161b22;
  --color-l1: #0e4429;
  --color-l2: #006d32;
  --color-l3: #26a641;
  --color-l4: #39d353;
}

/* Purple */
.heatmap--purple {
  --color-empty: var(--background-secondary);
  --color-zero: #1a1523;
  --color-l1: #3b1d71;
  --color-l2: #5b21b6;
  --color-l3: #7c3aed;
  --color-l4: #a78bfa;
}
```

### Theme Adaptation

The plugin detects light/dark mode via:
```typescript
const isDark = document.body.classList.contains('theme-dark');
```

Color schemes have light and dark variants. The empty cell color always uses Obsidian's `--background-secondary` for seamless integration.


## Configuration Options API

Options are defined using the Bases ViewOption types.

```typescript
options: (): ViewOption[] => [
  {
    type: 'property',
    key: 'dateProperty',
    name: 'Date property',
    description: 'Property containing the date, or use filename for daily notes',
    default: '__filename__',
  },
  {
    type: 'property',
    key: 'valueProperty', 
    name: 'Value property',
    description: 'Boolean or number property to visualize',
    required: true,
  },
  {
    type: 'date',
    key: 'startDate',
    name: 'Start date',
    description: 'Beginning of date range (leave empty for auto)',
  },
  {
    type: 'date',
    key: 'endDate',
    name: 'End date',
    description: 'End of date range (leave empty for auto)',
  },
  {
    type: 'dropdown',
    key: 'colorScheme',
    name: 'Color scheme',
    options: [
      { value: 'green', label: 'Green' },
      { value: 'purple', label: 'Purple' },
      { value: 'blue', label: 'Blue' },
      { value: 'orange', label: 'Orange' },
      { value: 'gray', label: 'Gray' },
    ],
    default: 'green',
  },
  {
    type: 'dropdown',
    key: 'weekStart',
    name: 'Week starts on',
    options: [
      { value: '0', label: 'Sunday' },
      { value: '1', label: 'Monday' },
    ],
    default: '0',
  },
  {
    type: 'toggle',
    key: 'showWeekdayLabels',
    name: 'Show weekday labels',
    default: true,
  },
  {
    type: 'toggle',
    key: 'showMonthLabels',
    name: 'Show month labels',
    default: true,
  },
]
```


## Date Handling

### Parsing Dates from Filenames

Daily notes typically follow patterns like:
- `2025-01-15.md`
- `2025-01-15 Wednesday.md`
- `January 15, 2025.md`

The plugin attempts to parse dates using configurable patterns:

```typescript
const DAILY_NOTE_PATTERNS = [
  /^(\d{4}-\d{2}-\d{2})/,           // 2025-01-15
  /^(\d{4})\/(\d{2})\/(\d{2})/,     // 2025/01/15
  /^(\w+ \d{1,2}, \d{4})/,          // January 15, 2025
];

function parseDateFromFilename(filename: string): Date | null {
  for (const pattern of DAILY_NOTE_PATTERNS) {
    const match = filename.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  return null;
}
```

### Date Range Generation

```typescript
function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(formatDateISO(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
```

### Auto Date Range

When start/end dates are not configured:
- Start: earliest date found in query results, or first day of current year
- End: today's date


## Error Handling

### Missing Configuration

If `valueProperty` is not set:
```
┌─────────────────────────────────────┐
│  ⚠ Configure value property         │
│                                     │
│  Select a property to visualize     │
│  in the view settings.              │
│                                     │
│  [Open Settings]                    │
└─────────────────────────────────────┘
```

### No Data

If query returns no notes or no notes have valid dates:
```
┌─────────────────────────────────────┐
│  No data to display                 │
│                                     │
│  No notes with dates found in the   │
│  current filter. Check your Base    │
│  filters and date property setting. │
└─────────────────────────────────────┘
```

### Invalid Property Type

If selected property is not boolean or number:
```
┌─────────────────────────────────────┐
│  ⚠ Unsupported property type        │
│                                     │
│  "status" is a text property.       │
│  Heatmap requires boolean or        │
│  number properties.                 │
└─────────────────────────────────────┘
```


## Performance Considerations

### Rendering Optimization

For large date ranges (multiple years), consider:

1. Virtual scrolling: only render visible weeks plus buffer
2. Canvas rendering: switch from DOM to Canvas for 1000+ cells
3. Debounced updates: throttle re-renders during rapid data changes

Initial implementation uses simple DOM rendering, which should handle 2-3 years (700-1000 cells) without issues.

### Data Processing

The Map-based lookup is O(1) per cell, so processing scales linearly with date range size, not with number of notes.

```
Query results: 365 notes
Date range: 365 days
Processing: O(365) to build map + O(365) to render = O(n)
```


## Testing Strategy

### Unit Tests

- DateUtils: date parsing, range generation, formatting
- ColorUtils: intensity calculation, color scheme application
- DataProcessor: entry extraction, stats calculation

### Integration Tests

- Full render cycle with mock QueryController
- Configuration changes trigger re-render
- Click/hover interactions

### Manual Testing

- Test with various daily note naming conventions
- Test with boolean vs numeric properties
- Test with sparse data (many missing days)
- Test with different themes (light/dark, accent colors)
- Test horizontal scrolling behavior
- Test in narrow panes


## Future Considerations

### Potential Enhancements

1. Date range presets: "This year", "Last 6 months", "Last 30 days"
2. Multiple color scales: diverging scales for +/- values
3. Annotations: mark special dates (holidays, milestones)
4. Export: save heatmap as PNG/SVG
5. Responsive breakpoints: month view for narrow panes

### API Evolution

The Bases API is new (1.10). Watch for:
- New ViewOption types
- Changes to QueryController interface
- New lifecycle hooks
- Formula property access


## File Structure

```
obsidian-heatmap-view/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── HeatmapView.ts       # BasesView implementation
│   ├── data.ts              # DataProcessor
│   ├── renderer.ts          # HeatmapRenderer
│   ├── interactions.ts      # InteractionHandler
│   ├── dateUtils.ts         # Date utilities
│   ├── colorUtils.ts        # Color utilities
│   └── types.ts             # Shared type definitions
├── styles.css               # All CSS
├── manifest.json            # Obsidian plugin manifest
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── README.md
```
