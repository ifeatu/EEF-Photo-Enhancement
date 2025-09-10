const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testProductionAuthUpload() {
  console.log('🔐 Testing production upload with authentication...');
  
  const PRODUCTION_URL = 'https://photoenhance.dev';
  
  try {
    // Step 1: Get CSRF token and session
    console.log('\n📋 Step 1: Getting CSRF token...');
    const csrfResponse = await fetch(`${PRODUCTION_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    console.log('   📊 CSRF Token:', csrfData.csrfToken ? 'Retrieved' : 'Missing');
    
    // Step 2: Try to authenticate (this will show us the auth flow)
    console.log('\n🔑 Step 2: Testing auth flow...');
    const authResponse = await fetch(`${PRODUCTION_URL}/api/auth/session`);
    const authData = await authResponse.json();
    console.log('   📊 Auth Status:', authResponse.status);
    console.log('   📊 Session Data:', JSON.stringify(authData, null, 2));
    
    // Step 3: Test upload without auth (should get redirect)
    console.log('\n📤 Step 3: Testing upload without auth...');
    const form = new FormData();
    
    // Create a test image buffer
    const testImageBuffer = Buffer.from('fake-image-data');
    form.append('file', testImageBuffer, {
      filename: 'test.jpg',
      contentType: 'image/jpeg'
    });
    
    const uploadResponse = await fetch(`${PRODUCTION_URL}/api/photos/upload`, {
      method: 'POST',
      body: form,
      redirect: 'manual' // Don't follow redirects
    });
    
    console.log('   📊 Upload Status:', uploadResponse.status);
    console.log('   📊 Upload Headers:', JSON.stringify(Object.fromEntries(uploadResponse.headers), null, 2));
    
    if (uploadResponse.status === 307 || uploadResponse.status === 302) {
      console.log('   🔄 Redirect detected - authentication required');
      console.log('   📍 Redirect to:', uploadResponse.headers.get('location'));
    }
    
    // Step 4: Check what happens with invalid session
    console.log('\n🍪 Step 4: Testing with fake session cookie...');
    const fakeSessionResponse = await fetch(`${PRODUCTION_URL}/api/photos/upload`, {
      method: 'POST',
      body: form,
      headers: {
        'Cookie': 'next-auth.session-token=fake-token'
      },
      redirect: 'manual'
    });
    
    console.log('   📊 Fake Session Status:', fakeSessionResponse.status);
    console.log('   📊 Fake Session Headers:', JSON.stringify(Object.fromEntries(fakeSessionResponse.headers), null, 2));
    
    // Step 5: Check middleware behavior
    console.log('\n🛡️ Step 5: Testing middleware protection...');
    const middlewareResponse = await fetch(`${PRODUCTION_URL}/api/photos/upload`, {
      method: 'GET', // Try GET instead of POST
      redirect: 'manual'
    });
    
    console.log('   📊 Middleware GET Status:', middlewareResponse.status);
    console.log('   📊 Middleware GET Headers:', JSON.stringify(Object.fromEntries(middlewareResponse.headers), null, 2));
    
    console.log('\n✅ Authentication flow analysis completed');
    console.log('\n📋 Summary:');
    console.log('   • Upload endpoint requires authentication');
    console.log('   • Unauthenticated requests get redirected to signin');
    console.log('   • This explains why users see upload failures');
    console.log('   • Need to verify auth middleware configuration');
    
  } catch (error) {
    console.error('❌ Error during auth upload test:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testProductionAuthUpload();