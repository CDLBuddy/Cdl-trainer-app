// eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // === GLOBAL IGNORES (build outputs, coverage, node_modules, vite cache) ===
  globalIgnores(['dist', 'build', 'coverage', 'node_modules', '.vite']),

  {
    files: ['**/*.{js,jsx}'],

    // === LANGUAGE & PARSER OPTIONS ===
    languageOptions: {
      ecmaVersion: 2021,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },

    // === PLUGINS ===
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },

    // === EXTENDS ===
    extends: [
      js.configs.recommended,                 // Base JS rules
      react.configs.recommended,              // React best practices
      reactHooks.configs['recommended-latest'], // Hooks rules
      reactRefresh.configs.vite,              // Vite-specific refresh safety
      prettierConfig,                         // Disable ESLint rules that conflict with Prettier
    ],

    // === RULES ===
    rules: {
      // Keep your bridge-mode helper
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],

      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.name='showToast']",
          message:
            "Use ToastContext: `const { showToast } = useToast()` instead of the legacy global. (Bridge mode still works for old pages.)",
        },
      ],

      // React tweaks
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off',         // Skip PropTypes if using TypeScript or context-based props
      'react-hooks/exhaustive-deps': 'warn', // Helps catch missing hook deps
    },

    // === REACT VERSION AUTODETECT ===
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
])
