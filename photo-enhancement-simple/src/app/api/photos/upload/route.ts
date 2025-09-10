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
      try {
        const blob = await put(file.name, file, {
          access: 'public',
        });
        imageUrl = blob.url;
      } catch (blobError: any) {
         console.error('Vercel Blob upload failed:', blobError);
         return NextResponse.json({ 
           error: 'File upload service unavailable',
           details: process.env.NODE_ENV === 'development' ? blobError.message : undefined
         }, { status: 500 });
      }
    } else {
      // Use local file storage for development or fallback
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Use /tmp directory for serverless environments, public/uploads for local development
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
      const uploadsDir = isServerless 
        ? path.join('/tmp', 'uploads')
        : path.join(process.cwd(), 'public', 'uploads');
      
      try {
        await mkdir(uploadsDir, { recursive: true });
        
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;
        const filepath = path.join(uploadsDir, filename);
        
        // Save file locally
        await writeFile(filepath, buffer);
        
        // For local development, serve from public/uploads
        // For serverless, this is a temporary file that won't be accessible via URL
        if (isServerless) {
          return NextResponse.json({ 
            error: 'File storage service not configured',
            message: 'Please configure BLOB_READ_WRITE_TOKEN for file uploads'
          }, { status: 500 });
        }
        
        imageUrl = `/uploads/${filename}`;
      } catch (fileError: any) {
        console.error('Local file storage failed:', fileError);
        return NextResponse.json({ 
          error: 'File storage failed',
          details: process.env.NODE_ENV === 'development' ? fileError.message : undefined
        }, { status: 500 });
      }
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

      // Immediately trigger enhancement processing
      try {
        // Call the enhance API internally to process the photo immediately
        const enhanceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/photos/enhance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'upload-service', // Internal service identifier
          },
          body: JSON.stringify({ photoId: photo.id }),
        });

        if (enhanceResponse.ok) {
          message = 'Photo uploaded and enhancement completed successfully';
        } else {
          console.warn('Enhancement failed:', await enhanceResponse.text());
          message = 'Photo uploaded but enhancement failed - will retry later';
        }
      } catch (enhanceError) {
        console.warn('Failed to trigger photo enhancement:', enhanceError);
        message = 'Photo uploaded but enhancement failed - will retry later';
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