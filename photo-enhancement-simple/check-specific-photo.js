const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkSpecificPhoto() {
  console.log('🔍 Checking specific photo status...');
  console.log('=' .repeat(50));
  
  const photoId = 'cmfdzecjb00041cfn7m3p7nf5';
  
  try {
    // Get photo details
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            credits: true
          }
        }
      }
    });
    
    if (!photo) {
      console.log('❌ Photo not found in database');
      return;
    }
    
    console.log('📸 Photo Details:');
    console.log(`   ID: ${photo.id}`);
    console.log(`   Status: ${photo.status}`);
    console.log(`   Original URL: ${photo.originalUrl}`);
    console.log(`   Enhanced URL: ${photo.enhancedUrl || 'Not yet enhanced'}`);
    console.log(`   Created: ${photo.createdAt}`);
    console.log(`   Updated: ${photo.updatedAt}`);
    console.log(`   Error: ${photo.error || 'None'}`);
    
    console.log('\n👤 User Details:');
    console.log(`   ID: ${photo.user.id}`);
    console.log(`   Email: ${photo.user.email}`);
    console.log(`   Name: ${photo.user.name}`);
    console.log(`   Credits: ${photo.user.credits}`);
    
    // Check if there are any other pending photos for this user
    const userPendingPhotos = await prisma.photo.findMany({
      where: {
        userId: photo.userId,
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`\n📊 User has ${userPendingPhotos.length} pending photos total`);
    
    if (userPendingPhotos.length > 1) {
      console.log('\n📋 All pending photos for this user:');
      userPendingPhotos.forEach((p, index) => {
        console.log(`   ${index + 1}. ${p.id} (${p.createdAt})`);
      });
    }
    
    // Check recent cron job activity
    console.log('\n🔄 Checking recent enhancement activity...');
    const recentEnhancements = await prisma.photo.findMany({
      where: {
        status: 'COMPLETED',
        updatedAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    });
    
    console.log(`   ${recentEnhancements.length} photos enhanced in last 10 minutes`);
    if (recentEnhancements.length > 0) {
      console.log('   Recent enhancements:');
      recentEnhancements.forEach(p => {
        console.log(`     - ${p.id} at ${p.updatedAt}`);
      });
    }
    
    // Analyze the issue
    console.log('\n🔍 Analysis:');
    
    if (photo.status === 'PENDING') {
      const timeSinceCreation = Date.now() - photo.createdAt.getTime();
      const minutesSinceCreation = Math.floor(timeSinceCreation / (1000 * 60));
      
      console.log(`   - Photo has been pending for ${minutesSinceCreation} minutes`);
      
      if (minutesSinceCreation > 5) {
        console.log('   ⚠️  Photo should have been processed by now');
        
        if (recentEnhancements.length === 0) {
          console.log('   ❌ No recent enhancements - cron job may not be running');
        } else {
          console.log('   ⚠️  Cron job is working but this photo is stuck');
        }
        
        // Check if user has sufficient credits
        if (photo.user.credits <= 0) {
          console.log('   ❌ User has insufficient credits');
        } else {
          console.log('   ✅ User has sufficient credits');
        }
      } else {
        console.log('   ✅ Photo is recently created, may still be in queue');
      }
    } else {
      console.log(`   ✅ Photo status is ${photo.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking photo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificPhoto().catch(console.error);