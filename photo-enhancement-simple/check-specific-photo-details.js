require('dotenv').config({ path: '.env.production' });

// Set up environment variables for Prisma
process.env.POSTGRES_PRISMA_URL = process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
process.env.POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPhotoDetails() {
  try {
    console.log('Checking photo details for ID: cmffllhdx00012vfmr83m0ld5');
    
    const photo = await prisma.photo.findUnique({
      where: { id: 'cmffllhdx00012vfmr83m0ld5' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            credits: true
          }
        }
      }
    });
    
    if (photo) {
      console.log('\n=== PHOTO DETAILS ===');
      console.log('ID:', photo.id);
      console.log('Title:', photo.title);
      console.log('Status:', photo.status);
      console.log('Original URL:', photo.originalUrl);
      console.log('Enhanced URL:', photo.enhancedUrl);
      console.log('Created:', photo.createdAt);
      console.log('Updated:', photo.updatedAt);
      console.log('User ID:', photo.userId);
      console.log('User Email:', photo.user?.email);
      console.log('User Credits:', photo.user?.credits);
      
      // Check if files exist in blob storage
      console.log('\n=== FILE ANALYSIS ===');
      if (photo.originalUrl) {
        console.log('Original file URL exists:', photo.originalUrl);
      } else {
        console.log('❌ No original file URL');
      }
      
      if (photo.enhancedUrl) {
        console.log('Enhanced file URL exists:', photo.enhancedUrl);
      } else {
        console.log('❌ No enhanced file URL');
      }
      
      // Analyze the failure
      console.log('\n=== FAILURE ANALYSIS ===');
      if (photo.status === 'FAILED') {
        console.log('❌ Photo enhancement failed');
        console.log('Possible reasons based on our troubleshooting:');
        console.log('1. Gemini API issues during enhancement');
        console.log('2. Image processing errors with Sharp');
        console.log('3. Blob storage upload failures');
        console.log('4. Database update failures during enhancement');
      }
      
    } else {
      console.log('❌ Photo not found in database');
    }
    
  } catch (error) {
    console.error('Error checking photo details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotoDetails();