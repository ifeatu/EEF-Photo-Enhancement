const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function debugSpecificPhoto() {
  const photoId = 'cmffja4f10001z4f4pi1eir3t';
  
  console.log(`🔍 Debugging Photo Enhancement Failure`);
  console.log(`Photo ID: ${photoId}`);
  console.log('=' .repeat(50));
  
  try {
    // 1. Check if photo exists in database
    console.log('\n1. Checking photo in database...');
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
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
    
    if (!photo) {
      console.log('❌ Photo not found in database');
      return;
    }
    
    console.log('✅ Photo found:');
    console.log(`   Status: ${photo.status}`);
    console.log(`   Original URL: ${photo.originalUrl}`);
    console.log(`   Enhanced URL: ${photo.enhancedUrl || 'None'}`);
    console.log(`   Created: ${photo.createdAt}`);
    console.log(`   Updated: ${photo.updatedAt}`);
    console.log(`   User: ${photo.user?.email} (Credits: ${photo.user?.credits})`);
    
    // 2. Check enhancement attempts/logs
    console.log('\n2. Checking enhancement history...');
    
    // Look for any enhancement logs or attempts
    const enhancementLogs = await prisma.$queryRaw`
      SELECT * FROM "Photo" 
      WHERE id = ${photoId}
      ORDER BY "updatedAt" DESC
    `;
    
    console.log('Enhancement history:', enhancementLogs);
    
    // 3. Test current photo accessibility
    console.log('\n3. Testing photo accessibility...');
    
    try {
      const response = await fetch(`https://photoenhance.dev/photos/${photoId}`);
      console.log(`   Web page status: ${response.status}`);
      
      if (response.status === 200) {
        const html = await response.text();
        if (html.includes('Failed to fetch')) {
          console.log('   ❌ Page shows "Failed to fetch" error');
        } else {
          console.log('   ✅ Page loads successfully');
        }
      }
    } catch (error) {
      console.log(`   ❌ Error accessing page: ${error.message}`);
    }
    
    // 4. Check if original image is accessible
    if (photo.originalUrl) {
      console.log('\n4. Testing original image accessibility...');
      try {
        const imageResponse = await fetch(photo.originalUrl, { method: 'HEAD' });
        console.log(`   Original image status: ${imageResponse.status}`);
        console.log(`   Content-Type: ${imageResponse.headers.get('content-type')}`);
        console.log(`   Content-Length: ${imageResponse.headers.get('content-length')}`);
      } catch (error) {
        console.log(`   ❌ Error accessing original image: ${error.message}`);
      }
    }
    
    // 5. Check if enhanced image exists (if URL is present)
    if (photo.enhancedUrl) {
      console.log('\n5. Testing enhanced image accessibility...');
      try {
        const enhancedResponse = await fetch(photo.enhancedUrl, { method: 'HEAD' });
        console.log(`   Enhanced image status: ${enhancedResponse.status}`);
        console.log(`   Content-Type: ${enhancedResponse.headers.get('content-type')}`);
        console.log(`   Content-Length: ${enhancedResponse.headers.get('content-length')}`);
      } catch (error) {
        console.log(`   ❌ Error accessing enhanced image: ${error.message}`);
      }
    }
    
    // 6. Analyze potential failure reasons
    console.log('\n6. Failure Analysis:');
    
    if (photo.status === 'FAILED') {
      console.log('   ❌ Photo enhancement explicitly failed');
      console.log('   Possible reasons:');
      console.log('   - AI service error (Gemini API issues)');
      console.log('   - Image processing timeout');
      console.log('   - Storage service failure');
      console.log('   - Network connectivity issues');
    } else if (photo.status === 'PROCESSING') {
      console.log('   ⏳ Photo is still processing');
      const processingTime = Date.now() - new Date(photo.updatedAt).getTime();
      console.log(`   Processing time: ${Math.round(processingTime / 1000)} seconds`);
      
      if (processingTime > 300000) { // 5 minutes
        console.log('   ⚠️ Processing time exceeds normal limits (>5 minutes)');
      }
    } else if (photo.status === 'PENDING') {
      console.log('   ⏸️ Photo enhancement never started');
      console.log('   Possible reasons:');
      console.log('   - User ran out of credits');
      console.log('   - Enhancement service not triggered');
      console.log('   - Queue processing issues');
    } else if (photo.status === 'COMPLETED' && !photo.enhancedUrl) {
      console.log('   ⚠️ Status is COMPLETED but no enhanced URL');
      console.log('   This indicates a data consistency issue');
    }
    
    // 7. Check user credits
    if (photo.user && photo.user.credits <= 0) {
      console.log('\n   ⚠️ User has insufficient credits for enhancement');
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  debugSpecificPhoto()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugSpecificPhoto };