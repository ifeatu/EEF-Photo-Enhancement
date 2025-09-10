import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request, user) => {
  try {
    // User is already authenticated and enhanced with role
    
    // Get user directly from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        createdAt: true
      }
    })
    
    // Get all users for debugging
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({
      authenticatedUser: user,
      dbUser,
      allUsers,
      debug: {
        hasAuthenticatedUser: !!user,
        hasDbUser: !!dbUser,
        userCount: allUsers.length
      }
    })
  } catch (error) {
    console.error('Debug user role error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
})