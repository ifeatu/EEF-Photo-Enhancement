import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api-auth';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {

    const photos = await prisma.photo.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        originalUrl: true,
        enhancedUrl: true,
        status: true,
        title: true,
        description: true,
        createdAt: true
      }
    });

    return NextResponse.json({ photos });

  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Delete photo (only if it belongs to the user)
    const deletedPhoto = await prisma.photo.deleteMany({
      where: {
        id: photoId,
        userId: user.id
      }
    });

    if (deletedPhoto.count === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Photo deleted successfully' });

  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
});