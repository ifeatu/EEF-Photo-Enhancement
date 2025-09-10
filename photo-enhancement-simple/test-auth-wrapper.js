const fetch = require('node-fetch');

// Test to see if the issue is in the withAuth wrapper
async function testAuthWrapperIssue() {
  console.log('Testing if the issue is in the withAuth wrapper...');
  
  try {
    // Test with a malformed but present auth header to trigger auth processing
    const response = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-to-trigger-auth-processing',
        'Cookie': 'next-auth.session-token=invalid-session-token'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 500) {
      console.log('\n🔴 500 ERROR FOUND!');
      console.log('This suggests the error occurs during authentication processing.');
      
      // Check if it's an HTML error page or JSON
      if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
        console.log('❌ Response is HTML - this indicates a server error, not API error handling');
      } else {
        console.log('✅ Response is JSON - this is proper API error handling');
      }
    } else {
      console.log('✅ No 500 error - auth wrapper is working correctly');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Test other API endpoints to see if the issue is specific to upload
async function testOtherEndpoints() {
  console.log('\nTesting other API endpoints...');
  
  const endpoints = [
    '/api/photos/enhance',
    '/api/user/profile',
    '/api/debug/test'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting ${endpoint}...`);
      const response = await fetch(`https://photoenhance.dev${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=invalid-session-token'
        },
        body: JSON.stringify({ test: 'data' })
      });
      
      console.log(`${endpoint} status:`, response.status);
      
      if (response.status === 500) {
        const text = await response.text();
        console.log(`🔴 500 error on ${endpoint}:`, text.substring(0, 200));
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error.message);
    }
  }
}

async function main() {
  await testAuthWrapperIssue();
  await testOtherEndpoints();
  
  console.log('\n=== ANALYSIS ===');
  console.log('If 500 errors are found:');
  console.log('1. Check if they return HTML (server error) or JSON (API error)');
  console.log('2. If HTML, there\'s a deployment/runtime issue');
  console.log('3. If JSON, there\'s an application logic issue');
  console.log('4. If only upload endpoint fails, check file handling logic');
}

main().catch(console.error);