import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Folders to ignore globally
  globalIgnores(['dist', 'build', 'coverage', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // your existing rule
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],

      // ⚠️ Bridge-mode migration helper:
      // Warn when new code calls the legacy global showToast(...)
      // Prefer: const { showToast } = useToast()
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.name='showToast']",
          message:
            "Use ToastContext: `const { showToast } = useToast()` instead of the legacy global. (Bridge mode still works for old pages.)",
        },
      ],
    },
  },
])