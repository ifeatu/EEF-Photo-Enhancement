import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasCredits = user.credits >= 1;

    const formData = await request.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let imageUrl: string;
    
    // Check if Vercel Blob token is available
    if (process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN.includes('YOUR_TOKEN_HERE')) {
      // Use Vercel Blob for production
      const blob = await put(file.name, file, {
        access: 'public',
      });
      imageUrl = blob.url;
    } else {
      // Use local file storage for development
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Save file locally
      await writeFile(filepath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    // Create photo record in database
    const photo = await prisma.photo.create({
      data: {
        userId: session.user.id,
        originalUrl: imageUrl,
        status: 'PENDING',
        title: formData.get('title') as string || file.name,
        description: formData.get('description') as string || null,
      },
    });

    let message = 'Photo uploaded successfully';
    let needsUpgrade = false;

    if (hasCredits) {
      // Deduct credit and trigger enhancement
      await prisma.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: 1 } },
      });

      // Automatically trigger enhancement after upload
      try {
        // Call the enhancement API in the background
        const enhanceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/photos/enhance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify({ photoId: photo.id }),
        });
        
        if (!enhanceResponse.ok) {
          console.warn('Auto-enhancement failed, photo will remain pending:', await enhanceResponse.text());
        } else {
          message = 'Photo uploaded successfully and enhancement started automatically';
        }
      } catch (enhanceError) {
        console.warn('Auto-enhancement failed, photo will remain pending:', enhanceError);
      }
    } else {
      // No credits available - photo uploaded but not processed
      message = 'Photo uploaded but not processed due to insufficient credits';
      needsUpgrade = true;
    }

    return NextResponse.json({ 
      photoId: photo.id,
      message,
      needsUpgrade,
      creditsRemaining: hasCredits ? user.credits - 1 : user.credits,
      upgradeUrl: '/pricing'
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}