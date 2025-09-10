import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withAdminAuth(async (request: NextRequest, user) => {
  try {

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit

    // Build where clause for status filter
    const whereClause = status
      ? { status: status.toUpperCase() as any }
      : {}

    // Get photos with pagination
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.photo.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Admin photos error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
});