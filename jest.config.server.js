module.exports = {
  roots: ['<rootDir>/tests/server'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/server/**/*.test.js'],
  testTimeout: 30000,
  collectCoverage: false,
  transform: {},
  modulePathIgnorePatterns: ['<rootDir>/.build/', '<rootDir>/public/components/', '<rootDir>/react-tutorial/'],
};
