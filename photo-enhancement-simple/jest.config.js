const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'jest-environment-node',
      testMatch: ['<rootDir>/src/app/api/**/*.test.{js,ts}', '<rootDir>/src/__tests__/api/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\.ts$': ['ts-jest', {
          useESM: true
        }]
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@auth/prisma-adapter$': '<rootDir>/src/__mocks__/@auth/prisma-adapter.js',
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)