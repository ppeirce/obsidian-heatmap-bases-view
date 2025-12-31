import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	interpolateColor,
	calculateIntensityNumeric,
	calculateIntensityBoolean,
	getColorForIntensity,
	isDarkMode,
	getColorSchemeCSSVars,
	isValidHexColor,
	getRelativeLuminance,
	buildCustomColorScheme,
	getSchemeDefinition,
} from './colorUtils';
import { DEFAULT_COLOR_SCHEMES } from './types';

// Helper to get a test scheme definition
const getTestScheme = () => buildCustomColorScheme('#ebedf0', '#39d353');

describe('colorUtils', () => {
	describe('interpolateColor', () => {
		it('returns start color at t=0', () => {
			const result = interpolateColor('#39d353', '#216e39', 0);
			expect(result.toLowerCase()).toBe('#39d353');
		});

		it('returns end color at t=1', () => {
			const result = interpolateColor('#39d353', '#216e39', 1);
			expect(result.toLowerCase()).toBe('#216e39');
		});

		it('returns intermediate color at t=0.5', () => {
			const result = interpolateColor('#ffffff', '#000000', 0.5);
			expect(result).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('clamps t values outside [0, 1]', () => {
			const result1 = interpolateColor('#39d353', '#216e39', -0.5);
			const result2 = interpolateColor('#39d353', '#216e39', 1.5);
			expect(result1).toMatch(/^#[0-9a-f]{6}$/i);
			expect(result2).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('handles hex colors with and without # prefix', () => {
			const result1 = interpolateColor('#ff0000', '#00ff00', 0.5);
			const result2 = interpolateColor('ff0000', '00ff00', 0.5);
			expect(result1).toMatch(/^#[0-9a-f]{6}$/i);
			expect(result2).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('produces valid hex output for default scheme colors', () => {
			DEFAULT_COLOR_SCHEMES.forEach(schemeItem => {
				const scheme = buildCustomColorScheme(schemeItem.zeroColor, schemeItem.maxColor);
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
			// @ts-expect-error - testing truthy behavior
			expect(calculateIntensityBoolean(1)).toBe(1);
			// @ts-expect-error - testing truthy behavior
			expect(calculateIntensityBoolean('yes')).toBe(1);
		});

		it('handles falsy values as false', () => {
			expect(calculateIntensityBoolean(false)).toBe(0);
			// @ts-expect-error - testing falsy behavior
			expect(calculateIntensityBoolean(0)).toBe(0);
			// @ts-expect-error - testing falsy behavior
			expect(calculateIntensityBoolean('')).toBe(0);
		});
	});

	describe('getColorForIntensity', () => {
		it('returns zero color for intensity 0', () => {
			const scheme = getTestScheme();
			const darkColor = getColorForIntensity(0, scheme, true);
			expect(darkColor).toBe(scheme.dark.zero);

			const lightColor = getColorForIntensity(0, scheme, false);
			expect(lightColor).toBe(scheme.light.zero);
		});

		it('returns max color for intensity 1', () => {
			const scheme = getTestScheme();
			const darkColor = getColorForIntensity(1, scheme, true);
			expect(darkColor).toBe(scheme.dark.max);

			const lightColor = getColorForIntensity(1, scheme, false);
			expect(lightColor).toBe(scheme.light.max);
		});

		it('returns interpolated color for intensity between 0 and 1', () => {
			const scheme = getTestScheme();
			const color = getColorForIntensity(0.5, scheme, true);
			expect(color).toMatch(/^#[0-9a-f]{6}$/i);
			expect(color).not.toBe(scheme.dark.zero);
			expect(color).not.toBe(scheme.dark.max);
		});

		it('clamps intensity > 1 to max color', () => {
			const scheme = getTestScheme();
			const color = getColorForIntensity(1.5, scheme, true);
			expect(color).toBe(scheme.dark.max);
		});

		it('clamps negative intensity to zero color', () => {
			const scheme = getTestScheme();
			const color = getColorForIntensity(-0.5, scheme, true);
			expect(color).toBe(scheme.dark.zero);
		});

		it('works with all default color schemes', () => {
			DEFAULT_COLOR_SCHEMES.forEach(schemeItem => {
				const scheme = getSchemeDefinition(schemeItem);
				const darkColor = getColorForIntensity(0.5, scheme, true);
				const lightColor = getColorForIntensity(0.5, scheme, false);
				expect(darkColor).toMatch(/^#[0-9a-f]{6}$/i);
				expect(lightColor).toMatch(/^#[0-9a-f]{6}$/i);
			});
		});

		it('respects dark/light mode flag', () => {
			const scheme = getTestScheme();
			const darkColor = getColorForIntensity(0.5, scheme, true);
			const lightColor = getColorForIntensity(0.5, scheme, false);
			expect(darkColor).not.toBe(lightColor);
		});
	});

	describe('isDarkMode', () => {
		beforeEach(() => {
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
			const scheme = getTestScheme();
			const vars = getColorSchemeCSSVars(scheme, true);
			expect(vars).toContain('--heatmap-color-zero');
			expect(vars).toContain('--heatmap-color-max');
			expect(vars).toContain(scheme.dark.zero);
			expect(vars).toContain(scheme.dark.max);
		});

		it('returns CSS variables for light mode', () => {
			const scheme = getTestScheme();
			const vars = getColorSchemeCSSVars(scheme, false);
			expect(vars).toContain('--heatmap-color-zero');
			expect(vars).toContain('--heatmap-color-max');
			expect(vars).toContain(scheme.light.zero);
			expect(vars).toContain(scheme.light.max);
		});

		it('returns formatted CSS string', () => {
			const scheme = getTestScheme();
			const vars = getColorSchemeCSSVars(scheme, true);
			expect(vars).toMatch(/--heatmap-color-\w+:\s*#[0-9a-f]{6}/i);
		});
	});

	describe('DEFAULT_COLOR_SCHEMES', () => {
		it('defines all required schemes', () => {
			const requiredSchemes = ['green', 'purple', 'blue', 'orange', 'gray'];
			requiredSchemes.forEach(schemeId => {
				const found = DEFAULT_COLOR_SCHEMES.find(s => s.id === schemeId);
				expect(found).toBeDefined();
			});
		});

		it('each scheme has required properties', () => {
			DEFAULT_COLOR_SCHEMES.forEach(scheme => {
				expect(scheme).toHaveProperty('id');
				expect(scheme).toHaveProperty('name');
				expect(scheme).toHaveProperty('zeroColor');
				expect(scheme).toHaveProperty('maxColor');
			});
		});

		it('all colors are valid hex format', () => {
			DEFAULT_COLOR_SCHEMES.forEach(scheme => {
				expect(isValidHexColor(scheme.zeroColor)).toBe(true);
				expect(isValidHexColor(scheme.maxColor)).toBe(true);
			});
		});
	});

	describe('Integration: intensity to color mapping', () => {
		it('maps numeric values to appropriate colors', () => {
			const scheme = getTestScheme();
			const min = 0;
			const max = 100;

			const low = calculateIntensityNumeric(10, min, max);
			const medium = calculateIntensityNumeric(50, min, max);
			const high = calculateIntensityNumeric(90, min, max);

			const lowColor = getColorForIntensity(low, scheme, true);
			const mediumColor = getColorForIntensity(medium, scheme, true);
			const highColor = getColorForIntensity(high, scheme, true);

			expect(lowColor).toMatch(/^#[0-9a-f]{6}$/i);
			expect(mediumColor).toMatch(/^#[0-9a-f]{6}$/i);
			expect(highColor).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('maps boolean values to appropriate colors', () => {
			const scheme = buildCustomColorScheme('#ebedf0', '#38bdf8');
			const falseIntensity = calculateIntensityBoolean(false);
			const trueIntensity = calculateIntensityBoolean(true);

			const falseColor = getColorForIntensity(falseIntensity, scheme, false);
			const trueColor = getColorForIntensity(trueIntensity, scheme, false);

			expect(falseColor).toBe(scheme.light.zero);
			expect(trueColor).toBe(scheme.light.max);
		});
	});

	describe('isValidHexColor', () => {
		it('accepts valid 6-digit hex with #', () => {
			expect(isValidHexColor('#ff0000')).toBe(true);
			expect(isValidHexColor('#39d353')).toBe(true);
			expect(isValidHexColor('#AABBCC')).toBe(true);
		});

		it('accepts valid 6-digit hex without #', () => {
			expect(isValidHexColor('ff0000')).toBe(true);
			expect(isValidHexColor('39d353')).toBe(true);
		});

		it('rejects 3-digit hex colors', () => {
			expect(isValidHexColor('#fff')).toBe(false);
			expect(isValidHexColor('abc')).toBe(false);
		});

		it('rejects named colors', () => {
			expect(isValidHexColor('red')).toBe(false);
			expect(isValidHexColor('green')).toBe(false);
		});

		it('rejects invalid characters', () => {
			expect(isValidHexColor('#gg0000')).toBe(false);
			expect(isValidHexColor('#xyz123')).toBe(false);
		});

		it('rejects empty strings', () => {
			expect(isValidHexColor('')).toBe(false);
		});

		it('rejects colors with wrong length', () => {
			expect(isValidHexColor('#ff00')).toBe(false);
			expect(isValidHexColor('#ff00000')).toBe(false);
		});
	});

	describe('getRelativeLuminance', () => {
		it('returns 0 for black', () => {
			const luminance = getRelativeLuminance('#000000');
			expect(luminance).toBeCloseTo(0, 5);
		});

		it('returns 1 for white', () => {
			const luminance = getRelativeLuminance('#ffffff');
			expect(luminance).toBeCloseTo(1, 5);
		});

		it('returns intermediate value for gray', () => {
			const luminance = getRelativeLuminance('#808080');
			expect(luminance).toBeGreaterThan(0.1);
			expect(luminance).toBeLessThan(0.5);
		});

		it('returns consistent values for the same color', () => {
			const lum1 = getRelativeLuminance('#39d353');
			const lum2 = getRelativeLuminance('#39d353');
			expect(lum1).toBe(lum2);
		});

		it('dark colors have lower luminance than light colors', () => {
			const darkLum = getRelativeLuminance('#161b22');
			const lightLum = getRelativeLuminance('#ebedf0');
			expect(darkLum).toBeLessThan(lightLum);
		});
	});

	describe('buildCustomColorScheme', () => {
		it('creates scheme with both dark and light variants', () => {
			const scheme = buildCustomColorScheme('#ebedf0', '#ff0000');
			expect(scheme).toHaveProperty('dark');
			expect(scheme).toHaveProperty('light');
			expect(scheme.dark).toHaveProperty('zero');
			expect(scheme.dark).toHaveProperty('max');
			expect(scheme.light).toHaveProperty('zero');
			expect(scheme.light).toHaveProperty('max');
		});

		it('uses provided max color directly', () => {
			const scheme = buildCustomColorScheme('#ebedf0', '#ff0000');
			expect(scheme.dark.max).toBe('#ff0000');
			expect(scheme.light.max).toBe('#ff0000');
		});

		it('adjusts light zero color for dark mode', () => {
			const scheme = buildCustomColorScheme('#ffffff', '#ff0000');
			const darkZeroLum = getRelativeLuminance(scheme.dark.zero);
			expect(darkZeroLum).toBeLessThan(0.15);
		});

		it('adjusts dark zero color for light mode', () => {
			const scheme = buildCustomColorScheme('#000000', '#ff0000');
			const originalLum = getRelativeLuminance('#000000');
			const lightZeroLum = getRelativeLuminance(scheme.light.zero);
			expect(lightZeroLum).toBeGreaterThan(originalLum);
			expect(lightZeroLum).toBeGreaterThan(0.2);
		});

		it('handles colors without # prefix', () => {
			const scheme = buildCustomColorScheme('ebedf0', 'ff0000');
			expect(scheme.dark.max).toBe('#ff0000');
			expect(scheme.light.max).toBe('#ff0000');
		});

		it('preserves appropriately dark zero color in dark mode', () => {
			const scheme = buildCustomColorScheme('#161b22', '#39d353');
			expect(scheme.dark.zero).toBe('#161b22');
		});

		it('preserves appropriately light zero color in light mode', () => {
			const scheme = buildCustomColorScheme('#ebedf0', '#216e39');
			expect(scheme.light.zero).toBe('#ebedf0');
		});
	});

	describe('getSchemeDefinition', () => {
		it('converts ColorSchemeItem to ColorSchemeDefinition', () => {
			const schemeItem = DEFAULT_COLOR_SCHEMES[0]; // green
			const schemeDef = getSchemeDefinition(schemeItem);

			expect(schemeDef).toHaveProperty('dark');
			expect(schemeDef).toHaveProperty('light');
			expect(schemeDef.dark.max).toBe(schemeItem.maxColor);
			expect(schemeDef.light.max).toBe(schemeItem.maxColor);
		});

		it('works with all default schemes', () => {
			DEFAULT_COLOR_SCHEMES.forEach(schemeItem => {
				const schemeDef = getSchemeDefinition(schemeItem);
				expect(schemeDef.dark.max).toBe(schemeItem.maxColor);
				expect(schemeDef.light.max).toBe(schemeItem.maxColor);
			});
		});
	});
});
