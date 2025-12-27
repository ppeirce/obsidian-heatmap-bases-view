import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	interpolateColor,
	calculateIntensityNumeric,
	calculateIntensityBoolean,
	getColorForIntensity,
	isDarkMode,
	getColorSchemeCSSVars,
	COLOR_SCHEMES,
} from './colorUtils';

describe('colorUtils', () => {
	describe('interpolateColor', () => {
		it('returns start color at t=0', () => {
			const result = interpolateColor('#39d353', '#216e39', 0);
			// Should be very close to start color
			expect(result.toLowerCase()).toBe('#39d353');
		});

		it('returns end color at t=1', () => {
			const result = interpolateColor('#39d353', '#216e39', 1);
			// Should be very close to end color
			expect(result.toLowerCase()).toBe('#216e39');
		});

		it('returns intermediate color at t=0.5', () => {
			const result = interpolateColor('#ffffff', '#000000', 0.5);
			// Result should be a gray color
			expect(result).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('clamps t values outside [0, 1]', () => {
			const result1 = interpolateColor('#39d353', '#216e39', -0.5);
			const result2 = interpolateColor('#39d353', '#216e39', 1.5);
			// Both should work without errors
			expect(result1).toMatch(/^#[0-9a-f]{6}$/i);
			expect(result2).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('handles hex colors with and without # prefix', () => {
			const result1 = interpolateColor('#ff0000', '#00ff00', 0.5);
			const result2 = interpolateColor('ff0000', '00ff00', 0.5);
			// Both should return valid hex colors
			expect(result1).toMatch(/^#[0-9a-f]{6}$/i);
			expect(result2).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('produces valid hex output for all scheme colors', () => {
			Object.entries(COLOR_SCHEMES).forEach(([schemeName, scheme]) => {
				const darkResult = interpolateColor(scheme.dark.zero, scheme.dark.max, 0.5);
				const lightResult = interpolateColor(scheme.light.zero, scheme.light.max, 0.5);
				expect(darkResult).toMatch(/^#[0-9a-f]{6}$/i);
				expect(lightResult).toMatch(/^#[0-9a-f]{6}$/i);
			});
		});
	});

	describe('calculateIntensityNumeric', () => {
		it('returns 0 for value below min', () => {
			expect(calculateIntensityNumeric(5, 10, 20)).toBe(0);
		});

		it('returns 1 for value at or above max', () => {
			expect(calculateIntensityNumeric(20, 10, 20)).toBe(1);
			expect(calculateIntensityNumeric(25, 10, 20)).toBe(1);
		});

		it('calculates linear interpolation between min and max', () => {
			expect(calculateIntensityNumeric(15, 10, 20)).toBe(0.5);
			expect(calculateIntensityNumeric(12, 10, 20)).toBe(0.2);
			expect(calculateIntensityNumeric(18, 10, 20)).toBe(0.8);
		});

		it('returns 1 when min equals max', () => {
			expect(calculateIntensityNumeric(15, 10, 10)).toBe(1);
		});

		it('handles negative values', () => {
			expect(calculateIntensityNumeric(-15, -20, -10)).toBe(0.5);
			expect(calculateIntensityNumeric(-25, -20, -10)).toBe(0);
		});

		it('handles zero ranges correctly', () => {
			expect(calculateIntensityNumeric(0, 0, 10)).toBe(0);
			expect(calculateIntensityNumeric(5, 0, 10)).toBe(0.5);
			expect(calculateIntensityNumeric(10, 0, 10)).toBe(1);
		});
	});

	describe('calculateIntensityBoolean', () => {
		it('returns 0 for false', () => {
			expect(calculateIntensityBoolean(false)).toBe(0);
		});

		it('returns 1 for true', () => {
			expect(calculateIntensityBoolean(true)).toBe(1);
		});

		it('handles truthy values as true', () => {
			expect(calculateIntensityBoolean(true)).toBe(1);
			expect(calculateIntensityBoolean(1)).toBe(1);
			expect(calculateIntensityBoolean('yes')).toBe(1);
		});

		it('handles falsy values as false', () => {
			expect(calculateIntensityBoolean(false)).toBe(0);
			expect(calculateIntensityBoolean(0)).toBe(0);
			expect(calculateIntensityBoolean('')).toBe(0);
		});
	});

	describe('getColorForIntensity', () => {
		it('returns zero color for intensity 0', () => {
			const darkColor = getColorForIntensity(0, 'green', true);
			expect(darkColor).toBe(COLOR_SCHEMES.green.dark.zero);

			const lightColor = getColorForIntensity(0, 'green', false);
			expect(lightColor).toBe(COLOR_SCHEMES.green.light.zero);
		});

		it('returns max color for intensity 1', () => {
			const darkColor = getColorForIntensity(1, 'green', true);
			expect(darkColor).toBe(COLOR_SCHEMES.green.dark.max);

			const lightColor = getColorForIntensity(1, 'green', false);
			expect(lightColor).toBe(COLOR_SCHEMES.green.light.max);
		});

		it('returns interpolated color for intensity between 0 and 1', () => {
			const color = getColorForIntensity(0.5, 'green', true);
			expect(color).toMatch(/^#[0-9a-f]{6}$/i);
			// Color should be different from zero and max
			expect(color).not.toBe(COLOR_SCHEMES.green.dark.zero);
			expect(color).not.toBe(COLOR_SCHEMES.green.dark.max);
		});

		it('clamps intensity > 1 to max color', () => {
			const color = getColorForIntensity(1.5, 'green', true);
			expect(color).toBe(COLOR_SCHEMES.green.dark.max);
		});

		it('clamps negative intensity to zero color', () => {
			const color = getColorForIntensity(-0.5, 'green', true);
			expect(color).toBe(COLOR_SCHEMES.green.dark.zero);
		});

		it('supports all color schemes', () => {
			const schemes = ['green', 'purple', 'blue', 'orange', 'gray'] as const;
			schemes.forEach(scheme => {
				const darkColor = getColorForIntensity(0.5, scheme, true);
				const lightColor = getColorForIntensity(0.5, scheme, false);
				expect(darkColor).toMatch(/^#[0-9a-f]{6}$/i);
				expect(lightColor).toMatch(/^#[0-9a-f]{6}$/i);
			});
		});

		it('respects dark/light mode flag', () => {
			const darkColor = getColorForIntensity(0.5, 'green', true);
			const lightColor = getColorForIntensity(0.5, 'green', false);
			// Colors should be different between dark and light modes
			expect(darkColor).not.toBe(lightColor);
		});
	});

	describe('isDarkMode', () => {
		beforeEach(() => {
			// Setup DOM for testing
			document.body.className = '';
		});

		afterEach(() => {
			document.body.className = '';
		});

		it('returns true when theme-dark class is present', () => {
			document.body.classList.add('theme-dark');
			expect(isDarkMode()).toBe(true);
		});

		it('returns false when theme-dark class is not present', () => {
			expect(isDarkMode()).toBe(false);
		});

		it('returns false when other theme classes are present', () => {
			document.body.classList.add('theme-light');
			expect(isDarkMode()).toBe(false);
		});

		it('detects dark mode with multiple classes', () => {
			document.body.className = 'some-class theme-dark another-class';
			expect(isDarkMode()).toBe(true);
		});
	});

	describe('getColorSchemeCSSVars', () => {
		it('returns CSS variables for dark mode', () => {
			const vars = getColorSchemeCSSVars('green', true);
			expect(vars).toContain('--heatmap-color-zero');
			expect(vars).toContain('--heatmap-color-max');
			expect(vars).toContain(COLOR_SCHEMES.green.dark.zero);
			expect(vars).toContain(COLOR_SCHEMES.green.dark.max);
		});

		it('returns CSS variables for light mode', () => {
			const vars = getColorSchemeCSSVars('green', false);
			expect(vars).toContain('--heatmap-color-zero');
			expect(vars).toContain('--heatmap-color-max');
			expect(vars).toContain(COLOR_SCHEMES.green.light.zero);
			expect(vars).toContain(COLOR_SCHEMES.green.light.max);
		});

		it('uses correct colors for each scheme in dark mode', () => {
			const schemes = ['green', 'purple', 'blue', 'orange', 'gray'] as const;
			schemes.forEach(scheme => {
				const vars = getColorSchemeCSSVars(scheme, true);
				const colors = COLOR_SCHEMES[scheme].dark;
				expect(vars).toContain(colors.zero);
				expect(vars).toContain(colors.max);
			});
		});

		it('uses correct colors for each scheme in light mode', () => {
			const schemes = ['green', 'purple', 'blue', 'orange', 'gray'] as const;
			schemes.forEach(scheme => {
				const vars = getColorSchemeCSSVars(scheme, false);
				const colors = COLOR_SCHEMES[scheme].light;
				expect(vars).toContain(colors.zero);
				expect(vars).toContain(colors.max);
			});
		});

		it('returns formatted CSS string', () => {
			const vars = getColorSchemeCSSVars('green', true);
			expect(vars).toMatch(/--heatmap-color-\w+:\s*#[0-9a-f]{6}/i);
		});
	});

	describe('COLOR_SCHEMES', () => {
		it('defines all required schemes', () => {
			const requiredSchemes = ['green', 'purple', 'blue', 'orange', 'gray'];
			requiredSchemes.forEach(scheme => {
				expect(COLOR_SCHEMES).toHaveProperty(scheme);
			});
		});

		it('each scheme has dark and light variants', () => {
			Object.values(COLOR_SCHEMES).forEach(scheme => {
				expect(scheme).toHaveProperty('dark');
				expect(scheme).toHaveProperty('light');
				expect(scheme.dark).toHaveProperty('zero');
				expect(scheme.dark).toHaveProperty('max');
				expect(scheme.light).toHaveProperty('zero');
				expect(scheme.light).toHaveProperty('max');
			});
		});

		it('all colors are valid hex format', () => {
			Object.values(COLOR_SCHEMES).forEach(scheme => {
				[scheme.dark.zero, scheme.dark.max, scheme.light.zero, scheme.light.max].forEach(
					color => {
						expect(color).toMatch(/^#[0-9a-f]{6}$/i);
					}
				);
			});
		});
	});

	describe('Integration: intensity to color mapping', () => {
		it('maps numeric values to appropriate colors', () => {
			const min = 0;
			const max = 100;

			// Test different intensity levels
			const low = calculateIntensityNumeric(10, min, max);
			const medium = calculateIntensityNumeric(50, min, max);
			const high = calculateIntensityNumeric(90, min, max);

			const lowColor = getColorForIntensity(low, 'green', true);
			const mediumColor = getColorForIntensity(medium, 'green', true);
			const highColor = getColorForIntensity(high, 'green', true);

			// All should be valid colors
			expect(lowColor).toMatch(/^#[0-9a-f]{6}$/i);
			expect(mediumColor).toMatch(/^#[0-9a-f]{6}$/i);
			expect(highColor).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('maps boolean values to appropriate colors', () => {
			const falseIntensity = calculateIntensityBoolean(false);
			const trueIntensity = calculateIntensityBoolean(true);

			const falseColor = getColorForIntensity(falseIntensity, 'blue', false);
			const trueColor = getColorForIntensity(trueIntensity, 'blue', false);

			// False should be zero color, true should be max color
			expect(falseColor).toBe(COLOR_SCHEMES.blue.light.zero);
			expect(trueColor).toBe(COLOR_SCHEMES.blue.light.max);
		});
	});
});
