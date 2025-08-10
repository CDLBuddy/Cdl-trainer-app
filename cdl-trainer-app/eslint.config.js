// eslint.config.js — flat config with compat + Vite alias resolver
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import a11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
import { FlatCompat } from '@eslint/eslintrc'
import { defineConfig, globalIgnores } from 'eslint/config'

// Convert legacy shareable configs to flat & scope them to app sources
const compat = new FlatCompat({ baseDirectory: import.meta.dirname })
const legacy = compat
  .extends(
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended'
  )
  .map(cfg => ({
    ...cfg,
    files: ['**/*.{js,jsx}'],
    ignores: ['vite.config.*', 'eslint.config.*', 'dev-utils/**'],
  }))

export default defineConfig([
  // Global ignores
  globalIgnores(['dist', 'build', 'coverage', 'node_modules', '.vite', '.vercel']),

  // Report stray /* eslint-disable */ that no longer suppress anything
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },

  // Apply converted legacy layers first
  ...legacy,

  // App sources (overrides & additions)
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['vite.config.*', 'eslint.config.*', 'dev-utils/**'],

    languageOptions: {
      ecmaVersion: 2022, // allows top-level await in ESM
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },

    // bring react-refresh rules via extends (don’t add the plugin again)
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': a11y,
      import: importPlugin,
    },
    extends: [js.configs.recommended, reactRefresh.configs.vite],

    rules: {
      // Bridge mode helper
      'no-unused-vars': [
        'warn',
        {
          // allow BRIDGE_CONST & setState setters; ignore underscored args/catches
          varsIgnorePattern: '^(?:[A-Z_]|set[A-Z])',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // 🔒 Disallow only the legacy toast forms (OK with useToast())
      'no-restricted-imports': ['warn', {
        paths: [
          { name: '@utils/ui-helpers', importNames: ['showToast'], message: 'Use ToastContext: const { showToast } = useToast().' },
          { name: '@utils/ui-helpers.js', importNames: ['showToast'], message: 'Use ToastContext: const { showToast } = useToast().' },
          // common relatives, just in case
          { name: '../utils/ui-helpers', importNames: ['showToast'], message: 'Use ToastContext: const { showToast } = useToast().' },
          { name: '../../utils/ui-helpers', importNames: ['showToast'], message: 'Use ToastContext: const { showToast } = useToast().' },
          { name: '../../../utils/ui-helpers', importNames: ['showToast'], message: 'Use ToastContext: const { showToast } = useToast().' },
        ],
        patterns: [
          { group: ['**/utils/ui-helpers{,.*}'], importNames: ['showToast'], message: 'Use ToastContext: const { showToast } = useToast().' },
        ],
      }],
      'no-restricted-globals': ['warn', 'showToast'],
      'no-restricted-properties': [
        'warn',
        { object: 'window',      property: 'showToast', message: 'Use ToastContext: const { showToast } = useToast().' },
        { object: 'globalThis',  property: 'showToast', message: 'Use ToastContext: const { showToast } = useToast().' },
      ],

      // React tweaks
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',

      // Import hygiene
      'import/no-unresolved': ['error', { commonjs: true, caseSensitive: true }],
      'import/no-duplicates': 'warn',
      'import/newline-after-import': 'warn',
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
          // keep aliases grouped neatly at the top of "internal"
          pathGroups: [
            { pattern: '@{,**/*}', group: 'internal', position: 'before' },
            { pattern: '@utils/**', group: 'internal', position: 'before' },
            { pattern: '@components/**', group: 'internal', position: 'before' },
            { pattern: '@styles/**', group: 'internal', position: 'before' },
            { pattern: '@pages/**', group: 'internal', position: 'before' },
            { pattern: '@student/**', group: 'internal', position: 'before' },
            { pattern: '@instructor/**', group: 'internal', position: 'before' },
            { pattern: '@admin/**', group: 'internal', position: 'before' },
            { pattern: '@superadmin/**', group: 'internal', position: 'before' },
            { pattern: '@navigation/**', group: 'internal', position: 'before' },
            { pattern: '@walkthrough/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'external'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // A11y (keep these as errors so we actually fix them)
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/label-has-associated-control': 'error',

      // DX niceties
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
    },

    // ESLint/IntelliSense resolver for Vite aliases
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.json'] },
        alias: {
          map: [
            ['@', './src'],
            ['@utils', './src/utils'],
            ['@components', './src/components'],
            ['@styles', './src/styles'],
            ['@pages', './src/pages'],
            ['@student', './src/student'],
            ['@instructor', './src/instructor'],
            ['@admin', './src/admin'],
            ['@superadmin', './src/superadmin'],
            ['@navigation', './src/navigation'],
            ['@walkthrough', './src/walkthrough-data'],
          ],
          extensions: ['.js', '.jsx', '.json', '.css'],
        },
      },
    },
  },

  // Allow the compat shim to touch the global without warnings
  {
    files: ['src/components/toast-compat.js'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },

  // One-off override: mixes helpers + components; relax fast-refresh guard
  {
    files: ['src/utils/RequireRole.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Node/config/utility scripts (non-React)
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
