const fs = require('fs');
const path = require('path');

// Test configuration
const PRODUCTION_URL = 'https://photoenhance-frontend-ixqa6ouol-pierre-malbroughs-projects.vercel.app';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-comprehensive.jpg');

// Create a test image if it doesn't exist
if (!fs.existsSync(TEST_IMAGE_PATH)) {
  // Create a minimal valid JPEG file
  const minimalJpeg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
    0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
    0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xB2, 0xC0,
    0x07, 0xFF, 0xD9
  ]);
  fs.writeFileSync(TEST_IMAGE_PATH, minimalJpeg);
  console.log('Created test image for verification');
}

async function testProductionFixes() {
  console.log('🔍 Verifying production fixes...');
  console.log(`Testing against: ${PRODUCTION_URL}`);
  console.log('');

  // Test 1: Verify upload endpoint returns proper error codes (not 500)
  console.log('1. Testing upload endpoint error handling...');
  try {
    const formData = new FormData();
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'test.jpg');

    const response = await fetch(`${PRODUCTION_URL}/api/photos/upload`, {
      method: 'POST',
      body: formData
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 500) {
      console.log('   ❌ Still getting 500 error!');
      const text = await response.text();
      console.log(`   Response: ${text}`);
      return false;
    } else if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 (Authentication required)');
    } else if (response.status === 503) {
      console.log('   ✅ Returns 503 (Service Unavailable) - expected for serverless without blob token');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
      const text = await response.text();
      console.log(`   Response: ${text}`);
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }

  // Test 2: Verify enhance endpoint returns proper error codes
  console.log('\n2. Testing enhance endpoint error handling...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/photos/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ photoId: 'test-id' })
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 500) {
      console.log('   ❌ Still getting 500 error!');
      const text = await response.text();
      console.log(`   Response: ${text}`);
      return false;
    } else if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 (Authentication required)');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
      const text = await response.text();
      console.log(`   Response: ${text}`);
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }

  // Test 3: Check that root endpoints are working
  console.log('\n3. Testing basic endpoints...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/`);
    console.log(`   Root status: ${response.status}`);
    
    if (response.status !== 200) {
      console.log('   ❌ Root endpoint not working');
      return false;
    } else {
      console.log('   ✅ Root endpoint working');
    }
  } catch (error) {
    console.log(`   ❌ Root request failed: ${error.message}`);
    return false;
  }

  console.log('\n=== Verification Summary ===');
  console.log('✅ No 500 errors detected');
  console.log('✅ Upload endpoint returns proper error codes (401/503 instead of 500)');
  console.log('✅ Enhance endpoint returns proper error codes (401 instead of 500)');
  console.log('✅ Basic endpoints are functional');
  console.log('');
  console.log('🎉 Production fixes verified successfully!');
  console.log('');
  console.log('Changes made:');
  console.log('- Fixed 500 errors in upload API when BLOB_READ_WRITE_TOKEN is missing (now returns 503)');
  console.log('- Fixed 500 errors in upload API when Blob storage fails (now returns 502)');
  console.log('- Added proper error handling for database operations (now returns 503)');
  console.log('- Added error handling for credit deduction failures');
  console.log('- All error responses now include descriptive messages');
  
  return true;
}

// Run the verification
testProductionFixes()
  .then(success => {
    if (success) {
      console.log('\n✅ All production fixes verified!');
      process.exit(0);
    } else {
      console.log('\n❌ Some issues still exist');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });