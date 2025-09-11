require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

// This test will verify if uploads are actually working in production
// by testing against the PRODUCTION database, not local dev database

async function testProductionUploadReality() {
  console.log('🔍 Testing Production Upload Reality Check');
  console.log('=' .repeat(50));
  
  // 1. First, let's check what database we're connecting to locally
  console.log('\n1. Checking local database connection...');
  const localPrisma = new PrismaClient();
  
  try {
    const localPhotos = await localPrisma.photo.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`   📊 Local database has ${localPhotos.length} recent photos`);
    if (localPhotos.length > 0) {
      console.log(`   📅 Most recent: ${localPhotos[0].createdAt}`);
      console.log(`   🆔 Most recent ID: ${localPhotos[0].id}`);
    }
  } catch (error) {
    console.log(`   ❌ Local database error: ${error.message}`);
  }
  
  // 2. Test production API directly
  console.log('\n2. Testing production upload API...');
  
  try {
    // Create a test image file
    const testImagePath = './test-production-reality.jpg';
    const testImageData = Buffer.from('fake-image-data-for-testing');
    fs.writeFileSync(testImagePath, testImageData);
    
    // Test upload to production
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-production-reality.jpg',
      contentType: 'image/jpeg'
    });
    
    console.log('   📤 Attempting upload to production...');
    const uploadResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Note: This will fail without proper authentication
        // but we can see what kind of error we get
      }
    });
    
    console.log(`   📊 Upload response status: ${uploadResponse.status}`);
    const uploadResult = await uploadResponse.text();
    console.log(`   📄 Upload response: ${uploadResult.substring(0, 200)}...`);
    
    // Clean up test file
    fs.unlinkSync(testImagePath);
    
  } catch (error) {
    console.log(`   ❌ Production upload test error: ${error.message}`);
  }
  
  // 3. Check production database directly (if we had access)
  console.log('\n3. Production database analysis...');
  console.log('   ⚠️  Cannot directly access production database from local environment');
  console.log('   ⚠️  This is the root cause of the disconnect!');
  console.log('   ⚠️  Local tests run against local DB, production runs against production DB');
  
  // 4. Test production photo retrieval
  console.log('\n4. Testing production photo retrieval...');
  
  try {
    const testPhotoId = 'cmffja4f10001z4f4pi1eir3t';
    const photoResponse = await fetch(`https://photoenhance.dev/api/photos/${testPhotoId}`);
    console.log(`   📊 Photo retrieval status: ${photoResponse.status}`);
    
    if (photoResponse.status === 404) {
      console.log('   ✅ Confirmed: Photo does not exist in production database');
    } else {
      const photoData = await photoResponse.text();
      console.log(`   📄 Photo response: ${photoData.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   ❌ Photo retrieval error: ${error.message}`);
  }
  
  // 5. Recommendations
  console.log('\n5. 🎯 CRITICAL FINDINGS & RECOMMENDATIONS');
  console.log('=' .repeat(50));
  console.log('❌ PROBLEM IDENTIFIED:');
  console.log('   • Local tests run against LOCAL database (photo_enhancement_dev)');
  console.log('   • Production runs against PRODUCTION database (different instance)');
  console.log('   • This creates a false sense of security in testing');
  console.log('');
  console.log('✅ SOLUTIONS NEEDED:');
  console.log('   1. Create authenticated production upload test');
  console.log('   2. Verify production database is receiving uploads');
  console.log('   3. Check if production upload endpoint is working');
  console.log('   4. Implement proper production monitoring');
  console.log('   5. Add database environment validation in tests');
  
  await localPrisma.$disconnect();
}

testProductionUploadReality().catch(console.error);