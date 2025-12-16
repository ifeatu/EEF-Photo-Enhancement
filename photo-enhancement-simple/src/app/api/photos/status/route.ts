import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Fast status polling endpoint for serverless architecture
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');
    
    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Step 1: Quick auth check
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Step 2: Fast photo status lookup
    const photo = await prisma.photo.findFirst({
      where: { 
        id: photoId,
        userId: session.user.id // Security: only user's own photos
      },
      select: {
        id: true,
        status: true,
        originalUrl: true,
        enhancedUrl: true,
        createdAt: true,
        updatedAt: true,
        title: true
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Step 3: Return status with processing time info
    const processingTime = photo.updatedAt.getTime() - photo.createdAt.getTime();
    
    return NextResponse.json({
      success: true,
      data: {
        id: photo.id,
        status: photo.status,
        originalUrl: photo.originalUrl,
        enhancedUrl: photo.enhancedUrl,
        title: photo.title,
        processingTime: processingTime,
        isComplete: photo.status === 'COMPLETED' || photo.status === 'FAILED',
        lastUpdated: photo.updatedAt.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Status check error:', error.message);
    
    return NextResponse.json({
      error: 'Status check failed',
      message: error.message
    }, { status: 500 });
  }
}