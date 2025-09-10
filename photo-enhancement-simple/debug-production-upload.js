const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testProductionUpload() {
  console.log('🔍 Testing production upload API...');
  
  try {
    // Test 1: Check if API endpoint is accessible
    console.log('\n1. Testing API endpoint accessibility...');
    const response = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'OPTIONS'
    });
    console.log('OPTIONS response status:', response.status);
    
    // Test 2: Test with invalid request (no auth)
    console.log('\n2. Testing without authentication...');
    const noAuthResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log('No auth response status:', noAuthResponse.status);
    const noAuthText = await noAuthResponse.text();
    console.log('No auth response:', noAuthText);
    
    // Test 3: Test with malformed request
    console.log('\n3. Testing with malformed request...');
    const malformedResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: 'invalid json'
    });
    
    console.log('Malformed request status:', malformedResponse.status);
    const malformedText = await malformedResponse.text();
    console.log('Malformed response:', malformedText);
    
    // Test 4: Check if it's a CORS issue
    console.log('\n4. Testing CORS headers...');
    const corsResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Origin': 'https://photoenhance.dev',
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('CORS test status:', corsResponse.status);
    console.log('CORS headers:', Object.fromEntries(corsResponse.headers.entries()));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      stack: error.stack
    });
  }
}

// Also test the health of related services
async function testRelatedServices() {
  console.log('\n🔍 Testing related services...');
  
  try {
    // Test database connection via a simple API
    console.log('\n1. Testing database connection...');
    const dbResponse = await fetch('https://photoenhance.dev/api/auth/session');
    console.log('Session API status:', dbResponse.status);
    
    // Test if the site is generally working
    console.log('\n2. Testing main site...');
    const siteResponse = await fetch('https://photoenhance.dev/');
    console.log('Main site status:', siteResponse.status);
    
  } catch (error) {
    console.error('❌ Related services test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting production upload debugging...');
  console.log('Target: https://photoenhance.dev/api/photos/upload');
  console.log('Time:', new Date().toISOString());
  
  await testProductionUpload();
  await testRelatedServices();
  
  console.log('\n✅ Debug tests completed');
  console.log('\n📋 Next steps:');
  console.log('1. Check Vercel function logs for detailed error information');
  console.log('2. Verify environment variables are set correctly');
  console.log('3. Test with a real authenticated session');
  console.log('4. Check if the issue is related to the recent cron changes');
}

main().catch(console.error);