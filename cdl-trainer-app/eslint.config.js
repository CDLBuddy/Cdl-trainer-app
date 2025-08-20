// Path: eslint.config.js
// ============================================================================
// ESLint Flat Config (React + Vite + Aliases)
// - Includes React, Hooks, Refresh, A11y, Import hygiene
// - Resolves Vite aliases for eslint-plugin-import
// - DX rules for consistency and safety
// ============================================================================

import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import a11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
import { FlatCompat } from '@eslint/eslintrc'
import { defineConfig, globalIgnores } from 'eslint/config'
import { fileURLToPath } from 'node:url'

// ----------------------------------------------------------------------------
// Compat shim (for legacy shareable configs)
// ----------------------------------------------------------------------------
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })

const legacy = compat
  .extends(
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  )
  .map(cfg => ({
    ...cfg,
    files: ['**/*.{js,jsx}'],
    ignores: ['vite.config.*', 'eslint.config.*', 'dev-utils/**'],
  }))

// ----------------------------------------------------------------------------
// Main export
// ----------------------------------------------------------------------------
export default defineConfig([
  // Global ignores
  globalIgnores([
    'dist',
    'build',
    'coverage',
    'node_modules',
    '.vite',
    '.vercel',
    'stats.html',
    '**/*.d.ts', // ignore ambient TS declarations
  ]),

  // Report useless /* eslint-disable */
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },

  // Converted legacy layers
  ...legacy,

  // ---- App source rules -----------------------------------------------------
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['vite.config.*', 'eslint.config.*', 'dev-utils/**'],

    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },

    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': a11y,
      import: importPlugin,
    },

    extends: [js.configs.recommended, reactRefresh.configs.vite],

    rules: {
      // Vars / args hygiene
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^(?:[A-Z_]|set[A-Z])',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // ✅ Transition to ToastContext instead of legacy helpers
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: '@utils/ui-helpers',
              importNames: ['showToast'],
              message: 'Use ToastContext: const { showToast } = useToast().',
            },
            {
              name: '@utils/ui-helpers.js',
              importNames: ['showToast'],
              message: 'Use ToastContext: const { showToast } = useToast().',
            },
            {
              name: '../utils/ui-helpers',
              importNames: ['showToast'],
              message: 'Use ToastContext: const { showToast } = useToast().',
            },
            {
              name: '../../utils/ui-helpers',
              importNames: ['showToast'],
              message: 'Use ToastContext: const { showToast } = useToast().',
            },
            {
              name: '../../../utils/ui-helpers',
              importNames: ['showToast'],
              message: 'Use ToastContext: const { showToast } = useToast().',
            },
          ],
          patterns: [
            {
              group: ['**/utils/ui-helpers{,.*}'],
              importNames: ['showToast'],
              message: 'Use ToastContext: const { showToast } = useToast().',
            },
          ],
        },
      ],
      'no-restricted-globals': ['warn', 'showToast'],
      'no-restricted-properties': [
        'warn',
        {
          object: 'window',
          property: 'showToast',
          message: 'Use ToastContext: const { showToast } = useToast().',
        },
        {
          object: 'globalThis',
          property: 'showToast',
          message: 'Use ToastContext: const { showToast } = useToast().',
        },
      ],

      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',

      // Import hygiene
      'import/no-unresolved': ['error', { commonjs: true, caseSensitive: true }],
      'import/no-duplicates': 'warn',
      'import/newline-after-import': 'warn',
      'import/extensions': 'off', // allow explicit .jsx
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },

            { pattern: '@{,**/*}', group: 'internal', position: 'before' },
            { pattern: '@utils/**', group: 'internal', position: 'before' },
            { pattern: '@components/**', group: 'internal', position: 'before' },
            { pattern: '@styles/**', group: 'internal', position: 'before' },
            { pattern: '@pages/**', group: 'internal', position: 'before' },
            { pattern: '@assets/**', group: 'internal', position: 'before' },
            { pattern: '@shared/**', group: 'internal', position: 'before' },
            { pattern: '@navigation/**', group: 'internal', position: 'before' },
            { pattern: '@session/**', group: 'internal', position: 'before' },

            // Walkthrough system
            { pattern: '@walkthrough-data{,/**}', group: 'internal', position: 'before' },
            { pattern: '@walkthrough-defaults{,/**}', group: 'internal', position: 'before' },
            { pattern: '@walkthrough-loaders{,/**}', group: 'internal', position: 'before' },
            { pattern: '@walkthrough-utils{,/**}', group: 'internal', position: 'before' },
            { pattern: '@walkthrough-overlays{,/**}', group: 'internal', position: 'before' },

            // Roles
            { pattern: '@student{,/**}', group: 'internal', position: 'before' },
            { pattern: '@student-components{,/**}', group: 'internal', position: 'before' },
            { pattern: '@student-profile{,/**}', group: 'internal', position: 'before' },
            { pattern: '@student-profile-sections{,/**}', group: 'internal', position: 'before' },
            { pattern: '@student-profile-ui{,/**}', group: 'internal', position: 'before' },
            { pattern: '@student-walkthrough{,/**}', group: 'internal', position: 'before' },

            { pattern: '@instructor{,/**}', group: 'internal', position: 'before' },
            { pattern: '@admin-walkthroughs{,/**}', group: 'internal', position: 'before' },
            { pattern: '@admin{,/**}', group: 'internal', position: 'before' },
            { pattern: '@superadmin{,/**}', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'builtin', 'external'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // A11y
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/label-has-associated-control': 'error',

      // DX
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
    },

    // Alias resolver for eslint-plugin-import
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.json', '.css', '.d.ts'] },
        alias: {
          map: [
            ['@', './src'],

            ['@components', './src/components'],
            ['@utils', './src/utils'],
            ['@navigation', './src/navigation'],
            ['@pages', './src/pages'],
            ['@styles', './src/styles'],
            ['@assets', './src/assets'],
            ['@shared', './src/shared'],
            ['@session', './src/session'],

            ['@walkthrough-data', './src/walkthrough-data'],
            ['@walkthrough-defaults', './src/walkthrough-data/defaults'],
            ['@walkthrough-loaders', './src/walkthrough-data/loaders'],
            ['@walkthrough-utils', './src/walkthrough-data/utils'],
            ['@walkthrough-overlays', './src/walkthrough-data/overlays'],

            // Single overlay shortcuts
            ['@walkthrough-restriction-automatic', './src/walkthrough-data/overlays/restrictions/automatic.js'],
            ['@walkthrough-restriction-no-air', './src/walkthrough-data/overlays/restrictions/no-air.js'],
            ['@walkthrough-restriction-no-fifth-wheel', './src/walkthrough-data/overlays/restrictions/no-fifth-wheel.js'],

            // Roles
            ['@student', './src/student'],
            ['@student-components', './src/student/components'],
            ['@student-profile', './src/student/profile'],
            ['@student-profile-sections', './src/student/profile/sections'],
            ['@student-profile-ui', './src/student/profile/ui'],
            ['@student-walkthrough', './src/student/walkthrough'],

            ['@instructor', './src/instructor'],
            ['@admin', './src/admin'],
            ['@admin-walkthroughs', './src/admin/walkthroughs'],
            ['@superadmin', './src/superadmin'],
          ],
          extensions: ['.js', '.jsx', '.json', '.css'],
        },
      },
    },
  },

  // One-off overrides
  {
    files: ['src/components/toast-compat.js'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['src/**/*Router.jsx'],
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/utils/RequireRole.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Node/config/dev-utils
  {
    files: ['vite.config.*', 'eslint.config.*', 'dev-utils/**'],
    languageOptions: {
      ecmaVersion: 2022,
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