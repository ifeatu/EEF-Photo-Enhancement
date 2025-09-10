const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://photoenhance.dev';

async function testAuthenticatedUpload() {
  console.log('=== Testing Authenticated Upload Simulation ===\n');

  try {
    // Test 1: Simulate login to get session
    console.log('1. Testing login flow...');
    
    // First, get the signin page to see if auth is working
    const signinResponse = await axios.get(`${BASE_URL}/api/auth/signin`, {
      validateStatus: () => true
    });
    console.log(`Signin page status: ${signinResponse.status}`);
    
    // Test 2: Check if we can access the upload page (should redirect to login)
    console.log('\n2. Testing upload page access...');
    const uploadPageResponse = await axios.get(`${BASE_URL}/upload`, {
      validateStatus: () => true,
      maxRedirects: 0 // Don't follow redirects
    });
    console.log(`Upload page status: ${uploadPageResponse.status}`);
    if (uploadPageResponse.status === 302 || uploadPageResponse.status === 307) {
      console.log('✅ Upload page correctly redirects unauthenticated users');
      console.log('Redirect location:', uploadPageResponse.headers.location);
    }

    // Test 3: Try to access dashboard (should also redirect)
    console.log('\n3. Testing dashboard access...');
    const dashboardResponse = await axios.get(`${BASE_URL}/dashboard`, {
      validateStatus: () => true,
      maxRedirects: 0
    });
    console.log(`Dashboard status: ${dashboardResponse.status}`);
    if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
      console.log('✅ Dashboard correctly redirects unauthenticated users');
    }

    // Test 4: Check what happens with invalid session token
    console.log('\n4. Testing with invalid session token...');
    const invalidTokenResponse = await axios.post(`${BASE_URL}/api/photos/upload`, {}, {
      headers: {
        'Cookie': 'next-auth.session-token=invalid-token-12345'
      },
      validateStatus: () => true
    });
    console.log(`Invalid token upload status: ${invalidTokenResponse.status}`);
    console.log('Invalid token response:', invalidTokenResponse.data);

    // Test 5: Test with malformed request
    console.log('\n5. Testing malformed upload request...');
    const malformedResponse = await axios.post(`${BASE_URL}/api/photos/upload`, 
      'invalid-form-data', {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      validateStatus: () => true
    });
    console.log(`Malformed request status: ${malformedResponse.status}`);
    console.log('Malformed response:', malformedResponse.data);

    // Test 6: Check if there are any server errors in the logs
    console.log('\n6. Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`, {
      validateStatus: () => true
    });
    console.log(`Health check status: ${healthResponse.status}`);
    if (healthResponse.status === 404) {
      console.log('⚠️  No health endpoint (normal for this app)');
    }

    // Test 7: Check if the issue is with file processing
    console.log('\n7. Testing file processing capabilities...');
    
    // Create a small test image file (1x1 pixel PNG)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // RGB, no compression
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, // Image data
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, // IEND chunk
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const testImagePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testImagePath, pngData);
    
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    formData.append('title', 'Test Image Upload');
    
    const fileUploadResponse = await axios.post(`${BASE_URL}/api/photos/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Cookie': 'next-auth.session-token=test-token'
      },
      validateStatus: () => true,
      timeout: 15000
    });
    
    console.log(`File upload test status: ${fileUploadResponse.status}`);
    console.log('File upload response:', fileUploadResponse.data);
    
    // Clean up
    fs.unlinkSync(testImagePath);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

// Additional test to check Vercel Blob token validity
async function testBlobTokenValidity() {
  console.log('\n=== Testing Blob Token Validity ===\n');
  
  // We can't directly test the blob token without the actual token,
  // but we can check if the error message gives us clues
  console.log('Checking for common Blob token issues:');
  console.log('1. Token format: Should start with "vercel_blob_rw_"');
  console.log('2. Token permissions: Should have read/write access');
  console.log('3. Token expiration: Should not be expired');
  console.log('4. Project association: Should be linked to correct Vercel project');
  
  // Test if we can reach the Vercel API
  try {
    const vercelApiResponse = await axios.get('https://api.vercel.com/v1/user', {
      validateStatus: () => true,
      timeout: 5000
    });
    console.log(`\nVercel API accessibility: ${vercelApiResponse.status}`);
    if (vercelApiResponse.status === 401 || vercelApiResponse.status === 403) {
      console.log('✅ Vercel API is accessible (returns auth error as expected)');
    }
  } catch (error) {
    console.log('⚠️  Cannot reach Vercel API:', error.message);
  }
}

async function runDiagnostics() {
  await testAuthenticatedUpload();
  await testBlobTokenValidity();
  
  console.log('\n=== Diagnostic Summary ===');
  console.log('Based on the tests, the "File upload service unavailable" error could be caused by:');
  console.log('');
  console.log('🔍 Most Likely Causes:');
  console.log('1. User authentication session expired or invalid');
  console.log('2. Vercel Blob token has insufficient permissions');
  console.log('3. File size exceeds limits (check browser network tab)');
  console.log('4. CORS issues with file upload from browser');
  console.log('');
  console.log('🔧 Recommended Actions:');
  console.log('1. Check browser console for JavaScript errors');
  console.log('2. Check browser network tab for actual error response');
  console.log('3. Try logging out and logging back in');
  console.log('4. Verify file size is under limits');
  console.log('5. Test with different file types/sizes');
}

runDiagnostics().catch(console.error);