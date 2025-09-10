const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

// Download file function that handles both http and https
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const client = url.startsWith('https:') ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      } else {
        file.close();
        fs.unlink(filepath, () => {}); // Delete the file async
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {}); // Delete the file async
      reject(err);
    });
  });
}

// Copy local file function
function copyLocalFile(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    fs.copyFile(sourcePath, destPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(destPath);
      }
    });
  });
}

async function downloadPhotos() {
  try {
    console.log('📸 Fetching completed photos from database...');
    
    // Find all completed photos
    const completedPhotos = await prisma.photo.findMany({
      where: {
        status: 'COMPLETED'
      }
    });
    
    console.log(`📋 Found ${completedPhotos.length} completed photos`);
    
    if (completedPhotos.length === 0) {
      console.log('✅ No completed photos to download');
      return;
    }
    
    // Create downloads directory in the current working directory
    const downloadsDir = path.join(process.cwd(), 'downloaded-photos');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
      console.log(`📁 Created downloads directory: ${downloadsDir}`);
    }
    
    for (let i = 0; i < completedPhotos.length; i++) {
      const photo = completedPhotos[i];
      console.log(`\n🔄 Processing photo ${i + 1}/${completedPhotos.length}: ${photo.title || photo.filename}`);
      
      try {
        // Download original photo
        if (photo.url) {
          const originalFilename = `original_${i + 1}_${photo.filename || `photo_${photo.id}.jpg`}`;
          const originalPath = path.join(downloadsDir, originalFilename);
          
          console.log(`   📥 Downloading original from: ${photo.url}`);
          
          if (photo.url.startsWith('http')) {
            // Download from URL
            await downloadFile(photo.url, originalPath);
            console.log(`   ✅ Original downloaded: ${originalFilename}`);
          } else {
            // Copy local file
            const sourcePath = path.resolve(photo.url);
            if (fs.existsSync(sourcePath)) {
              await copyLocalFile(sourcePath, originalPath);
              console.log(`   ✅ Original copied: ${originalFilename}`);
            } else {
              console.log(`   ⚠️  Original file not found: ${sourcePath}`);
            }
          }
        }
        
        // Download enhanced photo (if it exists and is a real URL)
        if (photo.enhancedUrl && photo.enhancedUrl.startsWith('http') && !photo.enhancedUrl.includes('example.com')) {
          const enhancedFilename = `enhanced_${i + 1}_${photo.filename || `photo_${photo.id}.jpg`}`;
          const enhancedPath = path.join(downloadsDir, enhancedFilename);
          
          console.log(`   📥 Downloading enhanced from: ${photo.enhancedUrl}`);
          await downloadFile(photo.enhancedUrl, enhancedPath);
          console.log(`   ✅ Enhanced downloaded: ${enhancedFilename}`);
        } else {
          console.log(`   📝 Enhanced URL is mock/placeholder: ${photo.enhancedUrl}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error downloading photo ${photo.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Download process completed!`);
    console.log(`📁 Check the downloads folder: ${downloadsDir}`);
    
    // List downloaded files
    const files = fs.readdirSync(downloadsDir);
    if (files.length > 0) {
      console.log(`\n📋 Downloaded files:`);
      files.forEach(file => {
        const filePath = path.join(downloadsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error downloading photos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
downloadPhotos();