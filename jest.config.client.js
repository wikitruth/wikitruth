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
  collectCoverageFrom: [
    'client/src/services/**/*.{ts,tsx}',
    'client/src/hooks/**/*.{ts,tsx}',
    'client/src/utils/**/*.{ts,tsx}',
    'client/src/context/**/*.{ts,tsx}',
    'client/src/components/Auth/**/*.{ts,tsx}',
    'client/src/components/common/Button.tsx',
    'client/src/components/common/OptimizedImage.tsx',
    'client/src/pages/Auth/LoginPage.tsx',
    'client/src/pages/Admin/AdminDashboard.tsx',
    'client/src/pages/Admin/Users/UsersList.tsx',
    'client/src/providers/**/*.{ts,tsx}',
    '!client/src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      // Baseline aligned to current migrated surface; raise incrementally as coverage expands.
      statements: 65,
      branches: 40,
      functions: 45,
      lines: 65,
    },
  },
  coverageDirectory: 'coverage/client',
  passWithNoTests: false,
};
