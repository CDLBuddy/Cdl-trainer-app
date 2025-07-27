import globals from "globals";
import json from "@eslint/json";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
  // JavaScript files
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.browser },
    plugins: { prettier: prettierPlugin },
    rules: {
      // "prettier/prettier" will report Prettier formatting as ESLint errors
      "prettier/prettier": "error"
    }
  },
  // JSON files
  { files: ["**/*.json"], plugins: { json }, language: "json/json" },
  // CSS files
  { files: ["**/*.css"], plugins: { css }, language: "css/css" },

  // Disable ESLint stylistic rules that might conflict with Prettier (for JS)
  prettierConfig
]);