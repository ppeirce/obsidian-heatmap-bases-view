import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.node,
			},
			parserOptions: {
				project: true,
				sourceType: "module",
			},
		},
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
		},
	},
	{
		ignores: ["node_modules/", "main.js", "vitest.config.ts"],
	},
];
