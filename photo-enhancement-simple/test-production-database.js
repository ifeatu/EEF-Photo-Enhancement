const fetch = require('node-fetch');

async function testDatabaseConnectivity() {
  console.log('🔍 Testing production database connectivity...');
  
  try {
    // Test 1: Check session endpoint (uses database)
    console.log('\n1. Testing session endpoint (database read)...');
    const sessionResponse = await fetch('https://photoenhance.dev/api/auth/session');
    console.log('Session endpoint status:', sessionResponse.status);
    
    const sessionData = await sessionResponse.text();
    console.log('Session response:', sessionData);
    
    // Test 2: Check if there are any API endpoints that don't require auth but use DB
    console.log('\n2. Testing public endpoints that might use database...');
    
    // Test the main page (might have DB queries)
    const homeResponse = await fetch('https://photoenhance.dev/');
    console.log('Home page status:', homeResponse.status);
    
    // Test 3: Check for any error patterns in responses
    console.log('\n3. Checking for database error patterns...');
    
    // Try to trigger a database operation through a different endpoint
    const signInResponse = await fetch('https://photoenhance.dev/api/auth/signin');
    console.log('Sign-in page status:', signInResponse.status);
    
    // Test 4: Check if the issue is specific to Prisma/database queries
    console.log('\n4. Testing potential database timeout scenarios...');
    
    // Make multiple rapid requests to see if there's a connection pool issue
    const rapidRequests = [];
    for (let i = 0; i < 5; i++) {
      rapidRequests.push(
        fetch('https://photoenhance.dev/api/auth/session')
          .then(r => ({ index: i, status: r.status }))
          .catch(e => ({ index: i, error: e.message }))
      );
    }
    
    const rapidResults = await Promise.all(rapidRequests);
    console.log('Rapid requests results:', rapidResults);
    
  } catch (error) {
    console.error('❌ Database connectivity test failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      stack: error.stack
    });
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔍 Testing environment variable related issues...');
  
  try {
    // Test if the issue might be related to missing environment variables
    console.log('1. Testing for environment variable errors...');
    
    // Try to access an endpoint that would fail if DATABASE_URL is wrong
    const response = await fetch('https://photoenhance.dev/api/auth/session', {
      method: 'GET',
      headers: {
        'User-Agent': 'Environment-Test/1.0'
      }
    });
    
    console.log('Environment test response status:', response.status);
    const responseText = await response.text();
    console.log('Environment test response body:', responseText);
    
    // Check response headers for any clues
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
  } catch (error) {
    console.error('❌ Environment variable test failed:', error.message);
  }
}

async function testSpecificErrorScenarios() {
  console.log('\n🔍 Testing specific error scenarios that could cause 500...');
  
  try {
    // Test 1: Malformed authentication header
    console.log('1. Testing malformed authentication scenarios...');
    
    const malformedAuthResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log('Malformed auth response status:', malformedAuthResponse.status);
    const malformedAuthText = await malformedAuthResponse.text();
    console.log('Malformed auth response:', malformedAuthText);
    
    // Test 2: Test with various cookie scenarios
    console.log('\n2. Testing cookie-related scenarios...');
    
    const cookieResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Cookie': 'next-auth.session-token=invalid; next-auth.csrf-token=invalid',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log('Cookie test response status:', cookieResponse.status);
    const cookieText = await cookieResponse.text();
    console.log('Cookie test response:', cookieText);
    
  } catch (error) {
    console.error('❌ Specific error scenario test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting production database and error debugging...');
  console.log('Target: https://photoenhance.dev');
  console.log('Time:', new Date().toISOString());
  
  await testDatabaseConnectivity();
  await testEnvironmentVariables();
  await testSpecificErrorScenarios();
  
  console.log('\n✅ Database and error debugging completed');
  console.log('\n📋 Key findings to investigate:');
  console.log('1. Check if database connection is working in production');
  console.log('2. Verify DATABASE_URL and other environment variables');
  console.log('3. Check Vercel function logs for specific error messages');
  console.log('4. The 500 error likely occurs in the getCurrentUser() database query');
  console.log('5. Consider adding error handling to the getCurrentUser function');
  
  console.log('\n🔧 Recommended fixes:');
  console.log('1. Add try-catch error handling to getCurrentUser function');
  console.log('2. Add database connection health checks');
  console.log('3. Improve error logging in production');
  console.log('4. Consider adding database connection retry logic');
}

main().catch(console.error);