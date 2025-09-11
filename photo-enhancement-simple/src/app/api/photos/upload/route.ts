import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { withAuth } from '@/lib/api-auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

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

// Simplified file validation
function validateImageFile(file: File) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }
  
  return { valid: true };
}

export const POST = withAuth(async (request: NextRequest, user) => {
  const startTime = Date.now();
  const correlationId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log('Upload request started', { userId: user.id, correlationId });

    // Check user credits and role
    const userCredits = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true, role: true }
    });

    if (!userCredits) {
      return createErrorResponse('User not found', 404);
    }

    // Admin users with unlimited credits always have credits
    const isAdminWithUnlimitedCredits = userCredits.role === 'ADMIN' && userCredits.credits >= 999999;
    const hasCredits = isAdminWithUnlimitedCredits || userCredits.credits >= 1;
    
    if (!hasCredits) {
      console.log('Upload failed: insufficient credits', { userId: user.id, credits: userCredits.credits });
      return createErrorResponse('Insufficient credits. Please purchase more credits to continue.', 402);
    }

    // Extract file from form data
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return createErrorResponse('No file provided', 400);
    }

    console.log('File received', { 
      userId: user.id, 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return createErrorResponse(validation.error || 'Invalid file', 400);
    }

    let imageUrl: string;
    
    // Check if Vercel Blob token is available
    if (process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN.includes('YOUR_TOKEN_HERE')) {
      console.log('Uploading to Vercel Blob', { fileName: file.name });
      
      try {
        const blob = await put(file.name, file, {
          access: 'public',
        });
        imageUrl = blob.url;
        console.log('Blob upload successful', { blobUrl: blob.url });
      } catch (blobError: any) {
        console.error('Vercel Blob upload failed:', blobError);
        return NextResponse.json({ 
          error: 'File upload service unavailable',
          message: 'Unable to upload file to storage service',
          details: process.env.NODE_ENV === 'development' ? blobError.message : undefined
        }, { status: 502 });
      }
    } else {
      console.error('Blob storage not configured');
      return NextResponse.json({ 
        error: 'File storage service not configured',
        message: 'Please configure BLOB_READ_WRITE_TOKEN for file uploads'
      }, { status: 503 });
    }

    // Create photo record in database
    console.log('Creating photo record', { imageUrl });
    
    let photo;
    try {
      photo = await prisma.photo.create({
        data: {
          userId: user.id,
          originalUrl: imageUrl,
          status: 'PENDING',
          title: formData.get('title') as string || file.name,
          description: formData.get('description') as string || null,
        },
      });
      console.log('Photo record created', { photoId: photo.id });
    } catch (dbError: any) {
      console.error('Database error creating photo record:', dbError);
      return NextResponse.json({
        error: 'Database error',
        message: 'Unable to save photo information',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }, { status: 503 });
    }

    let message = 'Photo uploaded successfully';

    // Deduct credit (skip for admin users with unlimited credits)
    if (!isAdminWithUnlimitedCredits) {
      console.log('Deducting user credit', { userId: user.id });
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { decrement: 1 } },
        });
      } catch (creditError: any) {
        console.error('Failed to deduct user credit:', creditError);
        console.warn('Photo uploaded but credit deduction failed');
      }
    }

    // Immediately trigger enhancement processing with retry logic
    let enhancementTriggered = false;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting photo enhancement (attempt ${attempt})`, { photoId: photo.id });
        
        const enhanceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://photoenhance.dev'}/api/photos/enhance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'upload-service',
            'X-User-Id': user.id
          },
          body: JSON.stringify({ 
            photoId: photo.id,
            originalUrl: imageUrl
          }),
        });

        if (enhanceResponse.ok) {
          const enhanceResult = await enhanceResponse.json();
          message = 'Photo uploaded and enhancement completed successfully';
          enhancementTriggered = true;
          console.log('Photo enhancement completed', { 
            photoId: photo.id, 
            attempt,
            enhancedUrl: enhanceResult.data?.enhancedUrl 
          });
          break;
        } else {
          const errorText = await enhanceResponse.text();
          console.warn(`Enhancement failed (attempt ${attempt}):`, errorText);
          
          if (attempt === maxRetries) {
            message = 'Photo uploaded but enhancement failed - will retry automatically';
          } else {
            // Brief delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      } catch (enhanceError: any) {
        console.warn(`Failed to trigger photo enhancement (attempt ${attempt}):`, enhanceError);
        
        if (attempt === maxRetries) {
          message = 'Photo uploaded but enhancement failed - will retry automatically';
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    if (!enhancementTriggered) {
      console.warn('Photo enhancement failed after all retries', {
        photoId: photo.id,
        userId: user.id,
        maxRetries,
        correlationId
      });
    }

    const processingTime = Date.now() - startTime;
    console.log('Upload completed', { 
      photoId: photo.id, 
      processingTime,
      enhancementTriggered 
    });

    return createSuccessResponse({ 
      photoId: photo.id,
      message,
      creditsRemaining: isAdminWithUnlimitedCredits ? 999999 : Math.max(0, userCredits.credits - 1),
      upgradeUrl: '/pricing'
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('Photo upload error:', {
      message: error.message,
      correlationId,
      processingTime,
      userId: user.id,
      stack: error.stack
    });
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Upload failed: ${error.message}` 
      : 'Upload failed';
      
    return createErrorResponse({
      message: errorMessage,
      correlationId,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        code: error.code 
      })
    }, 500);
  }
})