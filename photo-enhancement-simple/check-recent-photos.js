const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkRecentPhotos() {
  console.log('🔍 Checking Recent Photos and Enhancement Failures');
  console.log('=' .repeat(60));
  
  try {
    // 1. Get recent photos (last 50)
    console.log('\n1. Recent Photos (last 50):');
    const recentPhotos = await prisma.photo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
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
    
    if (recentPhotos.length === 0) {
      console.log('   ❌ No photos found in database');
      return;
    }
    
    console.log(`   ✅ Found ${recentPhotos.length} photos`);
    
    // 2. Analyze photo statuses
    console.log('\n2. Photo Status Analysis:');
    const statusCounts = {};
    const failedPhotos = [];
    const processingPhotos = [];
    const completedPhotos = [];
    
    recentPhotos.forEach(photo => {
      statusCounts[photo.status] = (statusCounts[photo.status] || 0) + 1;
      
      if (photo.status === 'FAILED') {
        failedPhotos.push(photo);
      } else if (photo.status === 'PROCESSING') {
        processingPhotos.push(photo);
      } else if (photo.status === 'COMPLETED') {
        completedPhotos.push(photo);
      }
    });
    
    console.log('   Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
    
    // 3. Show failed photos details
    if (failedPhotos.length > 0) {
      console.log('\n3. Failed Photos Details:');
      failedPhotos.forEach((photo, index) => {
        console.log(`   Failed Photo ${index + 1}:`);
        console.log(`     ID: ${photo.id}`);
        console.log(`     Created: ${photo.createdAt}`);
        console.log(`     Updated: ${photo.updatedAt}`);
        console.log(`     User: ${photo.user?.email}`);
        console.log(`     Original URL: ${photo.originalUrl}`);
        console.log(`     Enhanced URL: ${photo.enhancedUrl || 'None'}`);
        console.log(`     URL: https://photoenhance.dev/photos/${photo.id}`);
        console.log('');
      });
    }
    
    // 4. Show long-running processing photos
    if (processingPhotos.length > 0) {
      console.log('\n4. Processing Photos (potential stuck):');
      const now = new Date();
      processingPhotos.forEach((photo, index) => {
        const processingTime = now - new Date(photo.updatedAt);
        const minutes = Math.round(processingTime / (1000 * 60));
        
        console.log(`   Processing Photo ${index + 1}:`);
        console.log(`     ID: ${photo.id}`);
        console.log(`     Processing time: ${minutes} minutes`);
        console.log(`     User: ${photo.user?.email}`);
        console.log(`     URL: https://photoenhance.dev/photos/${photo.id}`);
        
        if (minutes > 10) {
          console.log(`     ⚠️ STUCK: Processing for over 10 minutes`);
        }
        console.log('');
      });
    }
    
    // 5. Show recent completed photos
    if (completedPhotos.length > 0) {
      console.log('\n5. Recent Completed Photos (last 5):');
      completedPhotos.slice(0, 5).forEach((photo, index) => {
        console.log(`   Completed Photo ${index + 1}:`);
        console.log(`     ID: ${photo.id}`);
        console.log(`     Completed: ${photo.updatedAt}`);
        console.log(`     User: ${photo.user?.email}`);
        console.log(`     Enhanced URL: ${photo.enhancedUrl ? '✅ Present' : '❌ Missing'}`);
        console.log(`     URL: https://photoenhance.dev/photos/${photo.id}`);
        console.log('');
      });
    }
    
    // 6. Check for photos with missing enhanced URLs
    console.log('\n6. Data Consistency Check:');
    const completedWithoutUrl = completedPhotos.filter(p => !p.enhancedUrl);
    if (completedWithoutUrl.length > 0) {
      console.log(`   ⚠️ Found ${completedWithoutUrl.length} completed photos without enhanced URLs`);
      completedWithoutUrl.forEach(photo => {
        console.log(`     - ${photo.id} (${photo.user?.email})`);
      });
    } else {
      console.log('   ✅ All completed photos have enhanced URLs');
    }
    
    // 7. Summary and recommendations
    console.log('\n7. Summary & Recommendations:');
    
    if (failedPhotos.length > 0) {
      console.log(`   📊 ${failedPhotos.length} photos have failed enhancement`);
      console.log('   🔧 Recommended actions:');
      console.log('     - Check Gemini API connectivity and quotas');
      console.log('     - Verify blob storage configuration');
      console.log('     - Review enhancement service logs');
      console.log('     - Consider retry mechanism for failed photos');
    }
    
    if (processingPhotos.some(p => (new Date() - new Date(p.updatedAt)) > 600000)) {
      console.log('   ⏰ Some photos are stuck in processing state');
      console.log('   🔧 Recommended actions:');
      console.log('     - Check enhancement queue processing');
      console.log('     - Verify background job execution');
      console.log('     - Consider manual retry for stuck photos');
    }
    
    if (completedWithoutUrl.length > 0) {
      console.log('   🔗 Data consistency issues detected');
      console.log('   🔧 Recommended actions:');
      console.log('     - Investigate enhancement completion logic');
      console.log('     - Check blob storage upload process');
      console.log('     - Verify database update transactions');
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkRecentPhotos()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { checkRecentPhotos };