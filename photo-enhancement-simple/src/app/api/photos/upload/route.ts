import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { withAuth } from '@/lib/api-auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {

    // Check user credits
    const userCredits = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true }
    });

    if (!userCredits) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasCredits = userCredits.credits >= 1;

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
        userId: user.id,
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
        where: { id: user.id },
        data: { credits: { decrement: 1 } },
      });

      // Mark photo as pending for enhancement (will be processed separately)
      try {
        // Update photo status to pending for background processing
        await prisma.photo.update({
          where: { id: photo.id },
          data: { status: 'PENDING' }
        });
        
        message = 'Photo uploaded successfully and queued for enhancement';
      } catch (enhanceError) {
        console.warn('Failed to queue photo for enhancement:', enhanceError);
        message = 'Photo uploaded but enhancement queueing failed';
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
      creditsRemaining: hasCredits ? userCredits.credits - 1 : userCredits.credits,
      upgradeUrl: '/pricing'
    });

  } catch (error: any) {
    console.error('Photo upload error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name
    });
    
    // Return more specific error information in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Upload failed: ${error.message}` 
      : 'Upload failed';
      
    return NextResponse.json({ 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        code: error.code 
      })
    }, { status: 500 });
  }
})