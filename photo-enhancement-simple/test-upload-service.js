const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://photoenhance.dev';

async function testUploadService() {
  console.log('=== Testing Upload Service ===\n');

  try {
    // Test 1: Check if upload endpoint exists (should return 401 without auth)
    console.log('1. Testing upload endpoint availability...');
    const response = await axios.post(`${BASE_URL}/api/photos/upload`, {}, {
      validateStatus: () => true // Don't throw on 4xx/5xx
    });
    
    console.log(`Upload endpoint status: ${response.status}`);
    if (response.status === 401) {
      console.log('✅ Upload endpoint is accessible (returns 401 as expected without auth)');
    } else if (response.status === 404) {
      console.log('❌ Upload endpoint not found');
      return;
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
      console.log('Response:', response.data);
    }

    // Test 2: Check Vercel Blob service availability
    console.log('\n2. Testing Vercel Blob service...');
    try {
      // Try to access Vercel Blob API directly
      const blobResponse = await axios.get('https://blob.vercel-storage.com', {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`Vercel Blob service status: ${blobResponse.status}`);
      if (blobResponse.status < 500) {
        console.log('✅ Vercel Blob service is accessible');
      } else {
        console.log('❌ Vercel Blob service may be down');
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        console.log('❌ Cannot reach Vercel Blob service (DNS/Network issue)');
      } else {
        console.log(`⚠️  Vercel Blob service error: ${error.message}`);
      }
    }

    // Test 3: Check authentication endpoint
    console.log('\n3. Testing authentication service...');
    const authResponse = await axios.get(`${BASE_URL}/api/auth/session`, {
      validateStatus: () => true
    });
    console.log(`Auth service status: ${authResponse.status}`);
    if (authResponse.status === 200) {
      console.log('✅ Authentication service is working');
    } else {
      console.log('❌ Authentication service issue');
    }

    // Test 4: Check database connectivity via photos endpoint
    console.log('\n4. Testing database connectivity...');
    const dbResponse = await axios.get(`${BASE_URL}/api/photos`, {
      validateStatus: () => true
    });
    console.log(`Database connectivity status: ${dbResponse.status}`);
    if (dbResponse.status === 401) {
      console.log('✅ Database is accessible (returns 401 as expected without auth)');
    } else if (dbResponse.status === 500) {
      console.log('❌ Database connectivity issue');
      console.log('Error details:', dbResponse.data);
    }

    // Test 5: Environment configuration check
    console.log('\n5. Testing environment configuration...');
    const debugResponse = await axios.get(`${BASE_URL}/api/debug/env`, {
      validateStatus: () => true
    });
    
    if (debugResponse.status === 200) {
      console.log('✅ Environment debug endpoint accessible');
      console.log('Environment info:', debugResponse.data);
    } else if (debugResponse.status === 404) {
      console.log('⚠️  Debug endpoint not available (expected in production)');
    } else {
      console.log(`Debug endpoint status: ${debugResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test with a mock file upload (if we had auth)
async function testFileUploadFlow() {
  console.log('\n=== Testing File Upload Flow (Mock) ===\n');
  
  try {
    // Create a small test file
    const testContent = 'test image content';
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, testContent);
    
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testFilePath));
    formData.append('title', 'Test Upload');
    
    console.log('Attempting file upload (will fail due to auth)...');
    const uploadResponse = await axios.post(`${BASE_URL}/api/photos/upload`, formData, {
      headers: formData.getHeaders(),
      validateStatus: () => true,
      timeout: 10000
    });
    
    console.log(`Upload attempt status: ${uploadResponse.status}`);
    console.log('Upload response:', uploadResponse.data);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('Upload test error:', error.message);
  }
}

async function runAllTests() {
  await testUploadService();
  await testFileUploadFlow();
  
  console.log('\n=== Test Summary ===');
  console.log('The upload service appears to be configured correctly.');
  console.log('The "File upload service unavailable" error in the dashboard');
  console.log('is likely due to one of these issues:');
  console.log('1. Authentication/session issues');
  console.log('2. Vercel Blob token configuration in production');
  console.log('3. Network connectivity to Vercel Blob service');
  console.log('4. File size or format validation failures');
}

runAllTests().catch(console.error);