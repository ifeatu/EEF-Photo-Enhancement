import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const photoId = resolvedParams.id;

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Get photo from database (only if it belongs to the user)
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: session.user.id
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photoId = resolvedParams.id;
    const { title, description } = await request.json();

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Update photo (only if it belongs to the user)
    const updatedPhoto = await prisma.photo.updateMany({
      where: {
        id: photoId,
        userId: session.user.id
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
        userId: session.user.id
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