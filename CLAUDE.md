# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian community plugin that provides a GitHub-contributions-style heatmap view for Obsidian Bases. It allows users to visualize boolean or numeric properties from daily notes over time.

**Target:** Obsidian 1.10+ (requires Bases API)

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Development build with watch mode
npm run build        # Production build (type-check + bundle)
eslint main.ts       # Lint (requires global eslint: npm install -g eslint)
```

## Testing

Manual testing only - copy `main.js`, `manifest.json`, `styles.css` to:
```
<Vault>/.obsidian/plugins/<plugin-id>/
```
Then reload Obsidian and enable the plugin.

## Architecture

**Entry point:** `main.ts` → compiled to `main.js` via esbuild

**Target file structure** (per spec.md):
```
src/
  main.ts           # Plugin entry, lifecycle, view registration
  HeatmapView.ts    # BasesView implementation
  heatmap.ts        # Grid rendering logic
  dateUtils.ts      # Date parsing, range generation
  types.ts          # Shared TypeScript types
styles.css          # Heatmap CSS styles
```

**Key integration:** The plugin registers a Bases view type called "Heatmap" using `this.registerBasesLayout()`. The view receives query results from the Bases controller and renders a calendar heatmap.

## Key Concepts

- **BasesView**: Extends Obsidian's view system, subscribes to `controller.data` for query results
- **Three cell states**: no note (hollow), note with false/0 (dim filled), note with true/positive (intensity colored)
- **DOM-based rendering**: CSS Grid for layout, not Canvas
- **Theming**: Uses Obsidian CSS custom properties (`--interactive-accent`, `--background-secondary`, etc.)

## Coding Conventions

- Keep `main.ts` minimal - only plugin lifecycle and view registration
- Split functionality across `src/` modules
- Use `this.register*` helpers for all event listeners and intervals
- TypeScript strict mode is partially enabled (strictNullChecks, noImplicitAny)
- Bundle everything into `main.js` - no external runtime dependencies

## References

- Obsidian Maps plugin (official Bases view example): https://github.com/obsidianmd/obsidian-maps
- Bases documentation: https://help.obsidian.md/bases
- Obsidian API: https://github.com/obsidianmd/obsidian-api
