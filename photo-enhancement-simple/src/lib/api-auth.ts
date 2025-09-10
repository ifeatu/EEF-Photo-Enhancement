import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import type { Session } from 'next-auth'

/**
 * Standardized API authentication utilities
 * Use these functions consistently across all API routes
 */

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string | null
  role: string
  credits: number
}

export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  status?: number
}

/**
 * Standard authentication check for API routes
 * Returns user data if authenticated, error response if not
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions) as Session | null
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401
      }
    }

    // Get full user data with role and credits
    const userSession = await getCurrentUser()
    
    if (!userSession?.user) {
      return {
        success: false,
        error: 'User not found',
        status: 404
      }
    }

    return {
      success: true,
      user: {
        id: userSession.user.id,
        email: userSession.user.email,
        name: userSession.user.name,
        role: userSession.user.role,
        credits: userSession.user.credits
      }
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      status: 500
    }
  }
}

/**
 * Standard admin authentication check for API routes
 * Returns user data if admin, error response if not
 */
export async function requireAdminAuth(): Promise<AuthResult> {
  try {
    const authResult = await requireAuth()
    
    if (!authResult.success) {
      return authResult
    }

    const adminCheck = await isAdmin()
    
    if (!adminCheck) {
      return {
        success: false,
        error: 'Admin access required',
        status: 403
      }
    }

    return authResult
  } catch (error) {
    console.error('Admin authentication error:', error)
    return {
      success: false,
      error: 'Admin authentication failed',
      status: 500
    }
  }
}

/**
 * Helper function to create standardized error responses
 */
export function createAuthErrorResponse(authResult: AuthResult): NextResponse {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  
  return NextResponse.json(
    { error: authResult.error },
    { 
      status: authResult.status || 500,
      headers: corsHeaders
    }
  )
}

/**
 * Wrapper function for API routes that require authentication
 * Usage: export const GET = withAuth(async (request, user) => { ... })
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAuth()
    
    if (!authResult.success || !authResult.user) {
      return createAuthErrorResponse(authResult)
    }

    return handler(request, authResult.user)
  }
}

/**
 * Wrapper function for API routes that require admin authentication
 * Usage: export const GET = withAdminAuth(async (request, user) => { ... })
 */
export function withAdminAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAdminAuth()
    
    if (!authResult.success || !authResult.user) {
      return createAuthErrorResponse(authResult)
    }

    return handler(request, authResult.user)
  }
}