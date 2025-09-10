import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, createAuthErrorResponse } from '@/lib/api-auth';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Use standardized auth
  const authResult = await requireAuth();
  if (!authResult.success || !authResult.user) {
    return createAuthErrorResponse(authResult);
  }
  
  const user = authResult.user;
  
  try {
    const resolvedParams = await params;
    const photoId = resolvedParams.id;

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Get photo from database (only if it belongs to the user)
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id
      },
      select: {
        id: true,
        originalUrl: true,
        enhancedUrl: true,
        status: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    return NextResponse.json({ photo });

  } catch (error) {
    console.error('Get photo error:', error);
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Use standardized auth
  const authResult = await requireAuth();
  if (!authResult.success || !authResult.user) {
    return createAuthErrorResponse(authResult);
  }
  
  const user = authResult.user;
  
  try {
    const resolvedParams = await params;
    const photoId = resolvedParams.id;
    const { title, description } = await request.json();

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Update photo (only if it belongs to the user)
    const updatedPhoto = await prisma.photo.updateMany({
      where: {
        id: photoId,
        userId: user.id
      },
      data: {
        title,
        description,
        updatedAt: new Date()
      }
    });

    if (updatedPhoto.count === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Fetch the updated photo to return
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id
      },
      select: {
        id: true,
        originalUrl: true,
        enhancedUrl: true,
        status: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ photo });

  } catch (error) {
    console.error('Update photo error:', error);
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
  }
}