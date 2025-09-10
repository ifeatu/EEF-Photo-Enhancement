import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { withAuth } from '@/lib/api-auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { logger, generateCorrelationId, setCorrelationId } from '@/lib/logger';
import { UploadMetrics } from '@/lib/metrics';
import { captureUploadError, setSentryContext, addBreadcrumb } from '@/lib/sentry';
import { tracer } from '@/lib/tracing';
import { alertManager } from '@/lib/alerting';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  console.log('OPTIONS handler called for upload route');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export const POST = withAuth(async (request: NextRequest, user) => {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  setCorrelationId(correlationId);
  
  // Start distributed trace for upload pipeline
  const trace = tracer.startTrace('photo-upload-pipeline', {
    userId: user.id,
    correlationId,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  });
  
  // Set operation context for monitoring
  setSentryContext('photo_upload', {
    userId: user.id,
    correlationId,
    traceId: trace.getTraceId()
  });
  
  addBreadcrumb('Upload started', 'upload', { userId: user.id, traceId: trace.getTraceId() });
  
  try {
    // Check user credits
    const creditsSpan = trace.createSpan('check-user-credits', { userId: user.id });
    addBreadcrumb('Checking user credits', 'upload');
    const userCredits = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true }
    });
    creditsSpan.addMetadata('credits', userCredits?.credits || 0);
    creditsSpan.finish();

    if (!userCredits) {
      const processingTime = Date.now() - startTime;
      logger.warn('Upload failed: user not found', { userId: user.id, processingTime });
      addBreadcrumb('Upload failed - user not found', 'upload', { userId: user.id });
      return createErrorResponse('User not found', 404);
    }

    const hasCredits = userCredits.credits >= 1;
    
    if (!hasCredits) {
      const processingTime = Date.now() - startTime;
      logger.warn('Upload failed: insufficient credits', { userId: user.id, processingTime, credits: userCredits.credits });
      addBreadcrumb('Upload failed - insufficient credits', 'upload', { userId: user.id, credits: userCredits.credits });
    }

    const extractSpan = trace.createSpan('extract-file-data', {});
    addBreadcrumb('Extracting file from form data', 'upload');
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    
    if (file) {
      extractSpan.addMetadata('fileName', file.name);
      extractSpan.addMetadata('fileSize', file.size);
      extractSpan.addMetadata('fileType', file.type);
    }
    extractSpan.finish();
    
    if (!file) {
      const processingTime = Date.now() - startTime;
      logger.warn('Upload failed: no file provided', { userId: user.id, processingTime });
      addBreadcrumb('Upload failed - no file provided', 'upload', { userId: user.id });
      return createErrorResponse('No file provided', 400);
    }

    // Record upload start with file details
    UploadMetrics.recordUploadStart(user.id, file.name, file.size);
    logger.uploadStart(user.id, file.name, file.size);
    addBreadcrumb('File extracted successfully', 'upload', { fileName: file.name, fileSize: file.size });

    let imageUrl: string;
    
    // Check if Vercel Blob token is available
    if (process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN.includes('YOUR_TOKEN_HERE')) {
      // Use Vercel Blob for production
      const blobSpan = trace.createSpan('upload-to-blob-storage', {
        fileName: file.name,
        fileSize: file.size,
        storageProvider: 'vercel-blob'
      });
      addBreadcrumb('Uploading to Vercel Blob', 'upload', { fileName: file.name });
      try {
        const blob = await put(file.name, file, {
          access: 'public',
        });
        imageUrl = blob.url;
        blobSpan.addMetadata('blobUrl', blob.url);
        blobSpan.addTag('storage_result', 'success');
        blobSpan.finish();
        addBreadcrumb('Blob upload successful', 'upload', { blobUrl: blob.url });
      } catch (blobError: any) {
         const processingTime = Date.now() - startTime;
         blobSpan.addTag('storage_result', 'error');
         blobSpan.error(blobError);
         trace.error(blobError);
         
         logger.uploadError(user.id, file.name, blobError, processingTime);
         UploadMetrics.recordUploadError(user.id, file.name, blobError, processingTime);
         captureUploadError(blobError, {
            userId: user.id,
            fileName: file.name,
            fileSize: file.size,
            processingTime,
            correlationId
          });
         
         // Record error for alerting
         alertManager.recordUploadError();
         console.error('Vercel Blob upload failed:', blobError);
         return NextResponse.json({ 
           error: 'File upload service unavailable',
           message: 'Unable to upload file to storage service',
           details: process.env.NODE_ENV === 'development' ? blobError.message : undefined
         }, { status: 502 }); // Bad Gateway - external service error
      }
    } else {
      // Use local file storage for development or fallback
      const localSpan = trace.createSpan('save-file-locally', {
        fileName: file.name,
        fileSize: file.size,
        storageProvider: 'local-filesystem'
      });
      addBreadcrumb('Saving file locally', 'upload', { fileName: file.name });
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
          console.error('Blob storage not configured in serverless environment');
          return NextResponse.json({ 
            error: 'File storage service not configured',
            message: 'Please configure BLOB_READ_WRITE_TOKEN for file uploads'
          }, { status: 503 }); // Service Unavailable instead of Internal Server Error
        }
        
        imageUrl = `/uploads/${filename}`;
        localSpan.addMetadata('filePath', filepath);
        localSpan.addMetadata('publicUrl', imageUrl);
        localSpan.addTag('storage_result', 'success');
        localSpan.finish();
        addBreadcrumb('Local file save successful', 'upload', { filePath: filepath });
      } catch (fileError: any) {
        const processingTime = Date.now() - startTime;
        localSpan.addTag('storage_result', 'error');
        localSpan.error(fileError);
        trace.error(fileError);
        
        logger.uploadError(user.id, file.name, fileError, processingTime);
        UploadMetrics.recordUploadError(user.id, file.name, fileError, processingTime);
        captureUploadError(fileError, {
           userId: user.id,
           fileName: file.name,
           fileSize: file.size,
           processingTime,
           correlationId
         });
        
        // Record error for alerting
        alertManager.recordUploadError();
        console.error('Local file storage failed:', fileError);
        return NextResponse.json({ 
          error: 'File storage failed',
          message: 'Unable to save uploaded file',
          details: process.env.NODE_ENV === 'development' ? fileError.message : undefined
        }, { status: 507 }); // Insufficient Storage instead of Internal Server Error
      }
    }

    // Create photo record in database
    addBreadcrumb('Creating photo record in database', 'upload', { imageUrl });
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
      addBreadcrumb('Photo record created', 'upload', { photoId: photo.id });
    } catch (dbError: any) {
      console.error('Database error creating photo record:', dbError);
      return NextResponse.json({
        error: 'Database error',
        message: 'Unable to save photo information',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }, { status: 503 }); // Service Unavailable
    }

    let message = 'Photo uploaded successfully';
    let needsUpgrade = false;

    if (hasCredits) {
      // Deduct credit and trigger enhancement
      addBreadcrumb('Deducting user credit', 'upload', { userId: user.id });
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { decrement: 1 } },
        });
      } catch (creditError: any) {
        console.error('Failed to deduct user credit:', creditError);
        // Continue without failing the upload, but log the error
        console.warn('Photo uploaded but credit deduction failed');
      }

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

    const processingTime = Date.now() - startTime;
    
    // Record successful upload
    UploadMetrics.recordUploadSuccess(user.id, file.name, processingTime, file.size);
    logger.uploadSuccess(user.id, file.name, processingTime);
    addBreadcrumb('Upload completed successfully', 'upload', { 
      photoId: photo.id, 
      processingTime,
      hasCredits 
    });

    return createSuccessResponse({ 
      photoId: photo.id,
      message,
      needsUpgrade,
      creditsRemaining: hasCredits ? userCredits.credits - 1 : userCredits.credits,
      upgradeUrl: '/pricing'
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    // Log and track the error
    logger.uploadError(user.id, 'unknown', error as Error, processingTime);
    captureUploadError(error as Error, {
      userId: user.id,
      fileName: 'unknown',
      processingTime,
      correlationId
    });
    
    // Record error for alerting and report if critical
    alertManager.recordUploadError();
    if (error instanceof Error && error.message.includes('database')) {
      await alertManager.reportCriticalError(error, {
        userId: user.id,
        correlationId,
        endpoint: '/api/photos/upload'
      });
    }
    addBreadcrumb('Upload failed with unexpected error', 'upload', { 
      error: (error as Error).message,
      processingTime 
    });
    
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
      
    return createErrorResponse({
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        code: error.code 
      })
    }, 500);
  }
})