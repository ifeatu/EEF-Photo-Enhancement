'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

interface User {
  id: string
  email: string
  credits: number
  subscriptionTier?: string | null
}

interface PricingPlansProps {
  currentUser: User
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const creditPackages = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    price: 9.99,
    description: 'Perfect for trying out our AI enhancement',
    features: [
      'High-quality AI processing',
      'Download enhanced photos',
      'Priority support',
      'Batch processing',
      'Instant processing',
      'No expiration',
      'Full resolution output'
    ]
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 50,
    price: 39.99,
    description: 'Great value for regular users',
    popular: true,
    features: [
      'High-quality AI processing',
      'Download enhanced photos',
      'Priority support',
      'Batch processing',
      'Instant processing',
      'No expiration',
      'Full resolution output'
    ]
  },
  {
    id: 'professional',
    name: 'Professional Pack',
    credits: 200,
    price: 149.99,
    description: 'For photographers and businesses',
    features: [
      'High-quality AI processing',
      'Download enhanced photos',
      'Priority support',
      'Batch processing',
      'Instant processing',
      'No expiration',
      'Full resolution output'
    ]
  }
]


export default function PricingPlans({ currentUser }: PricingPlansProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handlePurchase = async (planId: string) => {
    setLoading(planId)
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          type: 'credits',
          userId: currentUser.id
        }),
      })

      const { sessionId } = await response.json()
      
      const stripe = await stripePromise
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const PlanCard = ({ plan, isPopular = false }: { 
    plan: any; 
    isPopular?: boolean 
  }) => (
    <div className={`relative rounded-2xl border ${isPopular ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'} bg-white p-8 shadow-sm`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
        <p className="mt-2 text-gray-600">{plan.description}</p>
        
        {/* Emphasize Credits */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {plan.credits} Credits
          </div>
          <div className="text-sm text-gray-600">
            ${(plan.price / plan.credits).toFixed(2)} per enhancement
          </div>
        </div>
        
        <div className="mt-4">
          <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
        </div>
      </div>
      
      <ul className="mt-8 space-y-3">
        {plan.features.map((feature: string, index: number) => (
          <li key={index} className="flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      
      <button
        onClick={() => handlePurchase(plan.id)}
        disabled={loading === plan.id}
        className={`mt-8 w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
          isPopular
            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
            : 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400'
        }`}
      >
        {loading === plan.id ? 'Processing...' : `Get ${plan.name}`}
      </button>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Current Status */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Current Status</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Available Credits: <span className="font-semibold text-gray-900">{currentUser.credits >= 999999 ? 'Unlimited' : currentUser.credits}</span></p>
          </div>
        </div>
      </div>

      {/* Value Proposition */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All Plans Include Premium Features</h2>
          <p className="text-gray-600 mb-4">Every plan gives you the same high-quality AI enhancement technology. Choose based on how many photos you want to enhance.</p>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold text-gray-900">Starter Pack</div>
              <div className="text-blue-600 font-bold">${(9.99/10).toFixed(2)} per photo</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Popular Pack</div>
              <div className="text-green-600 font-bold">${(39.99/50).toFixed(2)} per photo</div>
              <div className="text-xs text-green-600">Save 20%</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Professional Pack</div>
              <div className="text-purple-600 font-bold">${(149.99/200).toFixed(2)} per photo</div>
              <div className="text-xs text-purple-600">Save 25%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {creditPackages.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isPopular={plan.popular}
          />
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">How do credits work?</h3>
            <p className="text-gray-600">Each photo enhancement uses 1 credit. Credits never expire and can be used anytime.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">What&apos;s the difference between plans?</h3>
            <p className="text-gray-600">All plans include the same premium features and AI quality. The only difference is the number of credits you receive - larger packs offer better value per enhancement.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Do credits expire?</h3>
            <p className="text-gray-600">No, purchased credits never expire and can be used anytime.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">How long does processing take?</h3>
            <p className="text-gray-600">Most photos are enhanced within 2-5 seconds. Processing is immediate after upload.</p>
          </div>
        </div>
      </div>
    </div>
  )
}