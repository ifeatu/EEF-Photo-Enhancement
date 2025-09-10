const fetch = require('node-fetch');

async function testAuthConflict() {
  console.log('🔍 Testing authentication layer conflict...');
  
  const PRODUCTION_URL = 'https://photoenhance.dev';
  const LOCAL_URL = 'http://localhost:3000';
  
  try {
    // Test 1: Production upload without auth (should get redirect from middleware)
    console.log('\n📤 Test 1: Production upload without auth...');
    const prodResponse = await fetch(`${PRODUCTION_URL}/api/photos/upload`, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
      redirect: 'manual'
    });
    
    console.log('   📊 Status:', prodResponse.status);
    console.log('   📊 Headers:', JSON.stringify(Object.fromEntries(prodResponse.headers), null, 2));
    
    if (prodResponse.status === 307) {
      console.log('   🔄 MIDDLEWARE REDIRECT - This is the problem!');
      console.log('   📍 Redirect to:', prodResponse.headers.get('location'));
    }
    
    // Test 2: Local upload without auth (should get JSON error from withAuth)
    console.log('\n📤 Test 2: Local upload without auth...');
    try {
      const localResponse = await fetch(`${LOCAL_URL}/api/photos/upload`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
        redirect: 'manual'
      });
      
      console.log('   📊 Status:', localResponse.status);
      const localBody = await localResponse.text();
      console.log('   📊 Response:', localBody);
      
      if (localResponse.status === 401) {
        console.log('   ✅ PROPER JSON ERROR - This is how it should work!');
      } else if (localResponse.status === 307) {
        console.log('   🔄 MIDDLEWARE REDIRECT - Same issue locally!');
      }
    } catch (localError) {
      console.log('   ❌ Local server not running or error:', localError.message);
    }
    
    // Test 3: Check if other protected routes have same issue
    console.log('\n📤 Test 3: Testing other protected routes...');
    const enhanceResponse = await fetch(`${PRODUCTION_URL}/api/photos/enhance`, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
      redirect: 'manual'
    });
    
    console.log('   📊 Enhance Status:', enhanceResponse.status);
    if (enhanceResponse.status === 307) {
      console.log('   🔄 Enhance also redirects - middleware affects all /api/photos routes');
    }
    
    console.log('\n📋 DIAGNOSIS:');
    console.log('   • Next.js middleware runs BEFORE route handlers');
    console.log('   • Middleware redirects unauthenticated /api/photos/* requests');
    console.log('   • Route handlers withAuth never gets to return JSON errors');
    console.log('   • This breaks API clients expecting JSON responses');
    
    console.log('\n🔧 SOLUTION:');
    console.log('   • Remove /api/photos/* from middleware matcher');
    console.log('   • Let route handlers handle their own auth with withAuth');
    console.log('   • This will return proper JSON errors instead of redirects');
    
  } catch (error) {
    console.error('❌ Error during auth conflict test:', error.message);
  }
}

testAuthConflict();