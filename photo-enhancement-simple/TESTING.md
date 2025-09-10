# Testing Guide for Photo Enhancement Application

This document provides comprehensive information about testing the photo enhancement application, including unit tests, integration tests, and end-to-end tests.

## Test Structure

Our testing strategy follows a three-tier approach:

```
src/
├── __tests__/
│   ├── api/
│   │   └── photos/
│   │       └── upload.test.ts          # Unit tests for upload API
│   ├── integration/
│   │   └── upload.integration.test.ts   # Integration tests for upload flow
│   ├── e2e/
│   │   └── upload.e2e.test.ts          # End-to-end tests for upload UI
│   └── fixtures/
│       ├── test-image.jpg              # Test image file
│       └── test-file.txt               # Test text file for validation
```

## Test Types

### 1. Unit Tests
**Purpose**: Test individual functions and API endpoints in isolation
**Location**: `src/__tests__/api/`
**Framework**: Jest

**Coverage**:
- API endpoint functionality
- Authentication checks
- Credit validation
- File processing logic
- Error handling

### 2. Integration Tests
**Purpose**: Test component interactions and API integrations
**Location**: `src/__tests__/integration/`
**Framework**: Jest + React Testing Library

**Coverage**:
- Upload component behavior
- API response handling
- User interaction flows
- State management

### 3. End-to-End Tests
**Purpose**: Test complete user workflows in a real browser
**Location**: `src/__tests__/e2e/`
**Framework**: Playwright

**Coverage**:
- File selection and upload
- Drag and drop functionality
- Error handling in UI
- Loading states
- Success/failure feedback

## Running Tests

### Quick Start

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run upload-specific tests
npm run test:upload
```

### Detailed Commands

#### Unit Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- upload.test.ts
```

#### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm test -- --testPathPattern=integration
```

#### End-to-End Tests
```bash
# Start development server first
npm run dev

# In another terminal, run E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific E2E test
npx playwright test upload.e2e.test.ts
```

## Test Configuration

### Jest Configuration
- **Config file**: `jest.config.js`
- **Setup file**: `jest.setup.js`
- **Environment**: jsdom for React component testing
- **Coverage threshold**: 30% (configurable)

### Playwright Configuration
- **Config file**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:3001
- **Auto-start dev server**: Yes

## Test Data and Fixtures

### Test Files
- `test-image.jpg`: Valid image file for upload testing
- `test-file.txt`: Invalid file type for validation testing

### Mock Data
- User sessions (authenticated/unauthenticated)
- API responses (success/error)
- File system operations
- Database operations

## Upload Functionality Tests

The upload functionality is comprehensively tested across all three test types:

### Unit Tests (`upload.test.ts`)
- ✅ Authentication validation
- ✅ Credit checking
- ✅ File validation
- ✅ Local storage fallback
- ✅ Error handling
- ✅ Database operations

### Integration Tests (`upload.integration.test.ts`)
- ✅ API endpoint behavior
- ✅ Request/response handling
- ✅ Error scenarios
- ✅ Credit validation
- ✅ File system interactions

### E2E Tests (`upload.e2e.test.ts`)
- ✅ File selection via button
- ✅ Drag and drop upload
- ✅ File type validation
- ✅ Upload progress indication
- ✅ Success/error feedback
- ✅ Loading states
- ✅ Insufficient credits handling

## Debugging Tests

### Jest Tests
```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Tests
```bash
# Run with headed browser (visible)
npx playwright test --headed

# Run with debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Continuous Integration

For CI/CD pipelines, use:

```bash
# Install dependencies
npm ci

# Run linting
npm run lint

# Run unit and integration tests
npm run test:coverage

# Install Playwright browsers (for E2E)
npx playwright install

# Run E2E tests
npm run test:e2e
```

## Test Coverage

Current coverage targets:
- **Lines**: 30%
- **Functions**: 30%
- **Branches**: 30%
- **Statements**: 30%

To view detailed coverage:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Writing New Tests

### Unit Test Template
```typescript
import { handler } from '@/app/api/your-endpoint/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')

describe('/api/your-endpoint', () => {
  it('should handle valid request', async () => {
    // Arrange
    const mockSession = { user: { id: 'test-id' } }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    
    // Act
    const response = await handler(new Request('http://localhost/api/your-endpoint'))
    
    // Assert
    expect(response.status).toBe(200)
  })
})
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should perform action', async ({ page }) => {
    await page.goto('/your-page')
    await expect(page.getByText('Expected Text')).toBeVisible()
  })
})
```

## Troubleshooting

### Common Issues

1. **E2E tests failing**: Ensure dev server is running on port 3000
2. **Mock issues**: Check jest.setup.js for proper mocking
3. **File upload tests**: Verify test fixtures exist in `__tests__/fixtures/`
4. **Database tests**: Ensure test database is properly mocked

### Getting Help

- Check test logs for detailed error messages
- Use `--verbose` flag for more detailed output
- Review mock configurations in `jest.setup.js`
- Verify environment variables are set correctly

## Security Considerations

- Tests use mock data and don't expose real credentials
- File uploads are tested with safe, controlled test files
- API tests validate authentication and authorization
- No sensitive information is logged during testing