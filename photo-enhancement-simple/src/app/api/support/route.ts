import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Support request interface
interface SupportRequest {
  name: string
  email: string
  issueType: string
  subject: string
  message: string
  photoUrl?: string
  userId?: string
}

// Issue type labels for email formatting
const ISSUE_TYPE_LABELS: Record<string, string> = {
  billing: 'Billing/Reimbursements',
  tech: 'Tech Support',
  comments: 'Comments & Feedback',
  account: 'Account Issues',
  'photo-stuck': 'Photo Processing Issues',
  other: 'Other'
}

export async function POST(request: NextRequest) {
  try {
    const data: SupportRequest = await request.json()

    // Validate required fields
    if (!data.name || !data.email || !data.issueType || !data.subject || !data.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Log the support request
    logger.info('Support request received', {
      issueType: data.issueType,
      subject: data.subject,
      userId: data.userId,
      hasPhotoUrl: !!data.photoUrl
    })

    // Format email content
    const issueTypeLabel = ISSUE_TYPE_LABELS[data.issueType] || data.issueType
    
    const emailSubject = `[PhotoEnhance Support] ${issueTypeLabel}: ${data.subject}`
    
    const emailBody = `
New support request received:

From: ${data.name} <${data.email}>
Issue Type: ${issueTypeLabel}
Subject: ${data.subject}
${data.userId ? `User ID: ${data.userId}` : ''}
${data.photoUrl ? `Photo URL: ${data.photoUrl}` : ''}

Message:
${data.message}

---
Submitted at: ${new Date().toISOString()}
IP Address: ${request.headers.get('x-forwarded-for') || 'Unknown'}
User Agent: ${request.headers.get('user-agent') || 'Unknown'}
`

    // In a production environment, you would integrate with an email service
    // For now, we'll log the email content and simulate sending
    
    console.log('=== SUPPORT EMAIL ===')
    console.log('To:', 'contact@platinumeagle.io')
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    console.log('===================')

    // Log structured data for monitoring
    logger.info('Support email would be sent', {
      to: 'contact@platinumeagle.io',
      subject: emailSubject,
      issueType: data.issueType,
      fromUser: data.email,
      userId: data.userId
    })

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // Example with SendGrid:
    /*
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      
      const msg = {
        to: 'contact@platinumeagle.io',
        from: 'noreply@photoenhance.dev',
        replyTo: data.email,
        subject: emailSubject,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>')
      }
      
      await sgMail.send(msg)
    }
    */

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: 'Support request submitted successfully'
    })

  } catch (error: any) {
    logger.error('Support request failed', {
      error: error.message,
      stack: error.stack
    })

    console.error('Support API error:', error)

    return NextResponse.json(
      { 
        error: 'Failed to submit support request',
        message: 'Please try again or email us directly at contact@platinumeagle.io'
      },
      { status: 500 }
    )
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}