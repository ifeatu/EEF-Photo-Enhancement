/**
 * Fix Stuck Completed Photos Script
 * 
 * Identifies photos marked as COMPLETED but have identical original and enhanced URLs
 * (indicating the enhancement actually failed but was marked as complete)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PRODUCTION_URL = 'https://photoenhance.dev';

class StuckCompletedPhotosFixer {
  constructor() {
    this.processedCount = 0;
    this.fixedCount = 0;
    this.errors = [];
  }

  async log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const statusEmoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '🔄'
    };
    console.log(`${statusEmoji[status]} [${timestamp}] ${message}`);
  }

  async findStuckCompletedPhotos() {
    await this.log('Searching for stuck completed photos...', 'progress');
    
    try {
      // Find photos that are COMPLETED but have issues:
      // 1. Enhanced URL is null
      // 2. Enhanced URL is the same as original URL
      // 3. Enhanced URL points to original file (indicating fallback)
      
      const stuckPhotos = await prisma.photo.findMany({
        where: {
          status: 'COMPLETED',
          OR: [
            { enhancedUrl: null },
            { enhancedUrl: { equals: prisma.photo.fields.originalUrl } }
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

      await this.log(`Found ${stuckPhotos.length} potentially stuck completed photos`, stuckPhotos.length > 0 ? 'warning' : 'success');
      
      return stuckPhotos;
    } catch (error) {
      await this.log(`Error finding stuck photos: ${error.message}`, 'error');
      return [];
    }
  }

  async analyzePhoto(photo) {
    const issues = [];
    
    if (!photo.enhancedUrl) {
      issues.push('Missing enhanced URL');
    } else if (photo.enhancedUrl === photo.originalUrl) {
      issues.push('Enhanced URL identical to original URL');
    } else {
      // Check if the URLs are essentially the same (just different domains/paths)
      const originalBasename = photo.originalUrl.split('/').pop();
      const enhancedBasename = photo.enhancedUrl.split('/').pop();
      
      if (originalBasename === enhancedBasename) {
        issues.push('Enhanced and original appear to be the same file');
      }
    }

    const timeSinceCreated = Date.now() - new Date(photo.createdAt).getTime();
    const hoursOld = Math.round(timeSinceCreated / (1000 * 60 * 60));
    
    return {
      issues,
      hoursOld,
      needsReprocessing: issues.length > 0
    };
  }

  async reprocessPhoto(photo) {
    await this.log(`Attempting to reprocess photo ${photo.id}...`, 'progress');
    
    try {
      // First, reset the photo status to PENDING
      await prisma.photo.update({
        where: { id: photo.id },
        data: {
          status: 'PENDING',
          enhancedUrl: null,
          updatedAt: new Date()
        }
      });
      
      await this.log(`Reset photo ${photo.id} to PENDING status`, 'info');
      
      // Then call the enhancement API
      const response = await fetch(`${PRODUCTION_URL}/api/photos/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': 'stuck-photo-fixer',
          'X-User-Id': photo.user.id
        },
        body: JSON.stringify({
          photoId: photo.id,
          originalUrl: photo.originalUrl
        })
      });

      if (response.ok) {
        const result = await response.json();
        await this.log(`Successfully reprocessed photo ${photo.id}`, 'success');
        await this.log(`Enhanced URL: ${result.data?.enhancedUrl || 'Not provided'}`, 'info');
        this.fixedCount++;
        return { success: true, result };
      } else {
        const errorText = await response.text();
        await this.log(`Reprocessing failed for photo ${photo.id}: ${response.status} ${errorText}`, 'error');
        this.errors.push({
          photoId: photo.id,
          error: errorText,
          httpStatus: response.status
        });
        return { success: false, error: errorText };
      }
    } catch (error) {
      await this.log(`Error reprocessing photo ${photo.id}: ${error.message}`, 'error');
      this.errors.push({
        photoId: photo.id,
        error: error.message,
        type: 'processing_error'
      });
      return { success: false, error: error.message };
    }
  }

  async run() {
    await this.log('Starting stuck completed photos analysis and fix...', 'info');
    
    try {
      // Step 1: Find stuck photos
      const stuckPhotos = await this.findStuckCompletedPhotos();
      
      if (stuckPhotos.length === 0) {
        await this.log('No stuck completed photos found - all good!', 'success');
        return;
      }

      // Step 2: Analyze each photo
      await this.log('Analyzing photos for issues...', 'progress');
      
      for (const photo of stuckPhotos) {
        this.processedCount++;
        
        const analysis = await this.analyzePhoto(photo);
        
        await this.log(`Photo ${photo.id} (${analysis.hoursOld}h old):`, 'info');
        await this.log(`  - User: ${photo.user.email} (${photo.user.role})`, 'info');
        await this.log(`  - Original: ${photo.originalUrl}`, 'info');
        await this.log(`  - Enhanced: ${photo.enhancedUrl || 'NULL'}`, 'info');
        
        if (analysis.issues.length > 0) {
          await this.log(`  - Issues: ${analysis.issues.join(', ')}`, 'warning');
          
          if (analysis.needsReprocessing) {
            await this.log(`  - Action: Reprocessing...`, 'progress');
            const result = await this.reprocessPhoto(photo);
            
            if (result.success) {
              await this.log(`  - Result: ✅ Fixed successfully`, 'success');
            } else {
              await this.log(`  - Result: ❌ Failed to fix`, 'error');
            }
          }
        } else {
          await this.log(`  - Status: No issues found`, 'success');
        }
        
        await this.log('', 'info'); // Empty line for readability
      }

      // Step 3: Summary
      await this.log('=== SUMMARY ===', 'info');
      await this.log(`Total photos analyzed: ${this.processedCount}`, 'info');
      await this.log(`Photos successfully fixed: ${this.fixedCount}`, 'success');
      await this.log(`Photos with errors: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'success');
      
      if (this.errors.length > 0) {
        await this.log('Errors encountered:', 'error');
        this.errors.forEach((err, i) => {
          console.log(`  ${i + 1}. Photo ${err.photoId}: ${err.error}`);
        });
      }

    } catch (error) {
      await this.log(`Script failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the fixer if this file is executed directly
if (require.main === module) {
  const fixer = new StuckCompletedPhotosFixer();
  fixer.run()
    .then(() => {
      console.log('✅ Stuck completed photos fix completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = StuckCompletedPhotosFixer;