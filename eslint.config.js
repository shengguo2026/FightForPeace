import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const forbiddenMath = ['sin', 'cos', 'tan', 'pow', 'exp', 'log', 'sqrt', 'random'].map(
  (property) => ({
    object: 'Math',
    property,
    message: 'Non-deterministic or platform-dependent maths is forbidden in @ffp/sim. Use math/fixed.ts or math/rng.ts.',
  }),
);

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-types/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'packages/sim/test/fixtures/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['apps/game/src/**/*.{ts,tsx}', 'apps/game/e2e/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    // Determinism rules: the simulation core must produce identical results on every
    // browser and machine, so it may not use floating-point transcendental functions,
    // unseeded randomness or wall-clock time.
    files: ['packages/sim/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error', ...forbiddenMath],
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'Wall-clock time is forbidden in @ffp/sim.' },
        { name: 'performance', message: 'Wall-clock time is forbidden in @ffp/sim.' },
      ],
    },
  },
);
