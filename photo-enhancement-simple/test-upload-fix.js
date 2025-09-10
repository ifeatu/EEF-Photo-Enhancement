const fetch = require('node-fetch');

async function testUploadEndpointFix() {
  console.log('🔍 Testing upload endpoint after fix...');
  console.log('Target: https://photoenhance.dev/api/photos/upload');
  console.log('Time:', new Date().toISOString());
  
  try {
    // Test 1: Basic endpoint accessibility
    console.log('\n1. Testing basic endpoint accessibility...');
    const basicResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log('Basic test status:', basicResponse.status);
    const basicText = await basicResponse.text();
    console.log('Basic test response:', basicText);
    
    // Test 2: Test with malformed authentication (should return 401, not 500)
    console.log('\n2. Testing with malformed authentication...');
    const malformedAuthResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Cookie': 'next-auth.session-token=invalid-token-that-might-cause-db-error',
        'Content-Type': 'multipart/form-data'
      },
      body: 'invalid-form-data'
    });
    
    console.log('Malformed auth status:', malformedAuthResponse.status);
    const malformedAuthText = await malformedAuthResponse.text();
    console.log('Malformed auth response:', malformedAuthText);
    
    // Test 3: Test with various edge cases that might trigger database errors
    console.log('\n3. Testing edge cases that might trigger database errors...');
    
    const edgeCases = [
      {
        name: 'Empty cookie',
        headers: { 'Cookie': '', 'Content-Type': 'application/json' },
        body: '{}'
      },
      {
        name: 'Malformed session token',
        headers: { 'Cookie': 'next-auth.session-token=malformed.jwt.token', 'Content-Type': 'application/json' },
        body: '{}'
      },
      {
        name: 'SQL injection attempt in cookie',
        headers: { 'Cookie': 'next-auth.session-token=\'; DROP TABLE users; --', 'Content-Type': 'application/json' },
        body: '{}'
      }
    ];
    
    for (const testCase of edgeCases) {
      try {
        const response = await fetch('https://photoenhance.dev/api/photos/upload', {
          method: 'POST',
          headers: testCase.headers,
          body: testCase.body
        });
        
        console.log(`${testCase.name} - Status: ${response.status}`);
        
        if (response.status === 500) {
          const errorText = await response.text();
          console.log(`❌ Still getting 500 error for ${testCase.name}:`, errorText);
        } else {
          console.log(`✅ ${testCase.name} - No 500 error (status: ${response.status})`);
        }
      } catch (error) {
        console.log(`${testCase.name} - Network error:`, error.message);
      }
    }
    
    // Test 4: Test rapid requests to check for race conditions
    console.log('\n4. Testing rapid requests for race conditions...');
    
    const rapidRequests = [];
    for (let i = 0; i < 10; i++) {
      rapidRequests.push(
        fetch('https://photoenhance.dev/api/photos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        })
        .then(r => ({ index: i, status: r.status }))
        .catch(e => ({ index: i, error: e.message }))
      );
    }
    
    const rapidResults = await Promise.all(rapidRequests);
    console.log('Rapid requests results:', rapidResults);
    
    // Check if any returned 500
    const has500 = rapidResults.some(r => r.status === 500);
    if (has500) {
      console.log('❌ Still getting 500 errors in rapid requests');
    } else {
      console.log('✅ No 500 errors in rapid requests');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      stack: error.stack
    });
  }
}

async function testOtherEndpoints() {
  console.log('\n🔍 Testing other endpoints to ensure fix didn\'t break anything...');
  
  const endpoints = [
    { name: 'Session', url: 'https://photoenhance.dev/api/auth/session' },
    { name: 'Home page', url: 'https://photoenhance.dev/' },
    { name: 'Sign in', url: 'https://photoenhance.dev/api/auth/signin' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url);
      console.log(`${endpoint.name} - Status: ${response.status}`);
      
      if (response.status >= 500) {
        console.log(`❌ ${endpoint.name} has server error`);
      } else {
        console.log(`✅ ${endpoint.name} working normally`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} - Error:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 Testing upload endpoint fix...');
  
  await testUploadEndpointFix();
  await testOtherEndpoints();
  
  console.log('\n✅ Upload endpoint fix testing completed');
  console.log('\n📋 Summary:');
  console.log('- Fixed getCurrentUser function to handle database errors gracefully');
  console.log('- Added try-catch block to prevent unhandled database exceptions');
  console.log('- Upload endpoint should now return 401 instead of 500 for auth issues');
  console.log('- Database connection errors are now logged but don\'t crash the endpoint');
  
  console.log('\n🎯 Expected behavior:');
  console.log('- Unauthenticated requests: 401 Unauthorized');
  console.log('- Malformed requests: 400 Bad Request or 401 Unauthorized');
  console.log('- Database errors: Logged but endpoint returns appropriate error code');
  console.log('- No more 500 Internal Server Error for authentication issues');
}

main().catch(console.error);