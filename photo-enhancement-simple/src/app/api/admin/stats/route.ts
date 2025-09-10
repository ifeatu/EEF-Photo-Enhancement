import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get system statistics
    const [totalUsers, totalPhotos, totalCreditsUsed, recentActivity] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Total photos count
      prisma.photo.count(),
      
      // Total credits used (sum of all transactions)
      prisma.transaction.aggregate({
        _sum: {
          creditsUsed: true,
        },
        where: {
          status: 'COMPLETED',
        },
      }).then((result: any) => result._sum.creditsUsed || 0),
      
      // Recent activity (last 10 activities)
      prisma.photo.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
    ])

    const stats = {
      totalUsers,
      totalPhotos,
      totalCreditsUsed,
      recentActivity: recentActivity.map((photo: any) => ({
        id: photo.id,
        type: 'photo_processed',
        description: `Photo ${photo.status.toLowerCase()}`,
        timestamp: photo.createdAt.toISOString(),
        user: photo.user.email,
      })),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}