/**
 * Unit tests for auth-utils functions
 * Tests authentication and authorization utilities after recent fixes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { getServerSession } from 'next-auth/next'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))
jest.mock('../../lib/auth', () => ({
  authOptions: {
    session: { strategy: 'jwt' },
    callbacks: {
      session: jest.fn(),
      jwt: jest.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import {
  getCurrentUser,
  isAdmin,
  requireAdmin,
  requireAuth,
  hasCredits,
  type ExtendedSession
} from '../../lib/auth-utils'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Auth Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('should return extended session when user is authenticated', async () => {
      const mockSession = {
        user: {
          id: 'user1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          credits: 5
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(mockSession)

      const result = await getCurrentUser()

      expect(result).toEqual(mockSession)
      expect(mockGetServerSession).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should return null when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })

    it('should handle session without extended user properties', async () => {
      const basicSession = {
        user: {
          id: 'user1',
          email: 'test@example.com',
          name: 'Test User'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      mockGetServerSession.mockResolvedValue(basicSession)

      const result = await getCurrentUser()

      expect(result).toEqual(basicSession)
    })

    it('should handle getServerSession errors gracefully', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session error'))

      await expect(getCurrentUser()).rejects.toThrow('Session error')
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin users', async () => {
      const adminSession = {
        user: {
          id: 'admin1',
          email: 'admin@example.com',
          role: 'ADMIN',
          credits: 100
        }
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(adminSession)

      const result = await isAdmin()

      expect(result).toBe(true)
    })

    it('should return false for regular users', async () => {
      const userSession = {
        user: {
          id: 'user1',
          email: 'user@example.com',
          role: 'USER',
          credits: 5
        }
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(userSession)

      const result = await isAdmin()

      expect(result).toBe(false)
    })

    it('should return false when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const result = await isAdmin()

      expect(result).toBe(false)
    })

    it('should return false when user role is undefined', async () => {
      const sessionWithoutRole = {
        user: {
          id: 'user1',
          email: 'user@example.com',
          credits: 5
        }
      } as any

      mockGetServerSession.mockResolvedValue(sessionWithoutRole)

      const result = await isAdmin()

      expect(result).toBe(false)
    })
  })

  describe('requireAdmin', () => {
    it('should return session for admin users', async () => {
      const adminSession = {
        user: {
          id: 'admin1',
          email: 'admin@example.com',
          role: 'ADMIN',
          credits: 100
        }
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(adminSession)

      const result = await requireAdmin()

      expect(result).toEqual(adminSession)
    })

    it('should throw error for regular users', async () => {
      const userSession = {
        user: {
          id: 'user1',
          email: 'user@example.com',
          role: 'USER',
          credits: 5
        }
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(userSession)

      await expect(requireAdmin()).rejects.toThrow('Admin access required')
    })

    it('should throw error when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      await expect(requireAdmin()).rejects.toThrow('Authentication required')
    })

    it('should throw error when user role is undefined', async () => {
      const sessionWithoutRole = {
        user: {
          id: 'user1',
          email: 'user@example.com',
          credits: 5
        }
      } as any

      mockGetServerSession.mockResolvedValue(sessionWithoutRole)

      await expect(requireAdmin()).rejects.toThrow('Admin access required')
    })
  })

  describe('requireAuth', () => {
    it('should return session for authenticated users', async () => {
      const userSession = {
        user: {
          id: 'user1',
          email: 'user@example.com',
          role: 'USER',
          credits: 5
        }
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(userSession)

      const result = await requireAuth()

      expect(result).toEqual(userSession)
    })

    it('should return session for admin users', async () => {
      const adminSession = {
        user: {
          id: 'admin1',
          email: 'admin@example.com',
          role: 'ADMIN',
          credits: 100
        }
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(adminSession)

      const result = await requireAuth()

      expect(result).toEqual(adminSession)
    })

    it('should throw error when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      await expect(requireAuth()).rejects.toThrow('Authentication required')
    })

    it('should handle partial session data', async () => {
      const partialSession = {
        user: {
          id: 'user1',
          email: 'user@example.com'
        }
      } as any

      mockGetServerSession.mockResolvedValue(partialSession)

      const result = await requireAuth()

      expect(result).toEqual(partialSession)
    })
  })

  describe('hasCredits', () => {
    it('should return true when user has sufficient credits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        credits: 10
      } as any)

      const result = await hasCredits('user1', 5)

      expect(result).toBe(true)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: { credits: true }
      })
    })

    it('should return false when user has insufficient credits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        credits: 2
      } as any)

      const result = await hasCredits('user1', 5)

      expect(result).toBe(false)
    })

    it('should return true when user has exactly required credits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        credits: 5
      } as any)

      const result = await hasCredits('user1', 5)

      expect(result).toBe(true)
    })

    it('should default to requiring 1 credit when amount not specified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        credits: 3
      } as any)

      const result = await hasCredits('user1')

      expect(result).toBe(true)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: { credits: true }
      })
    })

    it('should return false when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await hasCredits('nonexistent', 1)

      expect(result).toBe(false)
    })

    it('should return false when user has zero credits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        credits: 0
      } as any)

      const result = await hasCredits('user1', 1)

      expect(result).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(hasCredits('user1', 1)).rejects.toThrow('Database error')
    })

    it('should handle negative credit requirements', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        credits: 5
      } as any)

      const result = await hasCredits('user1', -1)

      expect(result).toBe(true)
    })

    it('should handle large credit requirements', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        credits: 1000
      } as any)

      const result = await hasCredits('user1', 999)

      expect(result).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent authentication requests', async () => {
      const userSession = {
        user: {
          id: 'user1',
          email: 'user@example.com',
          role: 'USER',
          credits: 5
        }
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(userSession)

      // Simulate concurrent requests
      const promises = [
        getCurrentUser(),
        isAdmin(),
        requireAuth()
      ]

      const results = await Promise.all(promises)

      expect(results[0]).toEqual(userSession)
      expect(results[1]).toBe(false)
      expect(results[2]).toEqual(userSession)
    })

    it('should handle session timeout scenarios', async () => {
      const expiredSession = {
        user: {
          id: 'user1',
          email: 'user@example.com',
          role: 'USER',
          credits: 5
        },
        expires: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Expired
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(expiredSession)

      const result = await getCurrentUser()

      // Should still return the session (NextAuth handles expiry)
      expect(result).toEqual(expiredSession)
    })

    it('should handle malformed session data', async () => {
      const malformedSession = {
        user: null,
        expires: 'invalid-date'
      } as any

      mockGetServerSession.mockResolvedValue(malformedSession)

      await expect(requireAuth()).rejects.toThrow('Authentication required')
    })

    it('should handle database connection failures in hasCredits', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Connection timeout'))

      await expect(hasCredits('user1', 1)).rejects.toThrow('Connection timeout')
    })

    it('should handle race conditions in credit checking', async () => {
      // Simulate race condition where credits change between checks
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ credits: 5 } as any)
        .mockResolvedValueOnce({ credits: 0 } as any)

      const [result1, result2] = await Promise.all([
        hasCredits('user1', 3),
        hasCredits('user1', 3)
      ])

      expect(result1).toBe(true)
      expect(result2).toBe(false)
    })
  })

  describe('Integration with Auth System', () => {
    it('should work with real session structure from NextAuth', async () => {
      const realSession = {
        user: {
          id: 'user1',
          email: 'user@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          role: 'USER',
          credits: 10
        },
        expires: '2024-12-31T23:59:59.999Z'
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(realSession)

      const [currentUser, adminCheck, authCheck] = await Promise.all([
        getCurrentUser(),
        isAdmin(),
        requireAuth()
      ])

      expect(currentUser).toEqual(realSession)
      expect(adminCheck).toBe(false)
      expect(authCheck).toEqual(realSession)
    })

    it('should handle admin session correctly', async () => {
      const adminSession = {
        user: {
          id: 'admin1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          credits: 1000
        },
        expires: '2024-12-31T23:59:59.999Z'
      } as ExtendedSession

      mockGetServerSession.mockResolvedValue(adminSession)

      const [adminCheck, adminAuth] = await Promise.all([
        isAdmin(),
        requireAdmin()
      ])

      expect(adminCheck).toBe(true)
      expect(adminAuth).toEqual(adminSession)
    })

    it('should validate credit operations with real user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        email: 'user@example.com',
        credits: 15,
        role: 'USER'
      } as any)

      const [hasOne, hasFive, hasTwenty] = await Promise.all([
        hasCredits('user1', 1),
        hasCredits('user1', 5),
        hasCredits('user1', 20)
      ])

      expect(hasOne).toBe(true)
      expect(hasFive).toBe(true)
      expect(hasTwenty).toBe(false)
    })
  })
})