/**
 * Fix Stuck Completed Photos API
 * 
 * Identifies and fixes photos marked as COMPLETED but not actually enhanced
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Internal service authentication check
function isAuthorizedRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const internalService = request.headers.get('x-internal-service');
  
  return (
    internalService === 'stuck-completed-fixer' ||
    authHeader === `Bearer ${process.env.INTERNAL_API_KEY}` ||
    process.env.NODE_ENV === 'development'
  );
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const correlationId = `fix-stuck-completed-${Date.now()}`;
  
  try {
    // Find photos that are COMPLETED but have issues
    await logger.info('Searching for stuck completed photos', { correlationId });
    
    const stuckPhotos = await prisma.photo.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { enhancedUrl: null },
          // Note: Prisma doesn't support comparing fields directly in OR clauses easily
          // We'll filter these in application logic
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            credits: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Filter for photos where enhancedUrl equals originalUrl or has other issues
    const problematicPhotos = stuckPhotos.filter(photo => {
      return !photo.enhancedUrl || 
             photo.enhancedUrl === photo.originalUrl ||
             photo.enhancedUrl.includes('original') ||
             photo.enhancedUrl.split('/').pop() === photo.originalUrl.split('/').pop();
    });

    logger.info(`Found ${problematicPhotos.length} stuck completed photos`, {
      correlationId,
      totalCompleted: stuckPhotos.length,
      problematic: problematicPhotos.length
    });

    const results = {
      totalFound: problematicPhotos.length,
      processed: 0,
      fixed: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process each stuck photo
    for (const photo of problematicPhotos) {
      results.processed++;
      
      try {
        logger.info(`Processing stuck completed photo ${photo.id}`, {
          correlationId,
          photoId: photo.id,
          userId: photo.user.id,
          originalUrl: photo.originalUrl,
          enhancedUrl: photo.enhancedUrl
        });

        // Reset photo to PENDING status
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            status: 'PENDING',
            enhancedUrl: null,
            updatedAt: new Date()
          }
        });

        // Trigger reprocessing
        const enhanceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/photos/enhance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'stuck-completed-fixer',
            'X-User-Id': photo.user.id
          },
          body: JSON.stringify({
            photoId: photo.id,
            originalUrl: photo.originalUrl
          }),
        });

        if (enhanceResponse.ok) {
          const enhanceResult = await enhanceResponse.json();
          results.fixed++;
          
          logger.info(`Successfully fixed stuck completed photo ${photo.id}`, {
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
          
          logger.warn(`Failed to fix stuck completed photo ${photo.id}`, {
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
        
        logger.error(`Error fixing stuck completed photo ${photo.id}`, {
          correlationId,
          photoId: photo.id,
          error: error.message,
          stack: error.stack
        });
      }
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Stuck completed photos fix completed', {
      correlationId,
      processingTime,
      ...results
    });

    return NextResponse.json({
      success: true,
      correlationId,
      processingTime,
      results,
      message: `Processed ${results.processed} stuck completed photos: ${results.fixed} fixed, ${results.failed} failed`
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Stuck completed photos fix failed', {
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
      message: 'Failed to fix stuck completed photos'
    }, { status: 500 });
  }
}

// GET endpoint to check for stuck completed photos without fixing
export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stuckPhotos = await prisma.photo.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { enhancedUrl: null },
        ]
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        originalUrl: true,
        enhancedUrl: true,
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Filter for actual problems
    const problematic = stuckPhotos.filter(photo => {
      return !photo.enhancedUrl || 
             photo.enhancedUrl === photo.originalUrl ||
             photo.enhancedUrl.includes('original') ||
             photo.enhancedUrl.split('/').pop() === photo.originalUrl.split('/').pop();
    });

    return NextResponse.json({
      stuckCount: problematic.length,
      totalCompleted: stuckPhotos.length,
      problematicPhotos: problematic.map(photo => ({
        id: photo.id,
        title: photo.title,
        userEmail: photo.user.email,
        createdAt: photo.createdAt.toISOString(),
        originalUrl: photo.originalUrl,
        enhancedUrl: photo.enhancedUrl,
        issue: !photo.enhancedUrl ? 'Missing enhanced URL' : 
               photo.enhancedUrl === photo.originalUrl ? 'Enhanced URL same as original' :
               'Possible same file'
      }))
    });

  } catch (error: any) {
    logger.error('Failed to check stuck completed photos', {
      error: error.message
    });

    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}