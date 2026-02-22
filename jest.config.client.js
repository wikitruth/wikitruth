module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/client'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/client/src/test-utils/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/client/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/client/src/test-utils/styleMock.ts',
    '\\.(gif|ttf|eot|svg|png|jpe?g|webp)$': '<rootDir>/client/src/test-utils/fileMock.ts',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['client/src/**/*.{ts,tsx}', '!client/src/**/*.d.ts'],
  coverageDirectory: 'coverage/client',
  passWithNoTests: false,
};
