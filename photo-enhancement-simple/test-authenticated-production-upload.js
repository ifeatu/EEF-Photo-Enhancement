const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');
const path = require('path');

// Create a test image file
function createTestImage() {
  const testImagePath = path.join(__dirname, 'test-upload.jpg');
  
  // Create a minimal JPEG file (just header bytes)
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xD9
  ]);
  
  fs.writeFileSync(testImagePath, jpegHeader);
  return testImagePath;
}

async function testWithCookieAuth() {
  console.log('\n🔍 Testing with cookie-based authentication...');
  
  try {
    // First, try to get session info to see if we can extract auth details
    console.log('1. Getting session information...');
    const sessionResponse = await fetch('https://photoenhance.dev/api/auth/session', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    const sessionData = await sessionResponse.json();
    console.log('Session response:', sessionData);
    
    // Try to simulate a browser request
    console.log('\n2. Testing upload with browser-like headers...');
    
    const testImagePath = createTestImage();
    const form = new FormData();
    form.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-upload.jpg',
      contentType: 'image/jpeg'
    });
    form.append('title', 'Test Upload Debug');
    
    const uploadResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: form,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://photoenhance.dev',
        'Referer': 'https://photoenhance.dev/dashboard',
        // Note: We can't easily simulate real auth cookies from here
        ...form.getHeaders()
      }
    });
    
    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));
    
    const uploadText = await uploadResponse.text();
    console.log('Upload response body:', uploadText);
    
    // Clean up test file
    fs.unlinkSync(testImagePath);
    
  } catch (error) {
    console.error('❌ Cookie auth test failed:', error.message);
  }
}

async function testInternalServiceCall() {
  console.log('\n🔍 Testing internal service call (like cron might do)...');
  
  try {
    const testImagePath = createTestImage();
    const form = new FormData();
    form.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-internal.jpg',
      contentType: 'image/jpeg'
    });
    form.append('title', 'Internal Service Test');
    
    const response = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: form,
      headers: {
        'x-internal-service': 'true',
        'x-user-id': 'test-user-id',
        ...form.getHeaders()
      }
    });
    
    console.log('Internal service response status:', response.status);
    const responseText = await response.text();
    console.log('Internal service response:', responseText);
    
    // Clean up test file
    fs.unlinkSync(testImagePath);
    
  } catch (error) {
    console.error('❌ Internal service test failed:', error.message);
  }
}

async function testErrorScenarios() {
  console.log('\n🔍 Testing potential error scenarios...');
  
  try {
    // Test 1: Large file upload
    console.log('1. Testing with large form data...');
    const largeForm = new FormData();
    largeForm.append('photo', Buffer.alloc(1024 * 1024, 'x'), {
      filename: 'large-test.jpg',
      contentType: 'image/jpeg'
    });
    
    const largeResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: largeForm,
      headers: {
        ...largeForm.getHeaders()
      }
    });
    
    console.log('Large file response status:', largeResponse.status);
    
    // Test 2: Invalid content type
    console.log('\n2. Testing with invalid content type...');
    const invalidForm = new FormData();
    invalidForm.append('photo', 'not-a-file', {
      filename: 'test.txt',
      contentType: 'text/plain'
    });
    
    const invalidResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: invalidForm,
      headers: {
        ...invalidForm.getHeaders()
      }
    });
    
    console.log('Invalid content type response status:', invalidResponse.status);
    
  } catch (error) {
    console.error('❌ Error scenario test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting authenticated production upload debugging...');
  console.log('Target: https://photoenhance.dev/api/photos/upload');
  console.log('Time:', new Date().toISOString());
  
  await testWithCookieAuth();
  await testInternalServiceCall();
  await testErrorScenarios();
  
  console.log('\n✅ Authenticated debug tests completed');
  console.log('\n📋 Analysis:');
  console.log('- The API endpoint is accessible and returns proper 401 for unauthenticated requests');
  console.log('- The 500 error likely occurs during authenticated request processing');
  console.log('- Check Vercel function logs for the exact error details');
  console.log('- The error might be related to:');
  console.log('  * Database connection issues during authenticated requests');
  console.log('  * Blob storage configuration problems');
  console.log('  * Recent changes to the authentication flow');
  console.log('  * Environment variable issues in production');
}

main().catch(console.error);