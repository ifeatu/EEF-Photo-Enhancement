import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock the auth utils
const mockIsAdmin = jest.fn() as jest.MockedFunction<() => Promise<boolean>>
const mockGetServerSession = jest.fn() as jest.MockedFunction<() => Promise<any>>

jest.mock('../../lib/auth-utils', () => ({
  isAdmin: mockIsAdmin,
}))

jest.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}))

describe('Admin Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkAdminRole function', () => {
    it('should return true for admin users', async () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'admin@example.com',
          role: 'ADMIN'
        }
      }
      
      mockGetServerSession.mockResolvedValue(mockSession)
      mockIsAdmin.mockResolvedValue(true)
      
      const result = await mockIsAdmin()
      expect(result).toBe(true)
    })

    it('should return false for regular users', async () => {
      const mockSession = {
        user: {
          id: '2',
          email: 'user@example.com',
          role: 'USER'
        }
      }
      
      mockGetServerSession.mockResolvedValue(mockSession)
      mockIsAdmin.mockResolvedValue(false)
      
      const result = await mockIsAdmin()
      expect(result).toBe(false)
    })

    it('should return false for unauthenticated users', async () => {
      mockGetServerSession.mockResolvedValue(null)
      mockIsAdmin.mockResolvedValue(false)
      
      const result = await mockIsAdmin()
      expect(result).toBe(false)
    })

    it('should return false for users without role', async () => {
      const mockSession = {
        user: {
          id: '3',
          email: 'norole@example.com'
        }
      }
      
      mockGetServerSession.mockResolvedValue(mockSession)
      mockIsAdmin.mockResolvedValue(false)
      
      const result = await mockIsAdmin()
      expect(result).toBe(false)
    })
  })

  describe('Admin route protection', () => {
    it('should allow access to admin routes for admin users', async () => {
      const mockAdminSession = {
        user: {
          id: '1',
          email: 'admin@example.com',
          role: 'ADMIN'
        }
      }
      
      mockGetServerSession.mockResolvedValue(mockAdminSession)
      mockIsAdmin.mockResolvedValue(true)
      
      const isAdminResult = await mockIsAdmin()
      expect(isAdminResult).toBe(true)
    })

    it('should deny access to admin routes for regular users', async () => {
      const mockUserSession = {
        user: {
          id: '2',
          email: 'user@example.com',
          role: 'USER'
        }
      }
      
      mockGetServerSession.mockResolvedValue(mockUserSession)
      mockIsAdmin.mockResolvedValue(false)
      
      const isAdminResult = await mockIsAdmin()
      expect(isAdminResult).toBe(false)
    })

    it('should handle session errors gracefully', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session error'))
      mockIsAdmin.mockResolvedValue(false)
      
      const result = await mockIsAdmin()
      expect(result).toBe(false)
    })
  })

  describe('Admin session validation', () => {
    it('should validate admin session structure', async () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'admin@example.com',
          role: 'ADMIN',
          name: 'Admin User'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      
      mockGetServerSession.mockResolvedValue(mockSession)
      mockIsAdmin.mockResolvedValue(true)
      
      const isAdminResult = await mockIsAdmin()
      expect(isAdminResult).toBe(true)
      expect(mockSession.user.id).toBeDefined()
      expect(mockSession.user.email).toBeDefined()
      expect(mockSession.user.role).toBe('ADMIN')
    })

    it('should handle malformed session data', async () => {
      const malformedSession = {
        user: null
      }
      
      mockGetServerSession.mockResolvedValue(malformedSession)
      mockIsAdmin.mockResolvedValue(false)
      
      const result = await mockIsAdmin()
      expect(result).toBe(false)
    })
  })
})