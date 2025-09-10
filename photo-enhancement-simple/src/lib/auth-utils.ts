import { getServerSession } from 'next-auth/next'
import { prisma } from './prisma'
import { authOptions } from './auth'
import type { Session } from 'next-auth'

export interface ExtendedSession extends Session {
  user: {
    id: string
    email: string
    name?: string
    image?: string
    role: 'USER' | 'ADMIN'
    credits: number
  }
}

/**
 * Get the current user session with role information
 */
export async function getCurrentUser(): Promise<ExtendedSession | null> {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session?.user?.id) {
    return null
  }

  // Fetch user with role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      credits: true,
    }
  })

  if (!user) {
    return null
  }

  return {
    ...session,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      image: user.image || undefined,
      role: user.role,
      credits: user.credits,
    }
  }
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentUser()
  return session?.user?.role === 'ADMIN'
}

/**
 * Require admin role or throw error
 */
export async function requireAdmin(): Promise<ExtendedSession> {
  const session = await getCurrentUser()
  
  if (!session) {
    throw new Error('Authentication required')
  }
  
  if (session.user.role !== 'ADMIN') {
    throw new Error('Admin access required')
  }
  
  return session
}

/**
 * Require authentication or throw error
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = await getCurrentUser()
  
  if (!session) {
    throw new Error('Authentication required')
  }
  
  return session
}

/**
 * Check if user has sufficient credits
 */
export async function hasCredits(userId: string, required: number = 1): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true }
  })
  
  return user ? user.credits >= required : false
}