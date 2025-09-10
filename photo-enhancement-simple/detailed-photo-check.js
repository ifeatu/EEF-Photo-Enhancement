const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function detailedPhotoCheck() {
  try {
    console.log('📸 Detailed photo database check...');
    
    const photos = await prisma.photo.findMany();
    
    console.log(`\n📋 Found ${photos.length} photos in database:`);
    
    photos.forEach((photo, index) => {
      console.log(`\n--- Photo ${index + 1} ---`);
      console.log(`ID: ${photo.id}`);
      console.log(`Title: ${photo.title || 'N/A'}`);
      console.log(`Filename: ${photo.filename || 'N/A'}`);
      console.log(`Status: ${photo.status}`);
      console.log(`URL: ${photo.url || 'N/A'}`);
      console.log(`Enhanced URL: ${photo.enhancedUrl || 'N/A'}`);
      console.log(`User ID: ${photo.userId || 'N/A'}`);
      console.log(`Created: ${photo.createdAt}`);
      console.log(`Updated: ${photo.updatedAt}`);
    });
    
    // Check uploads directory
    console.log('\n📁 Checking uploads directory...');
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`Found ${files.length} files in uploads:`);
      files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`  - ${file} (${Math.round(stats.size / 1024)}KB, modified: ${stats.mtime.toLocaleString()})`);
      });
    } else {
      console.log('Uploads directory does not exist');
    }
    
    // Also check if there are any files in the root public directory
    console.log('\n📁 Checking public directory...');
    const publicDir = path.join(__dirname, 'public');
    
    if (fs.existsSync(publicDir)) {
      const files = fs.readdirSync(publicDir);
      console.log(`Found ${files.length} items in public:`);
      files.forEach(item => {
        const itemPath = path.join(publicDir, item);
        const stats = fs.statSync(itemPath);
        const type = stats.isDirectory() ? 'DIR' : 'FILE';
        const size = stats.isFile() ? `${Math.round(stats.size / 1024)}KB` : '';
        console.log(`  - ${item} (${type} ${size})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

detailedPhotoCheck();