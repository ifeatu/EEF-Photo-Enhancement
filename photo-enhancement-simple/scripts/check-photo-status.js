/**
 * Check Photo Status Script
 * 
 * Investigates the status of a specific photo and attempts to process it
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PHOTO_ID = 'cmffpnptl00012rfnpw5e471a';
const PRODUCTION_URL = 'https://photoenhance.dev';

class PhotoStatusChecker {
  constructor() {
    this.photoId = PHOTO_ID;
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

  async checkPhotoStatus() {
    await this.log('Checking photo status in database...', 'progress');
    
    try {
      const photo = await prisma.photo.findUnique({
        where: { id: this.photoId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              credits: true
            }
          }
        }
      });

      if (!photo) {
        await this.log('Photo not found in database', 'error');
        return null;
      }

      await this.log(`Photo found: ${photo.id}`, 'success');
      await this.log(`Status: ${photo.status}`, 'info');
      await this.log(`Title: ${photo.title || 'No title'}`, 'info');
      await this.log(`Original URL: ${photo.originalUrl}`, 'info');
      await this.log(`Enhanced URL: ${photo.enhancedUrl || 'Not enhanced'}`, 'info');
      await this.log(`Created: ${photo.createdAt}`, 'info');
      await this.log(`Updated: ${photo.updatedAt}`, 'info');
      
      if (photo.user) {
        await this.log(`User: ${photo.user.email} (${photo.user.role})`, 'info');
        await this.log(`User Credits: ${photo.user.credits}`, 'info');
      }

      return photo;
    } catch (error) {
      await this.log(`Error checking photo status: ${error.message}`, 'error');
      return null;
    }
  }

  async triggerPhotoProcessing(photo) {
    await this.log('Attempting to trigger photo processing...', 'progress');
    
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/photos/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': 'legacy-cleanup',
          'X-User-Id': photo.userId
        },
        body: JSON.stringify({
          photoId: photo.id,
          originalUrl: photo.originalUrl
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        await this.log('Photo processing triggered successfully', 'success');
        await this.log(`Response: ${JSON.stringify(data, null, 2)}`, 'info');
        return true;
      } else {
        await this.log(`Processing failed: ${response.status} ${response.statusText}`, 'error');
        await this.log(`Error: ${JSON.stringify(data, null, 2)}`, 'error');
        return false;
      }
    } catch (error) {
      await this.log(`Error triggering processing: ${error.message}`, 'error');
      return false;
    }
  }

  async updatePhotoStatus(photoId, newStatus) {
    await this.log(`Updating photo status to ${newStatus}...`, 'progress');
    
    try {
      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: {
          status: newStatus,
          updatedAt: new Date()
        }
      });

      await this.log(`Photo status updated to ${updatedPhoto.status}`, 'success');
      return updatedPhoto;
    } catch (error) {
      await this.log(`Error updating photo status: ${error.message}`, 'error');
      return null;
    }
  }

  async runCheck() {
    await this.log(`Starting photo status check for ${this.photoId}...`, 'info');
    
    try {
      // Step 1: Check current status
      const photo = await this.checkPhotoStatus();
      
      if (!photo) {
        return false;
      }

      // Step 2: If photo is stuck in PENDING, try to process it
      if (photo.status === 'PENDING') {
        await this.log('Photo is stuck in PENDING status, attempting to process...', 'warning');
        
        // Try to trigger processing
        const processed = await this.triggerPhotoProcessing(photo);
        
        if (!processed) {
          await this.log('Processing failed, you may need to manually retry', 'warning');
        }
      } else if (photo.status === 'PROCESSING') {
        await this.log('Photo is currently being processed', 'info');
      } else if (photo.status === 'COMPLETED') {
        await this.log('Photo processing completed successfully', 'success');
      } else if (photo.status === 'FAILED') {
        await this.log('Photo processing failed, attempting to retry...', 'warning');
        
        // Reset to PENDING and try again
        await this.updatePhotoStatus(photo.id, 'PENDING');
        await this.triggerPhotoProcessing({ ...photo, status: 'PENDING' });
      }

      // Step 3: Check final status
      const finalPhoto = await this.checkPhotoStatus();
      
      console.log('\n📊 FINAL STATUS REPORT');
      console.log('======================');
      console.log(`Photo ID: ${this.photoId}`);
      console.log(`Status: ${finalPhoto?.status || 'UNKNOWN'}`);
      console.log(`Enhanced URL: ${finalPhoto?.enhancedUrl || 'Not available'}`);
      console.log(`User: ${finalPhoto?.user?.email || 'Unknown'} (${finalPhoto?.user?.role || 'Unknown'})`);
      
      return true;
      
    } catch (error) {
      await this.log(`Check failed: ${error.message}`, 'error');
      return false;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run check if this file is executed directly
if (require.main === module) {
  const checker = new PhotoStatusChecker();
  checker.runCheck()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = PhotoStatusChecker;