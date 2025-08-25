import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  stylistic.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@stylistic/quotes": ["error", "single", { avoidEscape: true }],
      "@stylistic/indent": ["error", 4],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/comma-dangle": ["error", "never"],
    },
  },
  {
    ignores: [
      "eslint.config.mjs",
      "playwright.config.ts",
      "environment.d.ts",
      "mockServer/**/*",
      "mock.mjs",
      "dist/**/*",
      "node_modules/**/*",
      "coverage/**/*",
      "report/**/*",
      "webapp/control/**/*.gen.d.ts"
    ],
  },
);