import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/main.ts', 'src/__mocks__/**'],
		},
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, 'src/__mocks__/obsidian.ts'),
		},
	},
});
