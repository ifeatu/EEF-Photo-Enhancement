const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.prod' });

const prisma = new PrismaClient();

async function checkProductionPhoto() {
  console.log('🔍 Checking production photo status...');
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
      console.log('❌ Photo not found in production database either');
      console.log('\n🔍 Let me check recent photos to see if there are any pending...');
      
      const recentPhotos = await prisma.photo.findMany({
        where: {
          status: 'PENDING'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        include: {
          user: {
            select: {
              email: true,
              credits: true
            }
          }
        }
      });
      
      console.log(`\n📊 Found ${recentPhotos.length} pending photos in production:`);
      recentPhotos.forEach((p, index) => {
        const timeSinceCreation = Date.now() - p.createdAt.getTime();
        const minutesSinceCreation = Math.floor(timeSinceCreation / (1000 * 60));
        console.log(`   ${index + 1}. ${p.id} (${minutesSinceCreation}min ago, user: ${p.user.email}, credits: ${p.user.credits})`);
      });
      
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
        const timeSinceCreation = Date.now() - p.createdAt.getTime();
        const minutesSinceCreation = Math.floor(timeSinceCreation / (1000 * 60));
        console.log(`   ${index + 1}. ${p.id} (${minutesSinceCreation}min ago)`);
      });
    }
    
    // Check recent cron job activity
    console.log('\n🔄 Checking recent enhancement activity...');
    const recentEnhancements = await prisma.photo.findMany({
      where: {
        status: 'COMPLETED',
        updatedAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });
    
    console.log(`   ${recentEnhancements.length} photos enhanced in last 30 minutes`);
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
        
        // Suggest manual processing
        console.log('\n💡 Suggested Actions:');
        console.log('   1. Check if cron job is running properly');
        console.log('   2. Manually trigger photo processing');
        console.log('   3. Check for any API errors in Vercel logs');
      } else {
        console.log('   ✅ Photo is recently created, may still be in queue');
      }
    } else {
      console.log(`   ✅ Photo status is ${photo.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking photo:', error);
    if (error.message.includes('ENOTFOUND') || error.message.includes('connect')) {
      console.log('\n💡 Database connection failed. This might be because:');
      console.log('   - Production database credentials are not accessible from local environment');
      console.log('   - Database is behind a firewall or VPN');
      console.log('   - Environment variables are not properly configured');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionPhoto().catch(console.error);