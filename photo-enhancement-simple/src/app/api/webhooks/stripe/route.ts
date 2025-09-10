import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
  apiVersion: '2025-08-27.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!.trim()

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      // case 'invoice.payment_succeeded':
      //   await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
      //   break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { userId, type, planId, credits, monthlyCredits } = session.metadata!
  
  if (!userId) {
    console.error('No userId in session metadata')
    return
  }

  if (type === 'credits') {
    // One-time credit purchase
    const creditsToAdd = parseInt(credits!)
    const amountPaid = session.amount_total! / 100 // Convert from cents
    
    await prisma.$transaction(async (tx: any) => {
      // Add credits to user
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: creditsToAdd
          }
        }
      })
      
      // Record transaction
      await tx.transaction.create({
        data: {
          userId,
          creditsPurchased: creditsToAdd,
          amountPaid,
          status: 'COMPLETED',
          stripeSessionId: session.id
        }
      })
    })
    
    console.log(`Added ${creditsToAdd} credits to user ${userId}`)
  } else if (type === 'subscription') {
    // Subscription setup
    const monthlyCreditsAmount = parseInt(monthlyCredits!)
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: planId.toUpperCase(),
        subscriptionId: session.subscription as string,
        credits: {
          increment: monthlyCreditsAmount // Add first month's credits
        }
      }
    })
    
    console.log(`Set up ${planId} subscription for user ${userId}`)
  }
}

// async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
//   // Handle recurring subscription payments - will implement later
//   console.log('Invoice payment succeeded:', invoice.id)
// }

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Handle subscription cancellation
  await prisma.user.updateMany({
    where: { subscriptionId: subscription.id },
    data: {
      subscriptionTier: null,
      subscriptionId: null
    }
  })
  
  console.log(`Cancelled subscription ${subscription.id}`)
}