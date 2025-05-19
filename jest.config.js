/**
 * Jest configuration enabling the `jest-puppeteer` preset while still
 * transforming our TypeScript sources through `ts-jest` in ESM mode.
 */

export default {
  // Use the preset shipped with `jest-puppeteer` – this wires up the
  // custom environment, global setup and teardown that expose the
  // `browser`, `page`, … helpers.
  preset: 'jest-puppeteer',

  // Transform our TypeScript sources through `ts-jest` in ESM mode.
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  extensionsToTreatAsEsm: ['.ts'],

  // Jest will try to resolve `../foo.ts` when a test imports
  // `../foo.js`. This makes the ESM / CommonJS interop painless.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Individual tests sometimes need more time when a real browser is
  // involved – raise the global timeout to 30 s so they do not fail
  // prematurely.
  testTimeout: 30_000,
};
