// Test script to check production API endpoints
const https = require('https');
const fs = require('fs');

const PRODUCTION_URL = 'https://photoenhance-frontend-a772utho2-pierre-malbroughs-projects.vercel.app';

async function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'photoenhance-frontend-a772utho2-pierre-malbroughs-projects.vercel.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('Testing production API endpoints...');
  
  try {
    // Test basic health check
    console.log('\n1. Testing root endpoint...');
    const rootTest = await testEndpoint('/');
    console.log(`Status: ${rootTest.status}`);
    
    // Test API route that doesn't require auth
    console.log('\n2. Testing auth signin endpoint...');
    const signinTest = await testEndpoint('/auth/signin');
    console.log(`Status: ${signinTest.status}`);
    
    // Test upload endpoint (should return 401 without auth)
    console.log('\n3. Testing upload endpoint (should return 401)...');
    const uploadTest = await testEndpoint('/api/photos/upload', 'POST', {});
    console.log(`Status: ${uploadTest.status}`);
    if (uploadTest.data) {
      console.log('Response:', uploadTest.data.substring(0, 200));
    }
    
    // Test enhance endpoint (should return 401 without auth)
    console.log('\n4. Testing enhance endpoint (should return 401)...');
    const enhanceTest = await testEndpoint('/api/photos/enhance', 'POST', { photoId: 'test' });
    console.log(`Status: ${enhanceTest.status}`);
    if (enhanceTest.data) {
      console.log('Response:', enhanceTest.data.substring(0, 200));
    }
    
    console.log('\n=== Test Summary ===');
    console.log(`Root: ${rootTest.status}`);
    console.log(`Signin: ${signinTest.status}`);
    console.log(`Upload: ${uploadTest.status}`);
    console.log(`Enhance: ${enhanceTest.status}`);
    
    if (uploadTest.status === 500 || enhanceTest.status === 500) {
      console.log('\n⚠️  Found 500 errors in API endpoints!');
    } else {
      console.log('\n✅ No 500 errors found in basic API tests');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();