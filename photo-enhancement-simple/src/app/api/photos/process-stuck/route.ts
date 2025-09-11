/**
 * Automated Stuck Photo Detection & Recovery API
 * 
 * This endpoint:
 * 1. Finds photos stuck in PENDING status for >5 minutes
 * 2. Attempts to process them using the internal enhancement API
 * 3. Updates status and provides monitoring data
 * 4. Can be called manually or via scheduled task
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Internal service authentication check
function isAuthorizedRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const internalService = request.headers.get('x-internal-service');
  
  // Allow internal service calls or admin API key
  return (
    internalService === 'stuck-photo-monitor' ||
    authHeader === `Bearer ${process.env.INTERNAL_API_KEY}` ||
    process.env.NODE_ENV === 'development' // Allow in dev for testing
  );
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const correlationId = `stuck-photo-${Date.now()}`;
  
  try {
    // Find photos stuck in PENDING status for more than 5 minutes
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    const stuckPhotos = await prisma.photo.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffTime
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            credits: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 50 // Process up to 50 stuck photos at once
    });

    logger.info(`Found ${stuckPhotos.length} stuck photos to process`, {
      correlationId,
      cutoffTime: cutoffTime.toISOString()
    });

    const results = {
      totalFound: stuckPhotos.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process each stuck photo
    for (const photo of stuckPhotos) {
      results.processed++;
      
      try {
        logger.info(`Processing stuck photo ${photo.id}`, {
          correlationId,
          photoId: photo.id,
          userId: photo.user.id,
          stuckDuration: Date.now() - new Date(photo.createdAt).getTime()
        });

        // Call the enhancement API internally
        const enhanceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/photos/enhance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'legacy-cleanup',
            'X-User-Id': photo.user.id
          },
          body: JSON.stringify({
            photoId: photo.id,
            originalUrl: photo.originalUrl
          }),
        });

        if (enhanceResponse.ok) {
          const enhanceResult = await enhanceResponse.json();
          results.succeeded++;
          
          logger.info(`Successfully processed stuck photo ${photo.id}`, {
            correlationId,
            photoId: photo.id,
            enhancedUrl: enhanceResult.data?.enhancedUrl
          });
        } else {
          const errorText = await enhanceResponse.text();
          results.failed++;
          results.errors.push({
            photoId: photo.id,
            userId: photo.user.id,
            error: errorText,
            httpStatus: enhanceResponse.status
          });
          
          logger.warn(`Failed to process stuck photo ${photo.id}`, {
            correlationId,
            photoId: photo.id,
            error: errorText,
            httpStatus: enhanceResponse.status
          });
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          photoId: photo.id,
          userId: photo.user?.id,
          error: error.message,
          type: 'processing_error'
        });
        
        logger.error(`Error processing stuck photo ${photo.id}`, {
          correlationId,
          photoId: photo.id,
          error: error.message,
          stack: error.stack
        });
      }
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Stuck photo processing completed', {
      correlationId,
      processingTime,
      ...results
    });

    return NextResponse.json({
      success: true,
      correlationId,
      processingTime,
      results,
      message: `Processed ${results.processed} stuck photos: ${results.succeeded} succeeded, ${results.failed} failed`
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Stuck photo processing failed', {
      correlationId,
      processingTime,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      correlationId,
      processingTime,
      error: error.message,
      message: 'Failed to process stuck photos'
    }, { status: 500 });
  }
}

// GET endpoint to check for stuck photos without processing
export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    const stuckCount = await prisma.photo.count({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffTime
        }
      }
    });

    const recentStuck = await prisma.photo.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffTime
        }
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 10
    });

    return NextResponse.json({
      stuckCount,
      cutoffTime: cutoffTime.toISOString(),
      recentStuck: recentStuck.map(photo => ({
        id: photo.id,
        title: photo.title,
        userEmail: photo.user.email,
        stuckDuration: Date.now() - new Date(photo.createdAt).getTime(),
        createdAt: photo.createdAt.toISOString()
      }))
    });

  } catch (error: any) {
    logger.error('Failed to check stuck photos', {
      error: error.message
    });

    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}