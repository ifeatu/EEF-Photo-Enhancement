const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearUserQueue() {
  try {
    console.log('🧹 Clearing user photo queue...');
    
    // Get all photos
    const photos = await prisma.photo.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${photos.length} photos to clear:`);
    photos.forEach((photo, index) => {
      console.log(`${index + 1}. ${photo.title} (${photo.status}) - ${photo.id}`);
    });
    
    if (photos.length === 0) {
      console.log('✅ No photos to clear.');
      return;
    }
    
    // Delete all photos
    const deleteResult = await prisma.photo.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.count} photos from queue`);
    
    console.log('✅ User photo queue cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing user queue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearUserQueue();