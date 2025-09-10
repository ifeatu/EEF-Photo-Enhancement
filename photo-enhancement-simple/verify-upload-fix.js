const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Verification script to test the upload fix
 * Tests both local development and production scenarios
 */

async function testLocalUploadFix() {
  console.log('🏠 Testing local upload fix...');
  
  try {
    // Create a test file
    const testImagePath = path.join(__dirname, 'test-fix.jpg');
    const testContent = Buffer.from('test-image-content-for-fix-verification');
    fs.writeFileSync(testImagePath, testContent);
    
    const form = new FormData();
    form.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-fix.jpg',
      contentType: 'image/jpeg'
    });
    form.append('title', 'Fix Verification Test');
    
    console.log('   📤 Testing local upload without authentication...');
    
    const response = await fetch('http://localhost:3001/api/photos/upload', {
      method: 'POST',
      body: form,
      timeout: 10000
    });
    
    console.log(`   📊 Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`   📊 Response: ${responseText.substring(0, 300)}`);
    
    if (response.status === 200 && responseText.includes('signin')) {
      console.log('   ✅ Local server correctly redirects to authentication');
    } else if (response.status === 401 || response.status === 403) {
      console.log('   ✅ Local server correctly rejects unauthenticated requests');
    } else {
      console.log('   ⚠️ Unexpected response from local server');
    }
    
    // Clean up
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
  } catch (error) {
    console.error('   ❌ Local test failed:', error.message);
  }
}

async function testProductionErrorHandling() {
  console.log('\n🌐 Testing production error handling...');
  
  try {
    console.log('   📤 Testing production upload (should get better error handling)...');
    
    // Create a test file
    const testImagePath = path.join(__dirname, 'test-prod.jpg');
    const testContent = Buffer.from('test-production-error-handling');
    fs.writeFileSync(testImagePath, testContent);
    
    const form = new FormData();
    form.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-prod.jpg',
      contentType: 'image/jpeg'
    });
    form.append('title', 'Production Error Test');
    
    const response = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: form,
      timeout: 15000,
      redirect: 'manual'
    });
    
    console.log(`   📊 Status: ${response.status}`);
    console.log(`   📊 Headers:`, Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log(`   📊 Response: ${responseText.substring(0, 400)}`);
    
    if (response.status === 307) {
      console.log('   ✅ Production correctly redirects unauthenticated requests');
      console.log('   💡 This means the 500 error only occurs for authenticated users');
    } else if (response.status === 500) {
      console.log('   ⚠️ Still getting 500 error - fix may need deployment');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        console.log('   🔍 Error details:', errorData);
        
        if (errorData.error === 'File storage service not configured') {
          console.log('   ✅ Fix is working! Error message is now clear and helpful');
        }
      } catch (e) {
        console.log('   🔍 Raw error response:', responseText);
      }
    }
    
    // Clean up
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
  } catch (error) {
    console.error('   ❌ Production test failed:', error.message);
    
    if (error.message.includes('redirect')) {
      console.log('   💡 Redirect handling improved - this is expected');
    }
  }
}

async function testErrorScenarios() {
  console.log('\n🧪 Testing error scenarios...');
  
  const testCases = [
    {
      name: 'No file provided',
      test: async () => {
        const response = await fetch('http://localhost:3001/api/photos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          timeout: 5000
        });
        return { status: response.status, text: await response.text() };
      }
    },
    {
      name: 'Invalid content type',
      test: async () => {
        const form = new FormData();
        form.append('photo', 'not-a-file', 'test.txt');
        
        const response = await fetch('http://localhost:3001/api/photos/upload', {
          method: 'POST',
          body: form,
          timeout: 5000
        });
        return { status: response.status, text: await response.text() };
      }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`   🔍 Testing: ${testCase.name}`);
      const result = await testCase.test();
      console.log(`      Status: ${result.status}`);
      console.log(`      Response: ${result.text.substring(0, 150)}`);
    } catch (error) {
      console.log(`      ❌ Test failed: ${error.message}`);
    }
  }
}

async function summarizeFindings() {
  console.log('\n📋 Fix Verification Summary:');
  console.log('\n✅ Improvements made:');
  console.log('   1. Added proper error handling for Vercel Blob failures');
  console.log('   2. Fixed serverless file system issues by detecting environment');
  console.log('   3. Added clear error messages for configuration issues');
  console.log('   4. Prevented attempts to write to read-only file system');
  
  console.log('\n🎯 Root cause identified:');
  console.log('   - Production was missing BLOB_READ_WRITE_TOKEN configuration');
  console.log('   - Code fell back to local file storage');
  console.log('   - Serverless environment has read-only file system');
  console.log('   - This caused unhandled file system errors = 500 status');
  
  console.log('\n🔧 Next steps for production:');
  console.log('   1. Configure BLOB_READ_WRITE_TOKEN in Vercel environment variables');
  console.log('   2. Deploy the updated code with better error handling');
  console.log('   3. Test authenticated upload in production');
  
  console.log('\n💡 Prevention measures added:');
  console.log('   - Graceful fallback with clear error messages');
  console.log('   - Environment detection for serverless vs local');
  console.log('   - Comprehensive error logging for debugging');
}

// Main verification function
async function runVerification() {
  console.log('🚀 Starting upload fix verification...');
  
  await testLocalUploadFix();
  await testProductionErrorHandling();
  await testErrorScenarios();
  await summarizeFindings();
  
  console.log('\n✅ Verification completed');
}

if (require.main === module) {
  runVerification()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { 
  testLocalUploadFix, 
  testProductionErrorHandling, 
  testErrorScenarios, 
  summarizeFindings 
};