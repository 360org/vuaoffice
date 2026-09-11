// Repo-wide lint config (lint only — no formatter, so no whole-repo format diff).
// Rules are tuned so the current codebase passes cleanly; tighten incrementally.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/.build/**',
      '**/release/**',
      '**/target/**',
      '**/coverage/**',
      'scripts/drivers/**',
      'apps/*/build/**',
      'packages/*/src/vendor/**',
      // Browser-side extractor fragments are function-body slices (top-level
      // return), not modules; they are injected as raw text.
      'packages/html2docx/src/browser/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The codebase interoperates with untyped vendor APIs (Univer, pptxgenjs,
      // Electron IPC payloads); `any` at those boundaries is deliberate.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      // Empty catch = deliberate fail-open; other empty blocks still flagged.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // tsc already checks undefined identifiers with full type info; eslint's
    // no-undef false-positives on TS-only constructs.
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    // html2docx's generation layer is ported JS under @ts-nocheck until it is
    // typed file by file (packages/html2docx/README.md).
    files: ['packages/html2docx/src/generate.ts', 'packages/html2docx/src/generate/**/*.ts'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  {
    // Classic hooks rules only; the React-Compiler rule set (refs, purity,
    // immutability, …) is not adopted yet.
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Renderer code runs in the browser environment: the @genoffice/ai-provider
    // barrel re-exports chat/stream, which pull in the Node-backed
    // codex-app-server transport and break the bundle with
    // `"stat" is not exported by "__vite-browser-external"`. The /browser
    // subpath is the renderer-safe surface.
    files: ['apps/*/src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@genoffice/ai-provider',
              message:
                'Renderer code must import from @genoffice/ai-provider/browser — the barrel pulls in Node-only transports.',
            },
          ],
        },
      ],
    },
  },
  {
    // Plain JS build/tool scripts run in Node without type info.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
