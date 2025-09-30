module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  collectCoverageFrom: [
    'app/**/*.js',
    'app/**/*.jsx',
    'app/**/*.ts',
    'app/**/*.tsx',
    '!app/**/_*.ts', // Exclude server actions
    '!app/**/_*.js',
  ],
  setupFilesAfterEnv: [],
  testTimeout: 30000, // 30 seconds for Puppeteer tests
};
