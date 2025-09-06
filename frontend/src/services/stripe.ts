import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5992/api'

export interface PaymentIntentResult {
  success: boolean
  paymentIntent?: any
  error?: string
}

export interface CreatePaymentIntentData {
  creditPackageId: number
  paymentMethodId: string
}

export interface StorageInfo {
  storageUsed: number
  storageLimit: number
  storageAvailable: number
  usagePercentage: number
  photoCount: number
  expiredPhotoCount: number
  lastCleanup?: string
}

class StripeService {
  private stripe: Stripe | null = null

  async initialize(): Promise<Stripe | null> {
    if (!this.stripe) {
      this.stripe = await stripePromise
    }
    return this.stripe
  }

  async createPaymentMethod(cardElement: any): Promise<{ paymentMethod?: any; error?: any }> {
    const stripe = await this.initialize()
    if (!stripe) {
      return { error: { message: 'Stripe failed to initialize' } }
    }

    return await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    })
  }

  async confirmPayment(clientSecret: string, paymentMethodId: string): Promise<PaymentIntentResult> {
    const stripe = await this.initialize()
    if (!stripe) {
      return { success: false, error: 'Stripe failed to initialize' }
    }

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId,
      })

      if (result.error) {
        return { success: false, error: result.error.message }
      }

      return { success: true, paymentIntent: result.paymentIntent }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async processPaymentWithStorageCheck(clientSecret: string, paymentMethodId: string): Promise<PaymentIntentResult> {
    try {
      // Check storage before processing payment
      const storageInfo = await this.getStorageInfo()
      if (storageInfo && storageInfo.usagePercentage > 95) {
        return { 
          success: false, 
          error: 'Storage almost full. Please clean up expired photos before purchasing more credits.' 
        }
      }

      return await this.confirmPayment(clientSecret, paymentMethodId)
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async getStorageInfo(): Promise<StorageInfo | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/photos/storage/info`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch storage info')
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Error fetching storage info:', error)
      return null
    }
  }

  async createCardElement(): Promise<any> {
    const stripe = await this.initialize()
    if (!stripe) {
      throw new Error('Stripe failed to initialize')
    }

    const elements = stripe.elements({
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#ffffff',
          colorText: '#1f2937',
          colorDanger: '#ef4444',
          fontFamily: 'Inter, system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '8px',
        },
      },
    })

    return elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#1f2937',
          '::placeholder': {
            color: '#9ca3af',
          },
        },
        invalid: {
          color: '#ef4444',
          iconColor: '#ef4444',
        },
      },
    })
  }
}

export const stripeService = new StripeService()
export default stripeService