const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@auth/prisma-adapter$': '<rootDir>/src/__mocks__/@auth/prisma-adapter.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(next-auth|@auth/.*|jose|openid-client|oauth|oidc-token-hash|@panva)/)/',
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  globals: {
    'ts-jest': {
      useESM: true
    },
    TextDecoder: TextDecoder,
    TextEncoder: TextEncoder,
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: ['<rootDir>/src/**/*.test.{js,jsx,ts,tsx}'],
      testPathIgnorePatterns: ['<rootDir>/src/app/api/'],
    },
    {
      displayName: 'node',
      testEnvironment: 'jest-environment-node',
      testMatch: ['<rootDir>/src/app/api/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
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