/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@easypay/shared(.*)$': '<rootDir>/../../packages/shared/src$1',
    '^@easypay/database(.*)$': '<rootDir>/../../packages/database/src$1',
  },
  // Transform ESM-only packages that end up in pnpm's virtual store
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/(@scure|@noble)|@scure|@noble))',
  ],
};
