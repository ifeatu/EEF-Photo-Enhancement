import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import type { Session } from 'next-auth';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request started - minimal version');

    // Step 1: Check authentication
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      console.log('No session found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('Session found:', session.user.id);

    // Step 2: Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, credits: true, role: true }
    });

    if (!user) {
      console.log('User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User found:', user.email, 'Credits:', user.credits);

    // Step 3: Check credits
    const isAdminWithUnlimitedCredits = user.role === 'ADMIN' && user.credits >= 999999;
    const hasCredits = isAdminWithUnlimitedCredits || user.credits >= 1;
    
    if (!hasCredits) {
      console.log('Insufficient credits');
      return NextResponse.json({ 
        error: 'Insufficient credits',
        credits: user.credits 
      }, { status: 402 });
    }

    // Step 4: Get file from form data
    let formData;
    try {
      formData = await request.formData();
      console.log('Form data parsed successfully');
    } catch (formError: any) {
      console.error('Form data parsing failed:', formError.message);
      return NextResponse.json({ 
        error: 'Invalid form data',
        details: formError.message
      }, { status: 400 });
    }

    const file = formData.get('photo') as File;
    
    if (!file) {
      console.log('No file in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Step 5: Basic file validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.' 
      }, { status: 400 });
    }
    
    if (file.size > maxSize) {
      console.log('File too large:', file.size);
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Step 6: Upload to Vercel Blob
    let imageUrl: string;
    
    if (!process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN.includes('YOUR_TOKEN_HERE')) {
      console.error('Blob storage not configured');
      return NextResponse.json({ 
        error: 'File storage service not configured',
        message: 'BLOB_READ_WRITE_TOKEN not set'
      }, { status: 503 });
    }

    try {
      console.log('Uploading to Vercel Blob...');
      const blob = await put(file.name, file, {
        access: 'public',
      });
      imageUrl = blob.url;
      console.log('Blob upload successful:', blob.url);
    } catch (blobError: any) {
      console.error('Blob upload failed:', blobError.message);
      return NextResponse.json({ 
        error: 'File upload failed',
        message: blobError.message
      }, { status: 502 });
    }

    // Step 7: Create photo record
    let photo;
    try {
      console.log('Creating photo record...');
      photo = await prisma.photo.create({
        data: {
          userId: user.id,
          originalUrl: imageUrl,
          status: 'PENDING',
          title: formData.get('title') as string || file.name,
          description: formData.get('description') as string || null,
        },
      });
      console.log('Photo record created:', photo.id);
    } catch (dbError: any) {
      console.error('Database error:', dbError.message);
      return NextResponse.json({
        error: 'Database error',
        message: dbError.message
      }, { status: 503 });
    }

    // Step 8: Deduct credit (skip for admin users with unlimited credits)
    if (!isAdminWithUnlimitedCredits) {
      try {
        console.log('Deducting credit...');
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { decrement: 1 } },
        });
        console.log('Credit deducted successfully');
      } catch (creditError: any) {
        console.error('Credit deduction failed:', creditError.message);
        // Continue without failing the upload
      }
    }

    console.log('Upload completed successfully');

    return NextResponse.json({ 
      success: true,
      data: {
        photoId: photo.id,
        message: 'Photo uploaded successfully',
        creditsRemaining: isAdminWithUnlimitedCredits ? 999999 : Math.max(0, user.credits - 1),
      }
    });

  } catch (error: any) {
    console.error('Upload error (caught at top level):', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json({
      error: 'Upload failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}