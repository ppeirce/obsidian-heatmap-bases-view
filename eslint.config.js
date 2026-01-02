import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		files: ["src/**/*.ts", "!src/**/*.test.ts", "!src/__mocks__/**"],
		languageOptions: {
			globals: {
				...globals.node,
			},
			parserOptions: {
				project: true,
				sourceType: "module",
			},
		},
		plugins: {
			obsidianmd,
		},
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
			// Obsidian-specific rules
			...obsidianmd.configs.recommended,
		},
	},
	{
		ignores: ["node_modules/", "main.js", "vitest.config.ts", "**/*.test.ts", "src/__mocks__/**"],
	},
];
