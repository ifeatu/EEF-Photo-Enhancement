import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// This is a Vercel cron function that processes queued photos
// It should be called every minute via Vercel cron

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('🔍 Cron job: Checking for queued photos...');
    
    // Find all photos with PENDING status
    const queuedPhotos = await prisma.photo.findMany({
      where: {
        status: 'PENDING'
      },
      take: 5, // Process max 5 photos per run to avoid timeouts
      orderBy: {
        createdAt: 'asc' // Process oldest first
      }
    });
    
    logger.info(`📋 Found ${queuedPhotos.length} photos in queue`);
    
    if (queuedPhotos.length === 0) {
      return NextResponse.json({ 
        message: 'No photos in queue to process',
        processed: 0
      });
    }
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const photo of queuedPhotos) {
      try {
        logger.info(`🔄 Processing photo: ${photo.id}`);
        
        // Call the enhancement API endpoint internally
        const enhanceResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/photos/enhance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Use internal service authentication
            'x-internal-service': 'cron-processor',
            'x-user-id': photo.userId
          },
          body: JSON.stringify({ photoId: photo.id })
        });
        
        if (enhanceResponse.ok) {
          processedCount++;
          logger.info(`✅ Photo ${photo.id} processed successfully`);
        } else {
          errorCount++;
          const errorText = await enhanceResponse.text();
          logger.error(`❌ Failed to process photo ${photo.id}: ${enhanceResponse.status} - ${errorText}`);
          
          // Mark as failed if enhancement API returned an error
          await prisma.photo.update({
            where: { id: photo.id },
            data: { status: 'FAILED' }
          });
        }
        
      } catch (error) {
        errorCount++;
        logger.error(`❌ Error processing photo ${photo.id}:`, error as Error);
        
        // Mark as failed
        await prisma.photo.update({
          where: { id: photo.id },
          data: { status: 'FAILED' }
        });
      }
    }
    
    logger.info(`🎉 Cron job completed: ${processedCount} processed, ${errorCount} errors`);
    
    return NextResponse.json({
      message: 'Photo processing completed',
      processed: processedCount,
      errors: errorCount,
      total: queuedPhotos.length
    });
    
  } catch (error) {
    logger.error('❌ Cron job failed:', error as Error);
    return NextResponse.json(
      { error: 'Cron job failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Also export as POST for manual triggering
export const POST = GET;