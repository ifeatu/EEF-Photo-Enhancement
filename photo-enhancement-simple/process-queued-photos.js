const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();

// Mock AI enhancement function for testing
function enhancePhotoWithAI(imageUrl) {
  return new Promise((resolve) => {
    // Simulate AI processing time
    setTimeout(() => {
      // Return a mock enhanced URL
      resolve(`https://example.com/enhanced/${Date.now()}.jpg`);
    }, 2000);
  });
}

// Download file function
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file async
      reject(err);
    });
  });
}

async function processQueuedPhotos() {
  try {
    console.log('🔍 Checking for queued photos...');
    
    // Find all photos with PENDING status
    const queuedPhotos = await prisma.photo.findMany({
      where: {
        status: 'PENDING'
      }
    });
    
    console.log(`📋 Found ${queuedPhotos.length} photos in queue`);
    
    if (queuedPhotos.length === 0) {
      console.log('✅ No photos in queue to process');
      return;
    }
    
    // Create downloads directory if it doesn't exist
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    for (const photo of queuedPhotos) {
      console.log(`\n🔄 Processing photo: ${photo.title || photo.filename}`);
      
      try {
        // Update status to PROCESSING
        await prisma.photo.update({
          where: { id: photo.id },
          data: { status: 'PROCESSING' }
        });
        
        console.log('   📸 Status updated to PROCESSING');
        
        // Enhance the photo
        console.log('   🤖 Enhancing with AI...');
        const enhancedUrl = await enhancePhotoWithAI(photo.url);
        
        // Update with enhanced URL and COMPLETED status
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            status: 'COMPLETED',
            enhancedUrl: enhancedUrl
          }
        });
        
        console.log('   ✅ Enhancement completed');
        console.log(`   🔗 Enhanced URL: ${enhancedUrl}`);
        
        // Download the original photo
        const originalFilename = `original_${photo.filename || `photo_${photo.id}.jpg`}`;
        const originalPath = path.join(downloadsDir, originalFilename);
        
        try {
          console.log('   ⬇️  Downloading original photo...');
          await downloadFile(photo.url, originalPath);
          console.log(`   💾 Original saved: ${originalPath}`);
        } catch (downloadError) {
          console.log(`   ⚠️  Could not download original: ${downloadError.message}`);
        }
        
        // Download the enhanced photo (mock - since we're using a fake URL)
        console.log('   📝 Enhanced photo URL saved (mock enhancement)');
        
      } catch (error) {
        console.error(`   ❌ Error processing photo ${photo.id}:`, error.message);
        
        // Update status to FAILED
        await prisma.photo.update({
          where: { id: photo.id },
          data: { status: 'FAILED' }
        });
      }
    }
    
    console.log('\n🎉 All queued photos processed!');
    console.log(`📁 Check the downloads folder: ${downloadsDir}`);
    
  } catch (error) {
    console.error('❌ Error processing queued photos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
processQueuedPhotos();