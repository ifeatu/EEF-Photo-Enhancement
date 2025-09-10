const https = require('https');
const { URL } = require('url');

console.log('Testing authenticated upload to reproduce 500 error...');

// First, let's check if we can get session info from the signin page
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAuthenticatedUpload() {
  try {
    // Test 1: Check if there are any cookies or session tokens we can extract
    console.log('\n1. Checking signin page for session info...');
    const signinResponse = await makeRequest('https://photoenhance.dev/auth/signin');
    console.log('Signin status:', signinResponse.statusCode);
    
    // Test 2: Try to access dashboard (this might give us more info)
    console.log('\n2. Checking dashboard access...');
    const dashboardResponse = await makeRequest('https://photoenhance.dev/dashboard');
    console.log('Dashboard status:', dashboardResponse.statusCode);
    console.log('Dashboard headers:', dashboardResponse.headers);
    
    // Test 3: Check if there's a way to get auth info from the app
    console.log('\n3. Checking NextAuth session endpoint...');
    const sessionResponse = await makeRequest('https://photoenhance.dev/api/auth/session');
    console.log('Session status:', sessionResponse.statusCode);
    console.log('Session response:', sessionResponse.body.substring(0, 200));
    
    // Test 4: Try upload with various auth headers that might trigger 500
    console.log('\n4. Testing upload with malformed auth...');
    const uploadTests = [
      { name: 'No auth', headers: {} },
      { name: 'Invalid Bearer', headers: { 'Authorization': 'Bearer invalid-token' } },
      { name: 'Malformed Cookie', headers: { 'Cookie': 'next-auth.session-token=malformed' } },
      { name: 'Empty Cookie', headers: { 'Cookie': 'next-auth.session-token=' } }
    ];
    
    for (const test of uploadTests) {
      console.log(`\n   Testing: ${test.name}`);
      const uploadResponse = await makeRequest('https://photoenhance.dev/api/photos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...test.headers
        },
        body: JSON.stringify({ test: 'data' })
      });
      
      console.log(`   Status: ${uploadResponse.statusCode}`);
      if (uploadResponse.statusCode === 500) {
        console.log('   🚨 500 ERROR FOUND!');
        console.log('   Response:', uploadResponse.body);
        console.log('   Headers:', uploadResponse.headers);
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAuthenticatedUpload();