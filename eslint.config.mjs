import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                sap: "readonly"
            },
            ecmaVersion: 2023,
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            "@typescript-eslint/no-unsafe-enum-comparison": "off"
        },
    },
    {
        ignores: ["eslint.config.mjs", "playwright.config.ts", "environment.d.ts", "mockServer/**/*", "mock.mjs", "dist/**/*", "node_modules/**/*", "coverage/**/*", "report/**/*"],
    }
);