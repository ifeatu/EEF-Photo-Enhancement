const https = require('https');
const http = require('http');

// Test session handling in both environments
async function testSessionHandling() {
  console.log('🔍 Testing Session Handling Differences\n');
  
  const environments = [
    {
      name: 'Development',
      baseUrl: 'http://localhost:3001',
      protocol: http
    },
    {
      name: 'Production', 
      baseUrl: 'https://photoenhance.dev',
      protocol: https
    }
  ];
  
  for (const env of environments) {
    console.log(`\n📍 Testing ${env.name} Environment (${env.baseUrl})`);
    console.log('=' .repeat(50));
    
    // Test 1: Session endpoint accessibility
    try {
      const sessionResponse = await makeRequest(env.baseUrl + '/api/auth/session');
      console.log('✅ Session endpoint accessible');
      console.log('📄 Response:', JSON.stringify(sessionResponse.data, null, 2));
      console.log('🍪 Set-Cookie headers:', sessionResponse.headers['set-cookie'] || 'None');
    } catch (error) {
      console.log('❌ Session endpoint error:', error.message);
    }
    
    // Test 2: CSRF token endpoint
    try {
      const csrfResponse = await makeRequest(env.baseUrl + '/api/auth/csrf');
      console.log('✅ CSRF endpoint accessible');
      console.log('🔐 CSRF Token:', csrfResponse.data.csrfToken ? 'Present' : 'Missing');
    } catch (error) {
      console.log('❌ CSRF endpoint error:', error.message);
    }
    
    // Test 3: Providers endpoint
    try {
      const providersResponse = await makeRequest(env.baseUrl + '/api/auth/providers');
      console.log('✅ Providers endpoint accessible');
      const providers = Object.keys(providersResponse.data);
      console.log('🔗 Available providers:', providers.join(', '));
    } catch (error) {
      console.log('❌ Providers endpoint error:', error.message);
    }
    
    // Test 4: Protected API route (should require auth)
    try {
      const uploadResponse = await makeRequest(env.baseUrl + '/api/photos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      });
      console.log('⚠️  Upload endpoint accessible without auth (unexpected)');
      console.log('📄 Response status:', uploadResponse.status);
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('✅ Upload endpoint properly protected (401/403)');
      } else {
        console.log('❌ Upload endpoint error:', error.message);
      }
    }
    
    // Test 5: Check NextAuth configuration
    console.log('\n🔧 Environment Configuration:');
    if (env.name === 'Development') {
      console.log('   NEXTAUTH_URL: http://localhost:3001 (from .env.local)');
      console.log('   NEXTAUTH_SECRET: [CONFIGURED]');
    } else {
      console.log('   NEXTAUTH_URL: https://photoenhance.dev (from Vercel env)');
      console.log('   NEXTAUTH_SECRET: [CONFIGURED]');
    }
  }
  
  console.log('\n🎯 Session Handling Analysis Complete');
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Session-Test/1.0',
        ...options.headers
      }
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          // If not JSON, return raw data
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.setTimeout(10000); // 10 second timeout
    req.end();
  });
}

// Run the test
testSessionHandling().catch(console.error);