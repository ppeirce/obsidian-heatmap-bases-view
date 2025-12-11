import { ColorScheme } from './types';

/**
 * Color scheme definitions with light and dark variants.
 * Each scheme has 5 levels: empty, zero (l0), and 4 intensity levels (l1-l4).
 */
export interface ColorSchemeDefinition {
	dark: {
		zero: string;
		l1: string;
		l2: string;
		l3: string;
		l4: string;
	};
	light: {
		zero: string;
		l1: string;
		l2: string;
		l3: string;
		l4: string;
	};
}

export const COLOR_SCHEMES: Record<ColorScheme, ColorSchemeDefinition> = {
	green: {
		dark: {
			zero: '#161b22',
			l1: '#0e4429',
			l2: '#006d32',
			l3: '#26a641',
			l4: '#39d353',
		},
		light: {
			zero: '#ebedf0',
			l1: '#9be9a8',
			l2: '#40c463',
			l3: '#30a14e',
			l4: '#216e39',
		},
	},
	purple: {
		dark: {
			zero: '#1a1523',
			l1: '#3b1d71',
			l2: '#5b21b6',
			l3: '#7c3aed',
			l4: '#a78bfa',
		},
		light: {
			zero: '#ebedf0',
			l1: '#d8b4fe',
			l2: '#a78bfa',
			l3: '#7c3aed',
			l4: '#5b21b6',
		},
	},
	blue: {
		dark: {
			zero: '#161b22',
			l1: '#0c4a6e',
			l2: '#0369a1',
			l3: '#0ea5e9',
			l4: '#38bdf8',
		},
		light: {
			zero: '#ebedf0',
			l1: '#bae6fd',
			l2: '#7dd3fc',
			l3: '#38bdf8',
			l4: '#0284c7',
		},
	},
	orange: {
		dark: {
			zero: '#1c1917',
			l1: '#7c2d12',
			l2: '#c2410c',
			l3: '#ea580c',
			l4: '#fb923c',
		},
		light: {
			zero: '#ebedf0',
			l1: '#fed7aa',
			l2: '#fdba74',
			l3: '#fb923c',
			l4: '#ea580c',
		},
	},
	gray: {
		dark: {
			zero: '#161b22',
			l1: '#2d333b',
			l2: '#444c56',
			l3: '#768390',
			l4: '#adbac7',
		},
		light: {
			zero: '#ebedf0',
			l1: '#c6d0da',
			l2: '#9ba6b0',
			l3: '#6e7681',
			l4: '#444c56',
		},
	},
};

/**
 * Calculate intensity (0-1) for a numeric value.
 */
export function calculateIntensityNumeric(
	value: number,
	min: number,
	max: number
): number {
	if (max === min) return 1;
	if (value <= min) return 0;
	if (value >= max) return 1;
	return (value - min) / (max - min);
}

/**
 * Calculate intensity for a boolean value.
 */
export function calculateIntensityBoolean(value: boolean): number {
	return value ? 1 : 0;
}

/**
 * Map intensity (0-1) to a discrete level (0-4).
 * Level 0 is for zero values, levels 1-4 are intensity tiers.
 */
export function intensityToLevel(intensity: number): 0 | 1 | 2 | 3 | 4 {
	if (intensity <= 0) return 0;
	if (intensity <= 0.25) return 1;
	if (intensity <= 0.5) return 2;
	if (intensity <= 0.75) return 3;
	return 4;
}

/**
 * Get the color for a given intensity and scheme.
 */
export function getColorForIntensity(
	intensity: number,
	scheme: ColorScheme,
	isDark: boolean
): string {
	const colors = isDark ? COLOR_SCHEMES[scheme].dark : COLOR_SCHEMES[scheme].light;
	const level = intensityToLevel(intensity);

	switch (level) {
		case 0: return colors.zero;
		case 1: return colors.l1;
		case 2: return colors.l2;
		case 3: return colors.l3;
		case 4: return colors.l4;
	}
}

/**
 * Check if the current theme is dark mode.
 */
export function isDarkMode(): boolean {
	return document.body.classList.contains('theme-dark');
}

/**
 * Get CSS custom properties for a color scheme.
 */
export function getColorSchemeCSSVars(scheme: ColorScheme, isDark: boolean): string {
	const colors = isDark ? COLOR_SCHEMES[scheme].dark : COLOR_SCHEMES[scheme].light;

	return `
		--heatmap-color-zero: ${colors.zero};
		--heatmap-color-l1: ${colors.l1};
		--heatmap-color-l2: ${colors.l2};
		--heatmap-color-l3: ${colors.l3};
		--heatmap-color-l4: ${colors.l4};
	`;
}
