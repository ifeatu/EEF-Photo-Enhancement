import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { StorageInfo, PaymentIntentResult } from '../services/stripe'

// Mock @stripe/stripe-js
const mockStripe = vi.hoisted(() => ({
  createPaymentMethod: vi.fn(),
  confirmCardPayment: vi.fn(),
  elements: vi.fn(() => ({
    create: vi.fn(() => ({
      mount: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn()
    }))
  }))
}))

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(mockStripe))
}))

import { stripeService } from '../services/stripe'

// Mock fetch
global.fetch = vi.fn()

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

describe('StripeService Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue('mock-jwt-token')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initialize', () => {
    it('should initialize Stripe successfully', async () => {
      const stripe = await stripeService.initialize()
      expect(stripe).toBe(mockStripe)
    })

    it('should return cached Stripe instance on subsequent calls', async () => {
      const stripe1 = await stripeService.initialize()
      const stripe2 = await stripeService.initialize()
      expect(stripe1).toBe(stripe2)
      expect(stripe1).toBe(mockStripe)
    })
  })

  describe('createPaymentMethod', () => {
    it('should create payment method successfully', async () => {
      const mockCardElement = { type: 'card' }
      const mockPaymentMethod = {
        id: 'pm_123',
        type: 'card'
      }
      
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: mockPaymentMethod,
        error: null
      })
      
      const result = await stripeService.createPaymentMethod(mockCardElement)
      
      expect(mockStripe.createPaymentMethod).toHaveBeenCalledWith({
        type: 'card',
        card: mockCardElement
      })
      expect(result.paymentMethod).toEqual(mockPaymentMethod)
      expect(result.error).toBeNull()
    })

    it('should handle payment method creation error', async () => {
      const mockCardElement = { type: 'card' }
      const mockError = { message: 'Invalid card number' }
      
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: null,
        error: mockError
      })
      
      const result = await stripeService.createPaymentMethod(mockCardElement)
      
      expect(result.paymentMethod).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('should create payment method with valid card element', async () => {
      const mockCardElement = { type: 'card' }
      const mockPaymentMethod = {
        id: 'pm_456',
        type: 'card'
      }
      
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: mockPaymentMethod,
        error: null
      })
      
      const result = await stripeService.createPaymentMethod(mockCardElement)
      
      expect(result.paymentMethod).toEqual(mockPaymentMethod)
      expect(result.error).toBeNull()
    })
  })

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const clientSecret = 'pi_123_secret'
      const paymentMethodId = 'pm_123'
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded'
      }
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent,
        error: null
      })
      
      const result = await stripeService.confirmPayment(clientSecret, paymentMethodId)
      
      expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(clientSecret, {
        payment_method: paymentMethodId
      })
      expect(result.success).toBe(true)
      expect(result.paymentIntent).toEqual(mockPaymentIntent)
      expect(result.error).toBeUndefined()
    })

    it('should handle payment confirmation error', async () => {
      const clientSecret = 'pi_123_secret'
      const paymentMethodId = 'pm_123'
      const mockError = { message: 'Your card was declined' }
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: null,
        error: mockError
      })
      
      const result = await stripeService.confirmPayment(clientSecret, paymentMethodId)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError.message)
      expect(result.paymentIntent).toBeUndefined()
    })

    it('should handle exception during payment confirmation', async () => {
      const clientSecret = 'pi_123_secret'
      const paymentMethodId = 'pm_123'
      
      mockStripe.confirmCardPayment.mockRejectedValue(new Error('Network error'))
      
      const result = await stripeService.confirmPayment(clientSecret, paymentMethodId)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getStorageInfo', () => {
    it('should fetch storage info successfully', async () => {
      const mockStorageInfo: StorageInfo = {
        storageUsed: 1024,
        storageLimit: 10240,
        storageAvailable: 9216,
        usagePercentage: 10,
        photoCount: 5,
        expiredPhotoCount: 2,
        lastCleanup: '2024-01-01T00:00:00Z'
      }
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockStorageInfo })
      }
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      const result = await stripeService.getStorageInfo()
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5992/photos/storage/info',
        {
          headers: {
            'Authorization': 'Bearer mock-jwt-token',
            'Content-Type': 'application/json'
          }
        }
      )
      expect(result).toEqual(mockStorageInfo)
    })

    it('should handle fetch error', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      }
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      const result = await stripeService.getStorageInfo()
      
      expect(result).toBeNull()
    })

    it('should handle network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
      
      const result = await stripeService.getStorageInfo()
      
      expect(result).toBeNull()
    })

    it('should handle missing JWT token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const mockStorageInfo: StorageInfo = {
        storageUsed: 1024,
        storageLimit: 10240,
        storageAvailable: 9216,
        usagePercentage: 10,
        photoCount: 5,
        expiredPhotoCount: 2
      }
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockStorageInfo })
      }
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      await stripeService.getStorageInfo()
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5992/photos/storage/info',
        {
          headers: {
            'Authorization': 'Bearer null',
            'Content-Type': 'application/json'
          }
        }
      )
    })
  })

  describe('processPaymentWithStorageCheck', () => {
    it('should process payment when storage is available', async () => {
      const clientSecret = 'pi_123_secret'
      const paymentMethodId = 'pm_123'
      
      const mockStorageInfo: StorageInfo = {
        storageUsed: 1024,
        storageLimit: 10240,
        storageAvailable: 9216,
        usagePercentage: 10,
        photoCount: 5,
        expiredPhotoCount: 2
      }
      
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded'
      }
      
      // Mock storage info fetch
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockStorageInfo })
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      // Mock payment confirmation
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent,
        error: null
      })
      
      const result = await stripeService.processPaymentWithStorageCheck(clientSecret, paymentMethodId)
      
      expect(result.success).toBe(true)
      expect(result.paymentIntent).toEqual(mockPaymentIntent)
    })

    it('should reject payment when storage is almost full', async () => {
      const clientSecret = 'pi_123_secret'
      const paymentMethodId = 'pm_123'
      
      const mockStorageInfo: StorageInfo = {
        storageUsed: 9728,
        storageLimit: 10240,
        storageAvailable: 512,
        usagePercentage: 95.1,
        photoCount: 50,
        expiredPhotoCount: 10
      }
      
      // Mock storage info fetch
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockStorageInfo })
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      const result = await stripeService.processPaymentWithStorageCheck(clientSecret, paymentMethodId)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage almost full. Please clean up expired photos before purchasing more credits.')
      expect(mockStripe.confirmCardPayment).not.toHaveBeenCalled()
    })

    it('should handle storage check error and proceed with payment', async () => {
      const clientSecret = 'pi_123_secret'
      const paymentMethodId = 'pm_123'
      
      // Mock storage info fetch failure
      vi.mocked(fetch).mockRejectedValue(new Error('Storage check failed'))
      
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded'
      }
      
      // Mock payment confirmation
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent,
        error: null
      })
      
      const result = await stripeService.processPaymentWithStorageCheck(clientSecret, paymentMethodId)
      
      expect(result.success).toBe(true)
      expect(result.paymentIntent).toEqual(mockPaymentIntent)
    })
  })

  describe('createCardElement', () => {
    it('should create card element with proper styling', async () => {
      const mockCardElement = { mount: vi.fn(), destroy: vi.fn() }
      const mockElements = {
        create: vi.fn().mockReturnValue(mockCardElement)
      }
      
      mockStripe.elements.mockReturnValue(mockElements)
      
      const result = await stripeService.createCardElement()
      
      expect(mockStripe.elements).toHaveBeenCalledWith({
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#3b82f6',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px'
          }
        }
      })
      
      expect(mockElements.create).toHaveBeenCalledWith('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1f2937',
            '::placeholder': {
              color: '#9ca3af'
            }
          },
          invalid: {
            color: '#ef4444',
            iconColor: '#ef4444'
          }
        }
      })
      
      expect(result).toBe(mockCardElement)
    })

    it('should create card element successfully', async () => {
      const cardElement = await stripeService.createCardElement()
      
      expect(cardElement).toBeDefined()
      expect(cardElement.mount).toBeDefined()
      expect(cardElement.on).toBeDefined()
      expect(cardElement.destroy).toBeDefined()
    })
  })
})