import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PricingPlans from '../PricingPlans'
import { useSession } from 'next-auth/react'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    redirectToCheckout: jest.fn(),
    createPaymentMethod: jest.fn()
  }))
}))

const mockUser = {
  id: '1',
  email: 'test@example.com',
  credits: 10,
  subscriptionTier: null
}

describe('Stripe Integration', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated'
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize Stripe without errors', async () => {
    // This test verifies that the component renders without throwing
    // Stripe initialization errors
    expect(() => {
      render(<PricingPlans currentUser={mockUser} />)
    }).not.toThrow()
  })

  it('should render pricing plans', () => {
    render(<PricingPlans currentUser={mockUser} />)
    
    // Check for credit packages (default view)
    expect(screen.getByText('Starter Pack')).toBeInTheDocument()
    expect(screen.getByText('Popular Pack')).toBeInTheDocument()
    expect(screen.getByText('Professional Pack')).toBeInTheDocument()
    
    // Check for plan type toggle buttons
    expect(screen.getByText('One-time Credits')).toBeInTheDocument()
    expect(screen.getByText('Monthly Subscription')).toBeInTheDocument()
  })

  it('should handle missing Stripe environment variables gracefully', () => {
    // Even if Stripe fails to initialize, the component should still render
    const originalEnv = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    
    expect(() => {
      render(<PricingPlans currentUser={mockUser} />)
    }).not.toThrow()
    
    // Restore environment variable
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalEnv
  })
})