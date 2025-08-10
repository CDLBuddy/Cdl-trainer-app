// eslint.config.js (flat, with compat for legacy shareable configs)
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import a11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
import { FlatCompat } from '@eslint/eslintrc'
import { defineConfig, globalIgnores } from 'eslint/config'

// Convert legacy "extends" configs to flat
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default defineConfig([
  globalIgnores(['dist', 'build', 'coverage', 'node_modules', '.vite', '.vercel']),

  // React/Vite app files
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['vite.config.*', 'eslint.config.*', 'dev-utils/**'],
    languageOptions: {
      ecmaVersion: 2021,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': a11y,
      import: importPlugin,
    },

    // Use compat() for legacy shareable configs
    ...compat.extends(
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:jsx-a11y/recommended'
      // (We skip eslint-config-prettier here; flat config doesn’t need it if you’re using Prettier separately)
    ),

    rules: {
      // Bridge mode safeguard
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
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',

      // Import hygiene
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/newline-after-import': 'warn',
      'import/no-duplicates': 'warn',

      // A11y (keep gentle)
      'jsx-a11y/no-autofocus': 'warn',

      // DX niceties
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
    },
    settings: { react: { version: 'detect' } },
  },

  // Node/config scripts
  {
    files: ['vite.config.*', 'eslint.config.*', 'dev-utils/**'],
    languageOptions: {
      ecmaVersion: 2021,
      globals: globals.node,
      parserOptions: { sourceType: 'module' },
    },
    plugins: { import: importPlugin },
    rules: {
      'no-console': 'off',
      'import/no-duplicates': 'warn',
    },
  },
])
