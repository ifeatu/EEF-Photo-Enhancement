import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../stores/auth'
import UploadView from '../views/UploadView.vue'
import DashboardView from '../views/DashboardView.vue'
import type { User } from '../services/api'

// Mock Vue Router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  currentRoute: {
    value: {
      path: '/upload',
      name: 'upload',
      params: {},
      query: {},
      meta: {}
    }
  }
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRouter.currentRoute.value
}))

// Mock axios
const mockAxiosInstance = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}))

// Mock file input and FormData
global.FormData = vi.fn(() => ({
  append: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
  values: vi.fn(),
  entries: vi.fn(),
  forEach: vi.fn()
})) as any

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('Free Tier E2E Tests', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Upload View Free Tier Integration', () => {
    it('should show free photos available for new user', async () => {
      // Mock new user with no free photos used
      const mockUser: User = {
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'New',
        lastName: 'User',
        credits: 0,
        freePhotosUsed: 0,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      const wrapper = mount(UploadView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Should show free photos available
      expect(wrapper.text()).toContain('2 free photo')
      expect(wrapper.text()).toContain('remaining')
      
      // Upload button should be enabled
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('disabled')).toBeUndefined()
    })

    it('should show one free photo remaining after using one', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 0,
        freePhotosUsed: 1,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      const wrapper = mount(UploadView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Should show 1 free photo remaining
      expect(wrapper.text()).toContain('1 free photo')
      expect(wrapper.text()).toContain('remaining')
      
      // Upload button should still be enabled
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('disabled')).toBeUndefined()
    })

    it('should show credits required when free photos exhausted', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 0,
        freePhotosUsed: 2,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      const wrapper = mount(UploadView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Should show credits required message
      expect(wrapper.text()).toContain('free photos have been used')
      expect(wrapper.text()).toContain('credits are required')
      expect(wrapper.text()).toContain('Buy Credits')
      
      // Upload button should be disabled
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('disabled')).toBeDefined()
    })

    it('should show credits will be used when user has both credits and exhausted free photos', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 5,
        freePhotosUsed: 2,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      const wrapper = mount(UploadView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Should show that credits will be used
      expect(wrapper.text()).toContain('1 credit will be deducted')
      expect(wrapper.text()).toContain('5 credits remaining')
      
      // Upload button should be enabled
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('disabled')).toBeUndefined()
    })

    it('should prioritize free photos over credits when both available', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 10,
        freePhotosUsed: 1,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      const wrapper = mount(UploadView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Should show free photo will be used, not credits
      expect(wrapper.text()).toContain('free photo enhancement')
      expect(wrapper.text()).toContain('1 free photo remaining')
      
      // Upload button should be enabled
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Dashboard View Free Tier Integration', () => {
    it('should display free photos information for new user', async () => {
      const mockUser: User = {
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'New',
        lastName: 'User',
        credits: 0,
        freePhotosUsed: 0,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      const wrapper = mount(DashboardView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Should show free photos available
      expect(wrapper.text()).toContain('2 Free Photos')
      expect(wrapper.text()).toContain('remaining')
    })

    it('should display remaining free photos after using some', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 0,
        freePhotosUsed: 1,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      const wrapper = mount(DashboardView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Should show 1 free photo remaining
      expect(wrapper.text()).toContain('1 Free Photo')
      expect(wrapper.text()).toContain('remaining')
    })

    it('should not display free photos section when exhausted', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 5,
        freePhotosUsed: 2,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      const wrapper = mount(DashboardView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Should not show free photos section
      expect(wrapper.text()).not.toContain('Free Photo')
      // Should show credits instead
      expect(wrapper.text()).toContain('Available Credits')
      expect(wrapper.text()).toContain('5')
    })
  })

  describe('Free Tier User Flow Simulation', () => {
    it('should simulate complete free tier usage flow', async () => {
      // Start with new user
      let mockUser: User = {
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'New',
        lastName: 'User',
        credits: 0,
        freePhotosUsed: 0,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      // Test initial state
      expect(authStore.freePhotosUsed).toBe(0)
      expect(authStore.freePhotosRemaining).toBe(2)
      expect(authStore.hasFreePhotosAvailable).toBe(true)

      // Simulate first photo upload
      mockUser = { ...mockUser, freePhotosUsed: 1 }
      authStore.user = mockUser

      expect(authStore.freePhotosUsed).toBe(1)
      expect(authStore.freePhotosRemaining).toBe(1)
      expect(authStore.hasFreePhotosAvailable).toBe(true)

      // Simulate second photo upload
      mockUser = { ...mockUser, freePhotosUsed: 2 }
      authStore.user = mockUser

      expect(authStore.freePhotosUsed).toBe(2)
      expect(authStore.freePhotosRemaining).toBe(0)
      expect(authStore.hasFreePhotosAvailable).toBe(false)

      // Now user needs credits for further uploads
      const uploadWrapper = mount(UploadView, {
        global: {
          plugins: [createPinia()]
        }
      })

      expect(uploadWrapper.text()).toContain('free photos have been used')
      expect(uploadWrapper.text()).toContain('credits are required')
    })
  })
})