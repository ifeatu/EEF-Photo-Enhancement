require('dotenv').config({ path: '.env.production' });
const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

async function testEnhancementEndpoint() {
  console.log('🧪 Testing Enhancement Endpoint in Production');
  console.log('=' .repeat(60));

  // Get a failed photo from production database
  console.log('\n1. 🔍 Finding a failed photo to retry...');
  
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
    console.log(`   🔗 Original URL: ${failedPhoto.originalUrl}`);
    
    // Test the enhancement endpoint directly
    console.log('\n2. 🚀 Testing enhancement endpoint...');
    
    const enhanceUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://photoenhance.dev';
    const endpoint = `${enhanceUrl}/api/photos/enhance`;
    
    console.log(`   🎯 Endpoint: ${endpoint}`);
    
    const requestBody = JSON.stringify({
      photoId: failedPhoto.id,
      isRetry: true
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'User-Agent': 'Production-Test/1.0'
      }
    };
    
    console.log('   📤 Making enhancement request...');
    
    const response = await makeHttpsRequest(endpoint, options, requestBody);
    
    console.log(`   📥 Response Status: ${response.statusCode}`);
    console.log(`   📥 Response Headers:`, response.headers);
    
    if (response.data) {
      try {
        const responseData = JSON.parse(response.data);
        console.log(`   📥 Response Data:`, responseData);
      } catch (e) {
        console.log(`   📥 Response Data (raw): ${response.data}`);
      }
    }
    
    // Check if photo status changed
    console.log('\n3. 🔄 Checking photo status after enhancement...');
    const updatedPhoto = await prisma.photo.findUnique({
      where: { id: failedPhoto.id }
    });
    
    console.log(`   📊 Status before: ${failedPhoto.status}`);
    console.log(`   📊 Status after: ${updatedPhoto.status}`);
    console.log(`   🔗 Enhanced URL: ${updatedPhoto.enhancedUrl || 'None'}`);
    
    if (updatedPhoto.status === 'COMPLETED') {
      console.log('   ✅ Enhancement successful!');
    } else if (updatedPhoto.status === 'PROCESSING') {
      console.log('   ⏳ Enhancement in progress...');
    } else {
      console.log('   ❌ Enhancement still failed');
    }
    
  } catch (error) {
    console.log('\n❌ Test Error:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 ENHANCEMENT ENDPOINT TEST COMPLETE');
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

testEnhancementEndpoint().catch(console.error);