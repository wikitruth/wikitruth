module.exports = {
  roots: ['<rootDir>/tests/server'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/server/**/*.test.js'],
  testTimeout: 30000,
  collectCoverage: false,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.server.json', isolatedModules: true }],
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  modulePathIgnorePatterns: ['<rootDir>/.build/', '<rootDir>/public/components/', '<rootDir>/react-tutorial/'],
};
