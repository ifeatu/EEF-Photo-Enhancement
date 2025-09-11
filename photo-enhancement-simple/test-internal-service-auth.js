require('dotenv').config({ path: '.env.production' });
const https = require('https');

async function testInternalServiceAuth() {
  console.log('🧪 Testing Internal Service Authentication');
  console.log('=' .repeat(60));

  // Get a failed photo from production database
  console.log('\n1. 🔍 Finding a failed photo to test with...');
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const failedPhoto = await prisma.photo.findFirst({
      where: { status: 'FAILED' },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!failedPhoto) {
      console.log('   ❌ No failed photos found to test');
      return;
    }
    
    console.log(`   📸 Found failed photo: ${failedPhoto.id}`);
    console.log(`   👤 User: ${failedPhoto.user.email}`);
    console.log(`   📅 Created: ${failedPhoto.createdAt}`);
    
    // Test 1: Call without internal service header (should fail with 401)
    console.log('\n2. 🚫 Testing without internal service header (should fail)...');
    await testEnhancementCall(failedPhoto.id, {}, 'No headers');
    
    // Test 2: Call with wrong internal service header (should fail with 401)
    console.log('\n3. 🚫 Testing with wrong internal service header (should fail)...');
    await testEnhancementCall(failedPhoto.id, {
      'X-Internal-Service': 'wrong-service'
    }, 'Wrong service header');
    
    // Test 3: Call with correct internal service header (should work)
    console.log('\n4. ✅ Testing with correct internal service header (should work)...');
    await testEnhancementCall(failedPhoto.id, {
      'X-Internal-Service': 'upload-service'
    }, 'Correct upload-service header');
    
    // Test 4: Call with cron processor header (should work)
    console.log('\n5. ✅ Testing with cron processor header (should work)...');
    await testEnhancementCall(failedPhoto.id, {
      'X-Internal-Service': 'cron-processor'
    }, 'Cron processor header');
    
    // Test 5: Simulate exact call from upload route
    console.log('\n6. 🎯 Simulating exact call from upload route...');
    const baseUrl = process.env.NEXTAUTH_URL || 'https://photoenhance.dev';
    await testEnhancementCall(failedPhoto.id, {
      'Content-Type': 'application/json',
      'X-Internal-Service': 'upload-service'
    }, 'Exact upload route simulation', baseUrl);
    
  } catch (error) {
    console.log('\n❌ Test Error:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 INTERNAL SERVICE AUTH TEST COMPLETE');
}

async function testEnhancementCall(photoId, headers, testName, baseUrl = 'https://photoenhance.dev') {
  console.log(`   🧪 ${testName}:`);
  
  const endpoint = `${baseUrl}/api/photos/enhance`;
  const requestBody = JSON.stringify({ photoId });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
      'User-Agent': 'Internal-Service-Test/1.0',
      ...headers
    }
  };
  
  try {
    const response = await makeHttpsRequest(endpoint, options, requestBody);
    
    console.log(`      📊 Status: ${response.statusCode}`);
    
    if (response.data) {
      try {
        const responseData = JSON.parse(response.data);
        if (response.statusCode === 200) {
          console.log(`      ✅ Success: ${responseData.message || 'Enhancement started'}`);
        } else {
          console.log(`      ❌ Error: ${responseData.error?.message || 'Unknown error'}`);
        }
      } catch (e) {
        console.log(`      📄 Raw response: ${response.data.substring(0, 200)}...`);
      }
    }
    
  } catch (error) {
    console.log(`      💥 Request failed: ${error.message}`);
  }
}

function makeHttpsRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      ...options
    };
    
    const req = https.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

testInternalServiceAuth().catch(console.error);