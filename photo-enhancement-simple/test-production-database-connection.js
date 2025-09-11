require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

// Test database connection and basic operations
async function testProductionDatabaseConnection() {
  console.log('🔍 Testing Production Database Connection');
  console.log('=' .repeat(50));
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    console.log('\n1. 🔌 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('   ✅ Database connection successful');
    
    console.log('\n2. 📊 Checking database schema...');
    
    // Test if we can query users table
    const userCount = await prisma.user.count();
    console.log(`   ✅ Users table accessible - ${userCount} users found`);
    
    // Test if we can query photos table
    const photoCount = await prisma.photo.count();
    console.log(`   ✅ Photos table accessible - ${photoCount} photos found`);
    
    console.log('\n3. 🧪 Testing write operations...');
    
    // Test creating a test record (we'll delete it immediately)
    const testUser = await prisma.user.findFirst();
    if (testUser) {
      console.log(`   📝 Found test user: ${testUser.id}`);
      
      // Try to create a test photo record
      const testPhoto = await prisma.photo.create({
        data: {
          userId: testUser.id,
          originalUrl: 'https://test-url.com/test.jpg',
          status: 'PENDING',
          title: 'Database Connection Test Photo',
          description: 'This is a test photo to verify database writes work',
        },
      });
      
      console.log(`   ✅ Test photo created successfully with ID: ${testPhoto.id}`);
      
      // Immediately delete the test photo
      await prisma.photo.delete({
        where: { id: testPhoto.id }
      });
      
      console.log(`   🗑️  Test photo deleted successfully`);
      
    } else {
      console.log('   ⚠️  No users found in database - cannot test photo creation');
    }
    
    console.log('\n4. 🔍 Checking recent photo activity...');
    
    // Check for recent photos
    const recentPhotos = await prisma.photo.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    
    if (recentPhotos.length > 0) {
      console.log(`   📸 Found ${recentPhotos.length} recent photos:`);
      recentPhotos.forEach((photo, index) => {
        console.log(`     ${index + 1}. ID: ${photo.id}, Status: ${photo.status}, User: ${photo.user.email}, Created: ${photo.createdAt}`);
      });
    } else {
      console.log('   📭 No recent photos found in database');
    }
    
    console.log('\n5. 🔧 Environment Check...');
    
    // Check environment variables
    const dbUrl = process.env.POSTGRES_PRISMA_URL;
    const dbDirectUrl = process.env.POSTGRES_URL_NON_POOLING;
    
    console.log(`   🔗 Database URL configured: ${dbUrl ? 'YES' : 'NO'}`);
    console.log(`   🔗 Direct URL configured: ${dbDirectUrl ? 'YES' : 'NO'}`);
    
    if (dbUrl) {
      const urlParts = new URL(dbUrl);
      console.log(`   🏠 Database Host: ${urlParts.hostname}`);
      console.log(`   🗄️  Database Name: ${urlParts.pathname.substring(1)}`);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    if (error.code === 'P1001') {
      console.error('   🔌 Connection error - database server unreachable');
    } else if (error.code === 'P1008') {
      console.error('   ⏰ Connection timeout - database server slow to respond');
    } else if (error.code === 'P1017') {
      console.error('   🔐 Authentication failed - check database credentials');
    } else {
      console.error('   🐛 Unexpected error:', error.message);
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 DATABASE CONNECTION TEST COMPLETE');
}

testProductionDatabaseConnection().catch(console.error);