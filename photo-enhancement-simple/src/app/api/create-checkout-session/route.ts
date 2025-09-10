import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
  apiVersion: '2025-08-27.basil',
})

const creditPackages = {
  starter: {
    name: 'Starter Pack',
    credits: 10,
    price: 999, // $9.99 in cents
  },
  popular: {
    name: 'Popular Pack', 
    credits: 50,
    price: 3999, // $39.99 in cents
  },
  professional: {
    name: 'Professional Pack',
    credits: 200,
    price: 14999, // $149.99 in cents
  }
}

const subscriptionTiers = {
  basic: {
    name: 'Basic Subscription',
    monthlyCredits: 25,
    price: 1999, // $19.99 in cents
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID?.trim(),
  },
  pro: {
    name: 'Pro Subscription',
    monthlyCredits: 100,
    price: 6999, // $69.99 in cents
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID?.trim(),
  },
  enterprise: {
    name: 'Enterprise',
    monthlyCredits: 500,
    price: 19999, // $199.99 in cents
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID?.trim(),
  }
}

export const POST = withAuth(async (request: NextRequest, user) => {
  try {

    const { planId, type } = await request.json()

    if (!planId || !type) {
      return NextResponse.json({ error: 'Missing planId or type' }, { status: 400 })
    }

    let sessionConfig: Stripe.Checkout.SessionCreateParams

    if (type === 'credits') {
      const plan = creditPackages[planId as keyof typeof creditPackages]
      if (!plan) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }

      sessionConfig = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: plan.name,
                description: `${plan.credits} photo enhancement credits`,
              },
              unit_amount: plan.price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL?.trim()}/dashboard?success=true&credits=${plan.credits}`,
        cancel_url: `${process.env.NEXTAUTH_URL?.trim()}/pricing?canceled=true`,
        metadata: {
          userId: user.id,
          type: 'credits',
          planId,
          credits: plan.credits.toString(),
        },
      }
    } else if (type === 'subscription') {
      const plan = subscriptionTiers[planId as keyof typeof subscriptionTiers]
      if (!plan || !plan.stripePriceId) {
        return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
      }

      sessionConfig = {
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXTAUTH_URL?.trim()}/dashboard?success=true&subscription=${planId}`,
        cancel_url: `${process.env.NEXTAUTH_URL?.trim()}/pricing?canceled=true`,
        metadata: {
          userId: user.id,
          type: 'subscription',
          planId,
          monthlyCredits: plan.monthlyCredits.toString(),
        },
      }
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})