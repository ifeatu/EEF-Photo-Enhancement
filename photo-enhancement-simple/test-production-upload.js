const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Focused test to reproduce the specific production 500 error
 * Based on the error: POST https://photoenhance.dev/api/photos/upload 500 (Internal Server Error)
 */

async function testProductionError() {
  console.log('🔍 Testing production upload 500 error...');
  
  const PRODUCTION_URL = 'https://photoenhance.dev';
  
  try {
    // Test the exact scenario that's failing in production
    console.log('\n📍 Testing production upload endpoint directly...');
    
    // Create a minimal test file
    const testImagePath = path.join(__dirname, 'test-upload.jpg');
    const testContent = Buffer.from('fake-image-data-for-testing');
    fs.writeFileSync(testImagePath, testContent);
    
    const form = new FormData();
    form.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-upload.jpg',
      contentType: 'image/jpeg'
    });
    form.append('title', 'Test Upload');
    
    console.log('   📤 Sending upload request to production...');
    
    const response = await fetch(`${PRODUCTION_URL}/api/photos/upload`, {
      method: 'POST',
      body: form,
      timeout: 10000, // 10 second timeout
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    console.log(`   📊 Response Status: ${response.status}`);
    console.log(`   📊 Response Headers:`, Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log(`   📊 Response Body: ${responseText.substring(0, 500)}`);
    
    if (response.status === 500) {
      console.log('\n🎯 REPRODUCED: Got 500 error as expected!');
      
      // Try to extract error details
      try {
        const errorData = JSON.parse(responseText);
        console.log('   🔍 Error details:', errorData);
      } catch (e) {
        console.log('   🔍 Raw error response (not JSON):', responseText);
      }
    } else if (response.status >= 300 && response.status < 400) {
      console.log('\n🔄 REDIRECT DETECTED!');
      console.log(`   📍 Redirect Location: ${response.headers.get('location')}`);
      console.log('   💡 This suggests authentication is required');
      
      // Test what happens when we follow the redirect
      const redirectLocation = response.headers.get('location');
      if (redirectLocation) {
        console.log('\n🔍 Testing redirect destination...');
        try {
          const redirectResponse = await fetch(redirectLocation, {
            method: 'GET',
            timeout: 5000
          });
          console.log(`   📊 Redirect Status: ${redirectResponse.status}`);
          const redirectText = await redirectResponse.text();
          console.log(`   📊 Redirect Content: ${redirectText.substring(0, 200)}`);
        } catch (redirectError) {
          console.log(`   ❌ Redirect test failed: ${redirectError.message}`);
        }
      }
    }
    
    // Clean up
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Connection refused - production server might be down');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   💡 Request timed out - server might be overloaded');
    } else if (error.message.includes('redirect')) {
      console.log('   💡 Redirect issue - likely authentication required');
    }
  }
}

// Test the auth endpoint to understand the authentication flow
async function testAuthEndpoint() {
  console.log('\n🔐 Testing authentication endpoint...');
  
  try {
    const response = await fetch('https://photoenhance.dev/api/auth/session', {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`   📊 Auth Status: ${response.status}`);
    const authText = await response.text();
    console.log(`   📊 Auth Response: ${authText.substring(0, 300)}`);
    
  } catch (error) {
    console.error('   ❌ Auth test failed:', error.message);
  }
}

// Test local server for comparison
async function testLocalUpload() {
  console.log('\n🏠 Testing local server for comparison...');
  
  try {
    const response = await fetch('http://localhost:3001/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}),
      timeout: 5000
    });
    
    console.log(`   📊 Local Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`   📊 Local Response: ${responseText.substring(0, 200)}`);
    
  } catch (error) {
    console.error('   ❌ Local test failed:', error.message);
  }
}

// Check if the production site is accessible
async function testProductionHealth() {
  console.log('\n🌐 Testing production site health...');
  
  try {
    const response = await fetch('https://photoenhance.dev', {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`   📊 Site Status: ${response.status}`);
    console.log(`   📊 Site accessible: ${response.ok ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('   ❌ Production site check failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting production error investigation...');
  
  await testProductionHealth();
  await testAuthEndpoint();
  await testLocalUpload();
  await testProductionError();
  
  console.log('\n✅ Investigation completed');
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Investigation failed:', error);
      process.exit(1);
    });
}

module.exports = { testProductionError, testLocalUpload, testProductionHealth, testAuthEndpoint };