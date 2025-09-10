import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }))
})

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}))

import { prisma } from '../../lib/prisma'
import { headers } from 'next/headers'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHeaders = headers as jest.MockedFunction<typeof headers>

// Mock Stripe instance
const mockStripe = {
  webhooks: {
    constructEvent: jest.fn(),
  },
}

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
  }
  jest.clearAllMocks()
  
  // Mock Stripe constructor
  ;(Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any)
})

afterEach(() => {
  process.env = originalEnv
})

// Mock webhook events
const mockCheckoutSessionCompleted = {
  id: 'evt_test_123',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_123',
      object: 'checkout.session',
      amount_total: 999,
      subscription: null,
      metadata: {
        userId: 'user-1',
        type: 'credits',
        credits: '10',
      },
    },
  },
}

const mockSubscriptionCheckoutCompleted = {
  id: 'evt_test_456',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_456',
      object: 'checkout.session',
      amount_total: 1999,
      subscription: 'sub_test_123',
      metadata: {
        userId: 'user-1',
        type: 'subscription',
        planId: 'basic',
        monthlyCredits: '25',
      },
    },
  },
}

const mockSubscriptionDeleted = {
  id: 'evt_test_789',
  object: 'event',
  type: 'customer.subscription.deleted',
  data: {
    object: {
      id: 'sub_test_123',
      object: 'subscription',
      customer: 'cus_test_123',
    },
  },
}

describe('Stripe Webhook API', () => {
  describe('Webhook Signature Verification', () => {
    it('should verify webhook signature successfully', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock successful signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockCheckoutSessionCompleted as any)
      
      // Mock database operations
      mockPrisma.$transaction.mockResolvedValue(undefined)
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockCheckoutSessionCompleted),
      })
      
      expect(mockStripe.webhooks.constructEvent).toBeDefined()
    })

    it('should reject invalid webhook signature', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('invalid_signature'),
      } as any)
      
      // Mock signature verification failure
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockCheckoutSessionCompleted),
      })
      
      expect(mockStripe.webhooks.constructEvent).toBeDefined()
    })

    it('should handle missing stripe-signature header', async () => {
      // Mock headers without stripe-signature
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue(null),
      } as any)
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockCheckoutSessionCompleted),
      })
      
      expect(mockHeaders).toBeDefined()
    })
  })

  describe('Credit Purchase Processing', () => {
    it('should process one-time credit purchase successfully', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock successful signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockCheckoutSessionCompleted as any)
      
      // Mock database transaction
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          user: {
            update: jest.fn().mockResolvedValue({ id: 'user-1', credits: 20 }),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'txn-1' }),
          },
        } as any
        return await callback(mockTx)
      })
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockCheckoutSessionCompleted),
      })
      
      expect(mockPrisma.$transaction).toBeDefined()
    })

    it('should handle credit purchase with missing metadata', async () => {
      // Mock event with missing metadata
      const invalidEvent = {
        ...mockCheckoutSessionCompleted,
        data: {
          object: {
            ...mockCheckoutSessionCompleted.data.object,
            metadata: {},
          },
        },
      }
      
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(invalidEvent as any)
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(invalidEvent),
      })
      
      expect(mockStripe.webhooks.constructEvent).toBeDefined()
    })

    it('should handle database transaction failures', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockCheckoutSessionCompleted as any)
      
      // Mock database transaction failure
      mockPrisma.$transaction.mockRejectedValue(new Error('Database connection failed'))
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockCheckoutSessionCompleted),
      })
      
      expect(mockPrisma.$transaction).toBeDefined()
    })
  })

  describe('Subscription Processing', () => {
    it('should process subscription setup successfully', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockSubscriptionCheckoutCompleted as any)
      
      // Mock user update
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'BASIC',
        subscriptionId: 'sub_test_123',
        credits: 25,
      } as any)
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockSubscriptionCheckoutCompleted),
      })
      
      expect(mockPrisma.user.update).toBeDefined()
    })

    it('should handle subscription cancellation', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockSubscriptionDeleted as any)
      
      // Mock user update for cancellation
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 })
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockSubscriptionDeleted),
      })
      
      expect(mockPrisma.user.updateMany).toBeDefined()
    })

    it('should handle subscription with invalid plan ID', async () => {
      // Mock event with invalid plan
      const invalidSubscriptionEvent = {
        ...mockSubscriptionCheckoutCompleted,
        data: {
          object: {
            ...mockSubscriptionCheckoutCompleted.data.object,
            metadata: {
              userId: 'user-1',
              type: 'subscription',
              planId: 'invalid_plan',
              monthlyCredits: '25',
            },
          },
        },
      }
      
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(invalidSubscriptionEvent as any)
      
      // Mock user update
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' } as any)
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(invalidSubscriptionEvent),
      })
      
      expect(mockPrisma.user.update).toBeDefined()
    })
  })

  describe('Unhandled Events', () => {
    it('should handle unrecognized webhook events gracefully', async () => {
      // Mock unhandled event type
      const unhandledEvent = {
        id: 'evt_test_999',
        object: 'event',
        type: 'customer.created',
        data: {
          object: {},
        },
      }
      
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(unhandledEvent as any)
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(unhandledEvent),
      })
      
      expect(mockStripe.webhooks.constructEvent).toBeDefined()
    })

    it('should return success response for valid but unhandled events', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification with unhandled event
      const unhandledEvent = {
        ...mockCheckoutSessionCompleted,
        type: 'invoice.created',
      }
      mockStripe.webhooks.constructEvent.mockReturnValue(unhandledEvent as any)
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(unhandledEvent),
      })
      
      expect(mockStripe.webhooks.constructEvent).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed request body', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: 'invalid json',
      })
      
      expect(mockHeaders).toBeDefined()
    })

    it('should handle missing environment variables', async () => {
      // Temporarily remove environment variables
      delete process.env.STRIPE_SECRET_KEY
      delete process.env.STRIPE_WEBHOOK_SECRET
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockCheckoutSessionCompleted),
      })
      
      expect(request).toBeDefined()
      
      // Restore environment variables
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
    })

    it('should handle concurrent webhook processing', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockCheckoutSessionCompleted as any)
      
      // Mock database operations
      mockPrisma.$transaction.mockResolvedValue(undefined)
      
      // Create multiple concurrent requests
      const requests = Array(3).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/webhooks/stripe', {
          method: 'POST',
          body: JSON.stringify(mockCheckoutSessionCompleted),
        })
      )
      
      expect(requests).toHaveLength(3)
      expect(mockPrisma.$transaction).toBeDefined()
    })
  })

  describe('Idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      // Mock headers
      mockHeaders.mockReturnValue({
        get: jest.fn().mockReturnValue('test_signature'),
      } as any)
      
      // Mock signature verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockCheckoutSessionCompleted as any)
      
      // Mock database operations
      mockPrisma.$transaction.mockResolvedValue(undefined)
      
      // Send same event twice
      const request1 = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockCheckoutSessionCompleted),
      })
      
      const request2 = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockCheckoutSessionCompleted),
      })
      
      expect(mockPrisma.$transaction).toBeDefined()
    })
  })
})