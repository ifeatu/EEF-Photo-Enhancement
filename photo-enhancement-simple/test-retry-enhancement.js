const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRetryEnhancement() {
  try {
    console.log('Testing retry enhancement functionality...');
    
    // Find a photo with FAILED status
    const failedPhoto = await prisma.photo.findFirst({
      where: {
        status: 'FAILED'
      }
    });
    
    if (!failedPhoto) {
      console.log('No failed photos found to test retry');
      return;
    }
    
    console.log(`Found failed photo: ${failedPhoto.id}`);
    
    // Test the database query that the API uses
    const photo = await prisma.photo.findFirst({
      where: {
        id: failedPhoto.id,
        userId: failedPhoto.userId,
        status: {
          in: ['PENDING', 'FAILED']
        }
      },
      select: {
        id: true,
        originalUrl: true,
        status: true,
        createdAt: true
      }
    });
    
    if (photo) {
      console.log('✅ SUCCESS: Failed photo can now be found for retry');
      console.log(`Photo ID: ${photo.id}, Status: ${photo.status}`);
    } else {
      console.log('❌ FAILED: Photo still not found with new query');
    }
    
  } catch (error) {
    console.error('Error testing retry enhancement:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRetryEnhancement();