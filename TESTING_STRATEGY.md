# Testing Strategy - Photo Enhancement Application

## 🧪 Testing Philosophy

**Comprehensive testing approach ensuring reliability, performance, and user experience across all application layers.**

### Testing Pyramid
```
     🔺 E2E Tests (10%)
       - Critical user journeys
       - Cross-browser compatibility
       - Production-like environments

    🔷 Integration Tests (20%)  
      - API endpoints
      - Database operations
      - External service integrations

  🟦 Unit Tests (70%)
    - Component logic
    - Service functions
    - Business logic
    - Edge cases
```

## 🏗️ Test Environment Setup

### Frontend Testing Stack
```json
{
  "testRunner": "Vitest",
  "testEnvironment": "jsdom", 
  "mocking": "vi.fn()",
  "coverage": "c8",
  "e2e": "Playwright",
  "visualRegression": "Playwright screenshots"
}
```

### Backend Testing Stack
```json
{
  "testRunner": "Jest/Mocha",
  "database": "SQLite :memory:",
  "mocking": "Sinon.js",
  "apiTesting": "Supertest",
  "fixtures": "Factory patterns"
}
```

### Test Environment Configuration
```bash
# Frontend test setup
cd frontend
npm install --save-dev vitest @vitest/ui jsdom @vue/test-utils

# Backend test setup  
cd backend
npm install --save-dev jest supertest @strapi/strapi

# E2E testing setup
npm install --save-dev playwright @playwright/test
npx playwright install
```

## 🎯 Unit Testing Strategy

### Frontend Unit Tests

#### Component Testing
```typescript
// src/test/components/PhotoCard.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PhotoCard from '@/components/PhotoCard.vue'

describe('PhotoCard Component', () => {
  it('displays photo information correctly', () => {
    const photo = {
      id: 1,
      originalImage: { url: '/test.jpg', name: 'test.jpg' },
      status: 'completed',
      enhancementType: 'enhance'
    }
    
    const wrapper = mount(PhotoCard, { props: { photo } })
    
    expect(wrapper.text()).toContain('test.jpg')
    expect(wrapper.find('[data-testid="status"]').text()).toBe('Completed')
  })

  it('emits delete event when delete button clicked', async () => {
    const wrapper = mount(PhotoCard, { 
      props: { photo: mockPhoto } 
    })
    
    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })
})
```

#### Store Testing (Pinia)
```typescript
// src/test/stores/photos.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePhotosStore } from '@/stores/photos'

describe('Photos Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches photos successfully', async () => {
    const store = usePhotosStore()
    const mockPhotos = [{ id: 1, status: 'completed' }]
    
    vi.mocked(photosAPI.getPhotos).mockResolvedValue(mockPhotos)
    
    await store.fetchPhotos()
    
    expect(store.photos).toEqual(mockPhotos)
    expect(store.loading).toBe(false)
  })

  it('handles fetch error gracefully', async () => {
    const store = usePhotosStore()
    const error = new Error('API Error')
    
    vi.mocked(photosAPI.getPhotos).mockRejectedValue(error)
    
    await store.fetchPhotos()
    
    expect(store.error).toBe('Failed to fetch photos')
    expect(store.loading).toBe(false)
  })
})
```

#### Service Layer Testing
```typescript
// src/test/services/api.test.ts
import { describe, it, expect, vi } from 'vitest'
import { photosAPI } from '@/services/api'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('Photos API', () => {
  it('uploads photo with correct headers', async () => {
    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg'))
    
    const mockResponse = { data: { id: 1, status: 'pending' } }
    mockedAxios.post.mockResolvedValue(mockResponse)
    
    const result = await photosAPI.uploadPhoto(formData)
    
    expect(mockedAxios.post).toHaveBeenCalledWith('/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    expect(result).toEqual(mockResponse.data)
  })
})
```

### Backend Unit Tests

#### Controller Testing
```javascript
// backend/tests/api/photo/controllers/photo.test.js
const request = require('supertest')
const { setupStrapi, cleanupStrapi } = require('../../../helpers/strapi')

describe('Photo Controller', () => {
  let strapi
  let user
  let jwt

  beforeAll(async () => {
    strapi = await setupStrapi()
    user = await strapi.plugins['users-permissions'].services.user.add({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmed: true,
    })
    jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id })
  })

  afterAll(async () => {
    await cleanupStrapi(strapi)
  })

  describe('POST /api/photos', () => {
    it('uploads photo successfully', async () => {
      const response = await request(strapi.server.httpServer)
        .post('/api/photos')
        .set('Authorization', `Bearer ${jwt}`)
        .attach('files.originalImage', './tests/fixtures/test-image.jpg')
        .field('data', JSON.stringify({ enhancementType: 'enhance' }))
        .expect(200)

      expect(response.body.data.attributes.status).toBe('pending')
      expect(response.body.data.attributes.originalImage).toBeDefined()
    })

    it('requires authentication', async () => {
      await request(strapi.server.httpServer)
        .post('/api/photos')
        .attach('files.originalImage', './tests/fixtures/test-image.jpg')
        .expect(401)
    })
  })

  describe('POST /api/photos/:id/enhance', () => {
    let photo

    beforeEach(async () => {
      photo = await strapi.entityService.create('api::photo.photo', {
        data: {
          user: user.id,
          status: 'pending',
          enhancementType: 'enhance'
        }
      })
    })

    it('enhances photo successfully', async () => {
      const response = await request(strapi.server.httpServer)
        .post(`/api/photos/${photo.id}/enhance`)
        .set('Authorization', `Bearer ${jwt}`)
        .expect(200)

      expect(response.body.data.attributes.status).toBe('processing')
    })

    it('prevents enhancement of already processed photos', async () => {
      await strapi.entityService.update('api::photo.photo', photo.id, {
        data: { status: 'completed' }
      })

      await request(strapi.server.httpServer)
        .post(`/api/photos/${photo.id}/enhance`)
        .set('Authorization', `Bearer ${jwt}`)
        .expect(400)
    })
  })
})
```

#### Service Testing
```javascript
// backend/tests/api/photo/services/photo.test.js
const { setupStrapi, cleanupStrapi } = require('../../../helpers/strapi')

describe('Photo Service', () => {
  let strapi

  beforeAll(async () => {
    strapi = await setupStrapi()
  })

  afterAll(async () => {
    await cleanupStrapi(strapi)
  })

  describe('enhancePhoto', () => {
    it('processes photo enhancement', async () => {
      const mockPhoto = {
        id: 1,
        originalImage: { url: '/uploads/test.jpg' },
        status: 'pending'
      }

      const service = strapi.service('api::photo.photo')
      const result = await service.enhancePhoto(mockPhoto.id)

      expect(result.status).toBe('processing')
    })

    it('validates photo enhancement limits', async () => {
      const user = { id: 1, credits: 0, freePhotosUsed: 2 }
      
      const service = strapi.service('api::photo.photo')
      
      await expect(
        service.validateEnhancementLimits(user, 'enhance')
      ).rejects.toThrow('Insufficient credits')
    })
  })
})
```

## 🔗 Integration Testing

### API Integration Tests
```javascript
// tests/integration/photo-workflow.test.js
const request = require('supertest')
const fs = require('fs')
const path = require('path')

describe('Photo Enhancement Workflow', () => {
  let app
  let user
  let token

  beforeAll(async () => {
    app = await setupTestApp()
    user = await createTestUser()
    token = await authenticateUser(user)
  })

  it('completes full photo enhancement workflow', async () => {
    // 1. Upload photo
    const uploadResponse = await request(app)
      .post('/api/photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('files.originalImage', path.join(__dirname, 'fixtures/test-photo.jpg'))
      .field('data', JSON.stringify({ enhancementType: 'enhance' }))
      .expect(200)

    const photoId = uploadResponse.body.data.id

    // 2. Start enhancement
    await request(app)
      .post(`/api/photos/${photoId}/enhance`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    // 3. Poll for completion (with timeout)
    let completed = false
    let attempts = 0
    const maxAttempts = 10

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const statusResponse = await request(app)
        .get(`/api/photos/${photoId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      const status = statusResponse.body.data.attributes.status
      
      if (status === 'completed') {
        completed = true
        expect(statusResponse.body.data.attributes.enhancedImage).toBeDefined()
      } else if (status === 'failed') {
        throw new Error('Photo enhancement failed')
      }
      
      attempts++
    }

    expect(completed).toBe(true)
  })

  it('enforces free tier limits', async () => {
    // Upload 2 free photos (should succeed)
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post('/api/photos')
        .set('Authorization', `Bearer ${token}`)
        .attach('files.originalImage', path.join(__dirname, 'fixtures/test-photo.jpg'))
        .expect(200)
    }

    // Third photo should fail
    await request(app)
      .post('/api/photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('files.originalImage', path.join(__dirname, 'fixtures/test-photo.jpg'))
      .expect(400)
  })
})
```

### Database Integration Tests
```javascript
// tests/integration/database.test.js
describe('Database Operations', () => {
  it('maintains data consistency during photo operations', async () => {
    const user = await createTestUser({ credits: 10 })
    const photo = await createTestPhoto({ user: user.id, status: 'pending' })

    // Start enhancement
    await strapi.service('api::photo.photo').enhancePhoto(photo.id)

    // Verify user credits decreased
    const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id)
    expect(updatedUser.credits).toBe(9)

    // Verify photo status changed
    const updatedPhoto = await strapi.entityService.findOne('api::photo.photo', photo.id)
    expect(updatedPhoto.status).toBe('processing')
  })

  it('handles concurrent photo uploads correctly', async () => {
    const user = await createTestUser({ credits: 5 })
    
    // Simulate concurrent uploads
    const uploadPromises = Array.from({ length: 3 }, () =>
      strapi.service('api::photo.photo').create({
        user: user.id,
        enhancementType: 'enhance'
      })
    )

    const results = await Promise.all(uploadPromises)
    expect(results).toHaveLength(3)

    // Verify user credits are correctly decremented
    const finalUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id)
    expect(finalUser.credits).toBe(2)
  })
})
```

## 🎭 End-to-End Testing

### E2E Test Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8240',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox', 
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 8240
  }
})
```

### Critical User Journey Tests
```typescript
// e2e/photo-enhancement.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Photo Enhancement Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-btn"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('uploads and enhances photo successfully', async ({ page }) => {
    // Navigate to upload page
    await page.click('[data-testid="upload-nav"]')
    await expect(page).toHaveURL('/upload')

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./e2e/fixtures/test-photo.jpg')
    
    await page.selectOption('[data-testid="enhancement-type"]', 'enhance')
    await page.click('[data-testid="upload-btn"]')

    // Wait for upload confirmation
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
    
    // Navigate to photos page
    await page.click('[data-testid="photos-nav"]')
    
    // Verify photo appears in list
    await expect(page.locator('[data-testid="photo-card"]').first()).toBeVisible()
    
    // Start enhancement
    await page.click('[data-testid="enhance-btn"]')
    
    // Wait for processing to complete (with timeout)
    await expect(page.locator('[data-testid="status-completed"]')).toBeVisible({ timeout: 30000 })
    
    // Verify enhanced image is available
    const enhancedImage = page.locator('[data-testid="enhanced-image"]')
    await expect(enhancedImage).toBeVisible()
    await expect(enhancedImage).toHaveAttribute('src', /enhanced/)
  })

  test('handles free tier limits', async ({ page }) => {
    // Upload maximum free photos
    for (let i = 0; i < 2; i++) {
      await page.goto('/upload')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles('./e2e/fixtures/test-photo.jpg')
      await page.click('[data-testid="upload-btn"]')
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
    }

    // Attempt third upload (should show limit message)
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./e2e/fixtures/test-photo.jpg')
    await page.click('[data-testid="upload-btn"]')
    
    await expect(page.locator('[data-testid="free-limit-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible()
  })
})
```

### Performance Testing
```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(3000) // 3 seconds max
  })

  test('photo upload performance', async ({ page }) => {
    await page.goto('/upload')
    
    // Measure upload time for 1MB image
    const startTime = Date.now()
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./e2e/fixtures/large-photo.jpg') // 1MB test file
    await page.click('[data-testid="upload-btn"]')
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
    const uploadTime = Date.now() - startTime

    expect(uploadTime).toBeLessThan(10000) // 10 seconds max for 1MB
  })
})
```

## 🔄 Test Automation Pipeline

### Continuous Testing Setup
```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd backend && npm ci
      
      - name: Run frontend tests
        run: cd frontend && npm run test:run
      
      - name: Run backend tests  
        run: cd backend && npm test
      
      - name: Generate coverage
        run: cd frontend && npm run coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Setup test environment
        run: |
          cp backend/.env.example backend/.env.test
          npm run setup:test
      
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start services
        run: |
          docker-compose up -d
          npm run wait-for-services
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Data Management
```javascript
// tests/helpers/fixtures.js
const { faker } = require('@faker-js/faker')

class TestDataFactory {
  static createUser(overrides = {}) {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'password123',
      confirmed: true,
      blocked: false,
      credits: 10,
      freePhotosUsed: 0,
      storageUsed: 0,
      storageLimit: 2000000000, // 2GB
      ...overrides
    }
  }

  static createPhoto(overrides = {}) {
    return {
      status: 'pending',
      enhancementType: 'enhance',
      originalFileSize: faker.number.int({ min: 100000, max: 5000000 }),
      processingStarted: null,
      processingCompleted: null,
      isExpired: false,
      ...overrides
    }
  }

  static createCreditPackage(overrides = {}) {
    return {
      name: faker.commerce.productName(),
      credits: faker.number.int({ min: 10, max: 500 }),
      price: faker.number.float({ min: 9.99, max: 149.99, precision: 0.01 }),
      description: faker.commerce.productDescription(),
      isActive: true,
      features: [faker.word.words(), faker.word.words()],
      sortOrder: faker.number.int({ min: 1, max: 10 }),
      ...overrides
    }
  }
}

module.exports = TestDataFactory
```

## 📊 Test Metrics and Reporting

### Coverage Requirements
```json
{
  "coverage": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  },
  "coverageReporters": ["text", "html", "lcov"],
  "collectCoverageFrom": [
    "src/**/*.{js,ts,vue}",
    "!src/test/**",
    "!src/**/*.d.ts"
  ]
}
```

### Performance Benchmarks
- **Unit Tests**: < 5 seconds total runtime
- **Integration Tests**: < 30 seconds total runtime  
- **E2E Tests**: < 5 minutes total runtime
- **Page Load**: < 3 seconds (3G network)
- **Photo Upload**: < 10 seconds (1MB file)
- **Enhancement Process**: < 60 seconds (standard photo)

### Test Reporting Dashboard
```javascript
// tests/reporters/dashboard.js
class TestDashboard {
  static generateReport(results) {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.numTotalTests,
        passed: results.numPassedTests,
        failed: results.numFailedTests,
        coverage: results.coverageMap.getCoverageSummary()
      },
      performance: {
        avgTestTime: results.totalTime / results.numTotalTests,
        slowestTests: results.testResults
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
      },
      flaky: results.flakyTests || []
    }
  }
}
```

## 🚀 Running Tests

### Development Testing
```bash
# Run all frontend tests in watch mode
cd frontend && npm run test:watch

# Run specific test file
cd frontend && npx vitest src/test/components/PhotoCard.test.ts

# Run tests with coverage
cd frontend && npm run coverage

# Run backend tests
cd backend && npm test

# Run integration tests
npm run test:integration

# Run E2E tests (requires services running)
docker-compose up -d
npm run test:e2e
```

### CI/CD Testing
```bash
# Full test suite (CI)
npm run test:ci

# Performance testing
npm run test:performance

# Security testing
npm run test:security

# Load testing
npm run test:load
```

### Test Debugging
```bash
# Debug frontend tests
cd frontend && npx vitest --inspect-brk src/test/api.test.ts

# Debug E2E tests
npx playwright test --debug photo-enhancement.spec.ts

# View test reports
npx playwright show-report
open frontend/coverage/index.html
```

---

**Quality Gates:**
- All tests must pass before merge
- Coverage must be ≥80% for statements/lines
- Performance tests must meet benchmarks  
- E2E tests must pass on all target browsers
- No critical security vulnerabilities in dependencies