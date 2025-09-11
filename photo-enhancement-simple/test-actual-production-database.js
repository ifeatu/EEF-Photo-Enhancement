require('dotenv').config({ path: '.env.production' });
const { PrismaClient } = require('@prisma/client');

// Test the ACTUAL production database to see if photos are being stored
async function testActualProductionDatabase() {
  console.log('🔍 Testing ACTUAL Production Database');
  console.log('=' .repeat(50));
  
  // Set the correct environment variable for Prisma
  if (process.env.PRISMA_DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
    process.env.POSTGRES_PRISMA_URL = process.env.PRISMA_DATABASE_URL;
  } else if (process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    process.env.POSTGRES_PRISMA_URL = process.env.POSTGRES_URL;
  }
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    console.log('\n1. 🔌 Connecting to production database...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('   ✅ Production database connection successful');
    
    console.log('\n2. 📊 Checking production database content...');
    
    // Test if we can query users table
    const userCount = await prisma.user.count();
    console.log(`   👥 Users in production: ${userCount}`);
    
    // Test if we can query photos table
    const photoCount = await prisma.photo.count();
    console.log(`   📸 Photos in production: ${photoCount}`);
    
    console.log('\n3. 🔍 Analyzing recent photo activity...');
    
    // Check for recent photos
    const recentPhotos = await prisma.photo.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    });
    
    if (recentPhotos.length > 0) {
      console.log(`   📸 Found ${recentPhotos.length} recent photos in production:`);
      recentPhotos.forEach((photo, index) => {
        const timeAgo = Math.round((Date.now() - new Date(photo.createdAt).getTime()) / (1000 * 60));
        console.log(`     ${index + 1}. ID: ${photo.id}`);
        console.log(`        Status: ${photo.status}`);
        console.log(`        User: ${photo.user.email || photo.user.name || 'Unknown'}`);
        console.log(`        Created: ${timeAgo} minutes ago`);
        console.log(`        Title: ${photo.title}`);
        console.log(`        Original URL: ${photo.originalUrl ? 'YES' : 'NO'}`);
        console.log(`        Enhanced URL: ${photo.enhancedUrl ? 'YES' : 'NO'}`);
        console.log('');
      });
    } else {
      console.log('   📭 No photos found in production database');
      console.log('   ❌ This confirms photos are NOT being stored in production!');
    }
    
    console.log('\n4. 📈 Photo status breakdown...');
    
    const statusCounts = await prisma.photo.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    if (statusCounts.length > 0) {
      console.log('   📊 Photo statuses in production:');
      statusCounts.forEach(status => {
        console.log(`     ${status.status}: ${status._count.status} photos`);
      });
    } else {
      console.log('   📊 No photo status data (no photos in database)');
    }
    
    console.log('\n5. 👥 User analysis...');
    
    if (userCount > 0) {
      const usersWithPhotos = await prisma.user.findMany({
        include: {
          _count: {
            select: { photos: true }
          }
        },
        take: 5,
        orderBy: {
          photos: {
            _count: 'desc'
          }
        }
      });
      
      console.log('   👥 Top users by photo count:');
      usersWithPhotos.forEach((user, index) => {
        console.log(`     ${index + 1}. ${user.email || user.name || 'Unknown'}: ${user._count.photos} photos`);
      });
    } else {
      console.log('   👥 No users found in production database');
    }
    
    console.log('\n6. 🔧 Production Environment Check...');
    
    // Check environment variables
    const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL;
    const dbDirectUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
    
    console.log(`   🔗 Database URL configured: ${dbUrl ? 'YES' : 'NO'}`);
    console.log(`   🔗 Direct URL configured: ${dbDirectUrl ? 'YES' : 'NO'}`);
    console.log(`   🔗 Available env vars:`);
    console.log(`     - POSTGRES_PRISMA_URL: ${process.env.POSTGRES_PRISMA_URL ? 'SET' : 'NOT SET'}`);
    console.log(`     - PRISMA_DATABASE_URL: ${process.env.PRISMA_DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`     - POSTGRES_URL: ${process.env.POSTGRES_URL ? 'SET' : 'NOT SET'}`);
    console.log(`     - DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    
    
    if (dbUrl) {
      try {
        const urlParts = new URL(dbUrl);
        console.log(`   🏠 Database Host: ${urlParts.hostname}`);
        console.log(`   🗄️  Database Name: ${urlParts.pathname.substring(1)}`);
        console.log(`   🔐 Using SSL: ${urlParts.searchParams.get('sslmode') || 'default'}`);
      } catch (e) {
        console.log('   ⚠️  Could not parse database URL');
      }
    }
    
    console.log('\n7. 🕐 Recent upload attempts...');
    
    // Look for photos created in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentUploads = await prisma.photo.findMany({
      where: {
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    
    if (recentUploads.length > 0) {
      console.log(`   📤 Found ${recentUploads.length} uploads in the last 24 hours:`);
      recentUploads.forEach((photo, index) => {
        console.log(`     ${index + 1}. ${photo.id} - ${photo.status} - ${photo.user.email}`);
      });
    } else {
      console.log('   📤 No uploads found in the last 24 hours');
      console.log('   ❌ This suggests the upload endpoint is not writing to production database!');
    }
    
  } catch (error) {
    console.error('❌ Production database test failed:', error);
    
    if (error.code === 'P1001') {
      console.error('   🔌 Connection error - production database server unreachable');
    } else if (error.code === 'P1008') {
      console.error('   ⏰ Connection timeout - production database server slow to respond');
    } else if (error.code === 'P1017') {
      console.error('   🔐 Authentication failed - check production database credentials');
    } else {
      console.error('   🐛 Unexpected error:', error.message);
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Production database connection closed');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 PRODUCTION DATABASE TEST COMPLETE');
  console.log('\n📋 CRITICAL FINDINGS:');
  console.log('   1. If no photos found: Upload endpoint is NOT writing to production DB');
  console.log('   2. If photos found: Upload endpoint IS working, issue is elsewhere');
  console.log('   3. Check user count to verify this is the right production database');
  console.log('   4. Compare with local test results to confirm the disconnect');
}

testActualProductionDatabase().catch(console.error);