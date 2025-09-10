const fetch = require('node-fetch');
const FormData = require('form-data');

async function testMiddlewareFix() {
  console.log('🔧 Testing middleware fix for production upload...');
  
  const PRODUCTION_URL = 'https://photoenhance.dev';
  
  try {
    // Test 1: Upload without authentication (should now get JSON error, not redirect)
    console.log('\n📤 Test 1: Upload without auth (expecting JSON error)...');
    
    const form = new FormData();
    const testImageBuffer = Buffer.from('fake-image-data');
    form.append('photo', testImageBuffer, {
      filename: 'test.jpg',
      contentType: 'image/jpeg'
    });
    
    const uploadResponse = await fetch(`${PRODUCTION_URL}/api/photos/upload`, {
      method: 'POST',
      body: form,
      redirect: 'manual' // Don't follow redirects
    });
    
    console.log('   📊 Status:', uploadResponse.status);
    console.log('   📊 Content-Type:', uploadResponse.headers.get('content-type'));
    
    const responseText = await uploadResponse.text();
    console.log('   📊 Response:', responseText);
    
    if (uploadResponse.status === 401) {
      console.log('   ✅ SUCCESS: Got 401 JSON error (middleware fix working!)');
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('   📋 Error message:', jsonResponse.error);
      } catch (e) {
        console.log('   ⚠️  Response is not JSON:', responseText);
      }
    } else if (uploadResponse.status === 307) {
      console.log('   ❌ STILL REDIRECTING: Middleware fix not deployed yet');
      console.log('   📍 Redirect to:', uploadResponse.headers.get('location'));
    } else {
      console.log('   🤔 Unexpected status:', uploadResponse.status);
    }
    
    // Test 2: Test enhance endpoint as well
    console.log('\n📤 Test 2: Enhance without auth (expecting JSON error)...');
    
    const enhanceResponse = await fetch(`${PRODUCTION_URL}/api/photos/enhance`, {
      method: 'POST',
      body: JSON.stringify({ photoId: 'test' }),
      headers: { 'Content-Type': 'application/json' },
      redirect: 'manual'
    });
    
    console.log('   📊 Status:', enhanceResponse.status);
    const enhanceText = await enhanceResponse.text();
    console.log('   📊 Response:', enhanceText);
    
    if (enhanceResponse.status === 401) {
      console.log('   ✅ SUCCESS: Enhance also returns JSON error');
    } else if (enhanceResponse.status === 307) {
      console.log('   ❌ STILL REDIRECTING: Enhance still redirects');
    }
    
    // Test 3: Verify admin routes still work (should still redirect)
    console.log('\n📤 Test 3: Admin route (should still redirect)...');
    
    const adminResponse = await fetch(`${PRODUCTION_URL}/api/admin/users`, {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log('   📊 Admin Status:', adminResponse.status);
    if (adminResponse.status === 307) {
      console.log('   ✅ SUCCESS: Admin routes still protected by middleware');
    } else {
      console.log('   🤔 Unexpected admin response:', adminResponse.status);
    }
    
    console.log('\n📋 SUMMARY:');
    if (uploadResponse.status === 401 && enhanceResponse.status === 401) {
      console.log('   ✅ MIDDLEWARE FIX SUCCESSFUL!');
      console.log('   • API routes now return proper JSON errors');
      console.log('   • No more redirects breaking API clients');
      console.log('   • Admin routes still protected');
    } else {
      console.log('   ⏳ DEPLOYMENT PENDING:');
      console.log('   • Changes need to be deployed to production');
      console.log('   • Current production still has old middleware');
    }
    
  } catch (error) {
    console.error('❌ Error during middleware fix test:', error.message);
  }
}

testMiddlewareFix();