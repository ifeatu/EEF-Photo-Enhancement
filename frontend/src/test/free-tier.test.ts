import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../stores/auth'
import type { User } from '../services/api'

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

describe('Free Tier Functionality Tests', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Free Photos Tracking', () => {
    it('should correctly calculate free photos remaining for new user', () => {
      // Mock user with no free photos used
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 0,
        freePhotosUsed: 0,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser

      expect(authStore.freePhotosUsed).toBe(0)
      expect(authStore.freePhotosRemaining).toBe(2)
      expect(authStore.hasFreePhotosAvailable).toBe(true)
    })

    it('should correctly calculate free photos remaining after using one', () => {
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

      expect(authStore.freePhotosUsed).toBe(1)
      expect(authStore.freePhotosRemaining).toBe(1)
      expect(authStore.hasFreePhotosAvailable).toBe(true)
    })

    it('should correctly handle exhausted free photos', () => {
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

      expect(authStore.freePhotosUsed).toBe(2)
      expect(authStore.freePhotosRemaining).toBe(0)
      expect(authStore.hasFreePhotosAvailable).toBe(false)
    })

    it('should handle missing freePhotosUsed field gracefully', () => {
      const mockUser: Partial<User> = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 0,
        // freePhotosUsed is missing
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser as User

      expect(authStore.freePhotosUsed).toBe(0)
      expect(authStore.freePhotosRemaining).toBe(2)
      expect(authStore.hasFreePhotosAvailable).toBe(true)
    })
  })

  describe('User Authentication with Free Tier', () => {
    it('should update user data including free photos after login', async () => {
      const mockLoginResponse = {
        data: {
          jwt: 'mock-jwt-token',
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            confirmed: true,
            blocked: false,
            firstName: 'Test',
            lastName: 'User',
            credits: 5,
            freePhotosUsed: 1,
            role: { id: 1, name: 'Authenticated', type: 'authenticated' }
          }
        }
      }

      mockAxiosInstance.post.mockResolvedValue(mockLoginResponse)
      mockLocalStorage.setItem.mockImplementation(() => {})

      await authStore.login({ identifier: 'testuser', password: 'password' })

      expect(authStore.user?.freePhotosUsed).toBe(1)
      expect(authStore.freePhotosRemaining).toBe(1)
      expect(authStore.hasFreePhotosAvailable).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'mock-jwt-token')
    })

    it('should handle registration with free tier initialization', async () => {
      const mockRegisterResponse = {
        data: {
          jwt: 'mock-jwt-token',
          user: {
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
        }
      }

      mockAxiosInstance.post.mockResolvedValue(mockRegisterResponse)
      mockLocalStorage.setItem.mockImplementation(() => {})

      await authStore.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password'
      })

      expect(authStore.user?.freePhotosUsed).toBe(0)
      expect(authStore.freePhotosRemaining).toBe(2)
      expect(authStore.hasFreePhotosAvailable).toBe(true)
    })
  })

  describe('Free Tier Edge Cases', () => {
    it('should handle user with credits and free photos available', () => {
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

      expect(authStore.freePhotosUsed).toBe(1)
      expect(authStore.freePhotosRemaining).toBe(1)
      expect(authStore.hasFreePhotosAvailable).toBe(true)
      expect(authStore.userCredits).toBe(10)
    })

    it('should handle user with credits but no free photos', () => {
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

      expect(authStore.freePhotosUsed).toBe(2)
      expect(authStore.freePhotosRemaining).toBe(0)
      expect(authStore.hasFreePhotosAvailable).toBe(false)
      expect(authStore.userCredits).toBe(5)
    })

    it('should handle user with no credits and no free photos', () => {
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

      expect(authStore.freePhotosUsed).toBe(2)
      expect(authStore.freePhotosRemaining).toBe(0)
      expect(authStore.hasFreePhotosAvailable).toBe(false)
      expect(authStore.userCredits).toBe(0)
    })
  })

  describe('User Update with Free Photos', () => {
    it('should update free photos count when user data is refreshed', async () => {
      // Set initial user
      const initialUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 0,
        freePhotosUsed: 0,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = initialUser
      expect(authStore.freePhotosUsed).toBe(0)

      // Mock updated user data
      const updatedUserResponse = {
        data: {
          ...initialUser,
          freePhotosUsed: 1
        }
      }

      mockAxiosInstance.get.mockResolvedValue(updatedUserResponse)
      mockLocalStorage.getItem.mockReturnValue('mock-jwt-token')

      await authStore.updateProfile({ freePhotosUsed: 1 })

      expect(authStore.user?.freePhotosUsed).toBe(1)
      expect(authStore.freePhotosRemaining).toBe(1)
      expect(authStore.hasFreePhotosAvailable).toBe(true)
    })
  })

  describe('Logout Behavior', () => {
    it('should clear free photos data on logout', () => {
      // Set user with free photos data
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        confirmed: true,
        blocked: false,
        firstName: 'Test',
        lastName: 'User',
        credits: 5,
        freePhotosUsed: 1,
        role: { id: 1, name: 'Authenticated', type: 'authenticated' }
      }

      authStore.user = mockUser
      expect(authStore.freePhotosUsed).toBe(1)

      // Logout
      authStore.logout()

      expect(authStore.user).toBeNull()
      expect(authStore.freePhotosUsed).toBe(0)
      expect(authStore.freePhotosRemaining).toBe(2)
      expect(authStore.hasFreePhotosAvailable).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken')
    })
  })
})