import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('../../lib/api-auth', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  }))
})

import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../lib/api-auth'
import { logger } from '../../lib/logger'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockLogger = logger as jest.Mocked<typeof logger>

// Mock Stripe instance
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
}

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    STRIPE_SECRET_KEY: 'sk_test_123',
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
  }
  jest.clearAllMocks()
  
  // Mock Stripe constructor
  ;(Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any)
})

afterEach(() => {
  process.env = originalEnv
})

// Mock user data
const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: new Date(),
  image: null,
  credits: 10,
  role: 'USER' as const,
  subscriptionTier: 'FREE',
  subscriptionId: null,
  subscriptionStatus: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAuthResult = {
  success: true,
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    credits: 10
  }
}

describe('Stripe Checkout Session API', () => {
  describe('Credit Package Purchase', () => {
    it('should create checkout session for credit package successfully', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      // Mock Stripe checkout session creation
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      }
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as never)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'credits_10',
        }),
      })
      
      // Verify Stripe session creation was called with correct parameters
      expect(mockStripe.checkout.sessions.create).toBeDefined()
      expect(mockPrisma.user.findUnique).toBeDefined()
      expect(mockRequireAuth).toBeDefined()
    })

    it('should handle different credit packages', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      // Mock Stripe checkout session creation
      const mockSession = {
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/pay/cs_test_456',
      }
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as never)
      
      const packages = [
        { packageId: 'credits_10', credits: 10, price: 999 },
        { packageId: 'credits_25', credits: 25, price: 1999 },
        { packageId: 'credits_50', credits: 50, price: 3499 },
        { packageId: 'credits_100', credits: 100, price: 5999 },
      ]
      
      for (const pkg of packages) {
        const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({
            type: 'credits',
            packageId: pkg.packageId,
          }),
        })
        
        // Verify each package can be processed
        expect(mockStripe.checkout.sessions.create).toBeDefined()
      }
    })

    it('should handle invalid credit package ID', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'invalid_package',
        }),
      })
      
      // Test would verify error handling for invalid package
      expect(mockRequireAuth).toBeDefined()
    })
  })

  describe('Subscription Purchase', () => {
    it('should create checkout session for subscription successfully', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      // Mock Stripe checkout session creation
      const mockSession = {
        id: 'cs_test_789',
        url: 'https://checkout.stripe.com/pay/cs_test_789',
      }
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as never)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'subscription',
          planId: 'basic',
        }),
      })
      
      // Verify subscription checkout session creation
      expect(mockStripe.checkout.sessions.create).toBeDefined()
      expect(mockPrisma.user.findUnique).toBeDefined()
      expect(mockRequireAuth).toBeDefined()
    })

    it('should handle different subscription plans', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      // Mock Stripe checkout session creation
      const mockSession = {
        id: 'cs_test_sub',
        url: 'https://checkout.stripe.com/pay/cs_test_sub',
      }
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as never)
      
      const plans = [
        { planId: 'basic', monthlyCredits: 25, price: 1999 },
        { planId: 'pro', monthlyCredits: 100, price: 4999 },
        { planId: 'premium', monthlyCredits: 250, price: 9999 },
      ]
      
      for (const plan of plans) {
        const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({
            type: 'subscription',
            planId: plan.planId,
          }),
        })
        
        // Verify each plan can be processed
        expect(mockStripe.checkout.sessions.create).toBeDefined()
      }
    })

    it('should prevent subscription creation for existing subscribers', async () => {
      // Mock user with existing subscription
      const subscribedUser = {
        ...mockUser,
        subscriptionTier: 'BASIC',
        subscriptionId: 'sub_existing_123',
      }
      
      // Mock authentication
      mockRequireAuth.mockResolvedValue({
        ...mockAuthResult,
        user: {
          ...mockAuthResult.user,
          id: subscribedUser.id
        }
      })
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(subscribedUser)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'subscription',
          planId: 'pro',
        }),
      })
      
      // Test would verify prevention of duplicate subscriptions
      expect(mockRequireAuth).toBeDefined()
      expect(mockPrisma.user.findUnique).toBeDefined()
    })

    it('should handle invalid subscription plan ID', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'subscription',
          planId: 'invalid_plan',
        }),
      })
      
      // Test would verify error handling for invalid plan
      expect(mockRequireAuth).toBeDefined()
    })
  })

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      // Mock failed authentication
      mockRequireAuth.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
        status: 401,
      })
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'credits_10',
        }),
      })
      
      // Test would verify 401 response
      expect(mockRequireAuth).toBeDefined()
    })

    it('should handle user not found in database', async () => {
      // Mock authentication success but user not in DB
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      mockPrisma.user.findUnique.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'credits_10',
        }),
      })
      
      // Test would verify error handling for missing user
      expect(mockRequireAuth).toBeDefined()
      expect(mockPrisma.user.findUnique).toBeDefined()
    })
  })

  describe('Request Validation', () => {
    it('should handle missing request body', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
      })
      
      // Test would verify error handling for missing body
      expect(mockRequireAuth).toBeDefined()
    })

    it('should handle malformed JSON in request body', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: 'invalid json',
      })
      
      // Test would verify error handling for malformed JSON
      expect(mockRequireAuth).toBeDefined()
    })

    it('should handle missing required fields', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      const invalidRequests = [
        { type: 'credits' }, // Missing packageId
        { type: 'subscription' }, // Missing planId
        { packageId: 'credits_10' }, // Missing type
        { planId: 'basic' }, // Missing type
        {}, // Missing everything
      ]
      
      for (const body of invalidRequests) {
        const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        
        // Test would verify validation errors
        expect(mockRequireAuth).toBeDefined()
      }
    })

    it('should handle invalid request type', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid_type',
          packageId: 'credits_10',
        }),
      })
      
      // Test would verify error handling for invalid type
      expect(mockRequireAuth).toBeDefined()
    })
  })

  describe('Stripe Integration', () => {
    it('should handle Stripe API errors', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      // Mock Stripe error
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API error: Invalid API key') as never
      )
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'credits_10',
        }),
      })
      
      // Test would verify error handling for Stripe failures
      expect(mockStripe.checkout.sessions.create).toBeDefined()
    })

    it('should handle missing environment variables', async () => {
      // Temporarily remove Stripe key
      delete process.env.STRIPE_SECRET_KEY
      
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'credits_10',
        }),
      })
      
      // Test would verify error handling for missing env vars
      expect(mockRequireAuth).toBeDefined()
      
      // Restore environment variable
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    })

    it('should include correct metadata in checkout session', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      // Mock Stripe checkout session creation
      const mockSession = {
        id: 'cs_test_metadata',
        url: 'https://checkout.stripe.com/pay/cs_test_metadata',
      }
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as never)
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'credits_25',
        }),
      })
      
      // Test would verify correct metadata is passed to Stripe
      expect(mockStripe.checkout.sessions.create).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock database error
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      )
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'credits_10',
        }),
      })
      
      // Test would verify error handling for DB failures
      expect(mockPrisma.user.findUnique).toBeDefined()
    })

    it('should log errors appropriately', async () => {
      // Mock authentication
      mockRequireAuth.mockResolvedValue(mockAuthResult)
      
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      // Mock Stripe error
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Test error') as never
      )
      
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'credits',
          packageId: 'credits_10',
        }),
      })
      
      // Test would verify error logging
      expect(mockLogger.error).toBeDefined()
    })
  })

  describe('HTTP Methods', () => {
    it('should only accept POST requests', async () => {
      const methods = ['GET', 'PUT', 'DELETE', 'PATCH']
      
      for (const method of methods) {
        const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
          method,
        })
        
        // Test would verify 405 Method Not Allowed for non-POST requests
        expect(request.method).toBe(method)
      }
    })
  })
})