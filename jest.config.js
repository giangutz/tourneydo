/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  // Playwright specs (e2e/) and standalone perf scripts run under their own
  // runners, not Jest — keep them out of `npm test` so the unit/integration lane
  // stays green and fast.
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/scripts/performance/',
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.js',
  ],
  // NOTE: the key is `coverageThreshold` (singular). It was previously misspelled
  // `coverageThresholds`, so Jest ignored it and the gate never ran. Thresholds are
  // set at the current floor (~20%) so the gate actually enforces — preventing
  // regressions — and can be ratcheted up toward the 70% target in CLAUDE.md.
  coverageThreshold: {
    global: {
      branches: 13,
      functions: 14,
      lines: 19,
      statements: 19,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
