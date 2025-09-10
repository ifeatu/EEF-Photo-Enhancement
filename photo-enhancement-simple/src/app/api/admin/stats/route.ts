import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export const GET = withAdminAuth(async (request: NextRequest, user) => {
  try {

    // Get system statistics
    const [totalUsers, totalPhotos, totalCreditsUsed, recentActivity] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Total photos count
      prisma.photo.count(),
      
      // Total credits purchased (sum of all transactions)
      prisma.transaction.aggregate({
        _sum: {
          creditsPurchased: true,
        },
        where: {
          status: 'COMPLETED',
        },
      }).then((result: any) => result._sum.creditsPurchased || 0),
      
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
});