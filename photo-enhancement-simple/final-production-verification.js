const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function comprehensiveProductionTest() {
  console.log('🎯 COMPREHENSIVE PRODUCTION VERIFICATION');
  console.log('==========================================\n');
  
  const baseUrl = 'https://photoenhance.dev';
  let allTestsPassed = true;
  
  // Test 1: Upload endpoint without auth (should return 401 JSON)
  console.log('📤 Test 1: Upload endpoint authentication');
  try {
    const testImagePath = './test-fix.jpg';
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));
    }
    
    const form = new FormData();
    form.append('photo', fs.createReadStream(testImagePath));
    
    const uploadResponse = await fetch(`${baseUrl}/api/photos/upload`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const isJson = uploadResponse.headers.get('content-type')?.includes('application/json');
    const status = uploadResponse.status;
    
    if (status === 401 && isJson) {
      console.log('   ✅ PASS: Returns 401 JSON error for unauthenticated upload');
      const response = await uploadResponse.json();
      console.log(`   📋 Response: ${JSON.stringify(response)}`);
    } else {
      console.log(`   ❌ FAIL: Expected 401 JSON, got ${status} ${uploadResponse.headers.get('content-type')}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Upload test error - ${error.message}`);
    allTestsPassed = false;
  }
  
  // Test 2: Enhance endpoint without auth (should return JSON error)
  console.log('\n🔧 Test 2: Enhance endpoint authentication');
  try {
    const enhanceResponse = await fetch(`${baseUrl}/api/photos/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId: 'test' })
    });
    
    const isJson = enhanceResponse.headers.get('content-type')?.includes('application/json');
    const status = enhanceResponse.status;
    
    if ((status === 401 || status === 400) && isJson) {
      console.log(`   ✅ PASS: Returns ${status} JSON error for unauthenticated enhance`);
      const response = await enhanceResponse.json();
      console.log(`   📋 Response: ${JSON.stringify(response)}`);
    } else {
      console.log(`   ❌ FAIL: Expected JSON error, got ${status} ${enhanceResponse.headers.get('content-type')}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Enhance test error - ${error.message}`);
    allTestsPassed = false;
  }
  
  // Test 3: Admin route (should still redirect)
  console.log('\n🔒 Test 3: Admin route protection');
  try {
    const adminResponse = await fetch(`${baseUrl}/admin`, {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (adminResponse.status === 307 || adminResponse.status === 302) {
      console.log('   ✅ PASS: Admin routes still protected with redirects');
      console.log(`   📋 Redirect status: ${adminResponse.status}`);
    } else {
      console.log(`   ❌ FAIL: Expected redirect, got ${adminResponse.status}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Admin test error - ${error.message}`);
    allTestsPassed = false;
  }
  
  // Test 4: Photos list endpoint
  console.log('\n📸 Test 4: Photos list endpoint');
  try {
    const photosResponse = await fetch(`${baseUrl}/api/photos`, {
      method: 'GET'
    });
    
    const isJson = photosResponse.headers.get('content-type')?.includes('application/json');
    const status = photosResponse.status;
    
    if ((status === 401 || status === 200) && isJson) {
      console.log(`   ✅ PASS: Photos endpoint returns ${status} JSON response`);
      const response = await photosResponse.json();
      console.log(`   📋 Response type: ${typeof response}`);
    } else {
      console.log(`   ❌ FAIL: Expected JSON response, got ${status} ${photosResponse.headers.get('content-type')}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Photos test error - ${error.message}`);
    allTestsPassed = false;
  }
  
  // Summary
  console.log('\n🎯 FINAL RESULTS');
  console.log('================');
  
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n📋 MIDDLEWARE FIX SUMMARY:');
    console.log('• ✅ API routes now return proper JSON errors instead of redirects');
    console.log('• ✅ Authentication middleware no longer conflicts with API error handling');
    console.log('• ✅ Admin routes still properly protected with redirects');
    console.log('• ✅ Production deployment successful and verified');
    console.log('\n🎉 The 500 error issue has been resolved!');
    console.log('   API clients will now receive proper JSON error responses.');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('   Please review the failed tests above.');
  }
}

comprehensiveProductionTest().catch(console.error);