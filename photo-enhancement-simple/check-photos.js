const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPhotos() {
  try {
    console.log('Checking photo statuses...');
    
    const photos = await prisma.photo.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`Found ${photos.length} photos:`);
    console.log('\n--- Photo Status Report ---');
    
    photos.forEach((photo, index) => {
      const timeSinceUpdate = Date.now() - new Date(photo.updatedAt).getTime();
      const minutesAgo = Math.floor(timeSinceUpdate / (1000 * 60));
      
      console.log(`${index + 1}. ${photo.title || 'Untitled'}`);
      console.log(`   ID: ${photo.id}`);
      console.log(`   Status: ${photo.status}`);
      console.log(`   Created: ${photo.createdAt.toLocaleString()}`);
      console.log(`   Updated: ${photo.updatedAt.toLocaleString()} (${minutesAgo} minutes ago)`);
      console.log('');
    });
    
    // Count by status
    const statusCounts = photos.reduce((acc, photo) => {
      acc[photo.status] = (acc[photo.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('--- Status Summary ---');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status.toUpperCase()}: ${count}`);
    });
    
    // Check for stuck processing photos
    const processingPhotos = photos.filter(p => p.status === 'PROCESSING');
    if (processingPhotos.length > 0) {
      console.log('\n--- Potentially Stuck Photos ---');
      processingPhotos.forEach(photo => {
        const timeSinceUpdate = Date.now() - new Date(photo.updatedAt).getTime();
        const minutesAgo = Math.floor(timeSinceUpdate / (1000 * 60));
        if (minutesAgo > 5) {
          console.log(`⚠️  ${photo.title || 'Untitled'} (${photo.id}) - Processing for ${minutesAgo} minutes`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error checking photos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotos();