const https = require('https');
const http = require('http');

// Test middleware authentication protection
async function testMiddlewareProtection() {
  console.log('🛡️  Testing Middleware Authentication Protection\n');
  
  const environments = [
    {
      name: 'Development',
      baseUrl: 'http://localhost:3001',
      protocol: http
    },
    {
      name: 'Production',
      baseUrl: 'https://photoenhance-frontend-bz1t6mwfb-pierre-malbroughs-projects.vercel.app',
      protocol: https
    }
  ];
  
  // Routes to test with expected behavior
  const testRoutes = [
    {
      path: '/api/auth/session',
      description: 'NextAuth session endpoint',
      shouldBePublic: true,
      expectedStatus: [200]
    },
    {
      path: '/api/auth/csrf',
      description: 'NextAuth CSRF endpoint',
      shouldBePublic: true,
      expectedStatus: [200]
    },
    {
      path: '/api/auth/providers',
      description: 'NextAuth providers endpoint',
      shouldBePublic: true,
      expectedStatus: [200]
    },
    {
      path: '/api/health',
      description: 'Health check endpoint',
      shouldBePublic: true,
      expectedStatus: [200, 404] // May not exist
    },
    {
      path: '/api/status',
      description: 'Status endpoint',
      shouldBePublic: true,
      expectedStatus: [200, 404] // May not exist
    },
    {
      path: '/api/admin/set-user',
      description: 'Bootstrap admin endpoint',
      shouldBePublic: true, // Special case for bootstrap
      expectedStatus: [200, 400, 405] // Various responses depending on state
    },
    {
      path: '/api/admin/users',
      description: 'Admin users endpoint',
      shouldBePublected: false,
      expectedStatus: [401, 403] // Should require admin auth
    },
    {
      path: '/api/photos/upload',
      description: 'Photo upload endpoint',
      shouldBeProtected: false,
      expectedStatus: [401] // Should require auth
    },
    {
      path: '/api/photos/enhance',
      description: 'Photo enhance endpoint',
      shouldBeProtected: false,
      expectedStatus: [401] // Should require auth
    },
    {
      path: '/dashboard',
      description: 'Dashboard page',
      shouldBeProtected: false,
      expectedStatus: [302, 401] // Should redirect to login or return 401
    },
    {
      path: '/admin',
      description: 'Admin page',
      shouldBeProtected: false,
      expectedStatus: [302, 401, 403] // Should redirect or return 401/403
    }
  ];
  
  for (const env of environments) {
    console.log(`\n📍 Testing ${env.name} Environment (${env.baseUrl})`);
    console.log('=' .repeat(60));
    
    for (const route of testRoutes) {
      console.log(`\n🔍 Testing: ${route.path}`);
      console.log(`   Description: ${route.description}`);
      console.log(`   Expected: ${route.shouldBePublic ? 'Public access' : 'Protected (auth required)'}`);
      
      try {
        const response = await makeRequest(env.baseUrl + route.path);
        const statusOk = route.expectedStatus.includes(response.status);
        const statusIcon = statusOk ? '✅' : '⚠️';
        
        console.log(`   ${statusIcon} Status: ${response.status} ${statusOk ? '(expected)' : '(unexpected)'}`);
        
        // Check for authentication-related headers or redirects
        if (response.status === 302) {
          const location = response.headers.location;
          if (location && location.includes('/api/auth/signin')) {
            console.log('   🔒 Properly redirects to sign-in');
          } else {
            console.log(`   🔄 Redirects to: ${location || 'unknown'}`);
          }
        }
        
        if (response.status === 401) {
          console.log('   🔒 Properly returns 401 Unauthorized');
        }
        
        if (response.status === 403) {
          console.log('   🔒 Properly returns 403 Forbidden');
        }
        
        // Check for CORS headers on API routes
        if (route.path.startsWith('/api/')) {
          const corsHeaders = [
            'access-control-allow-origin',
            'access-control-allow-methods',
            'access-control-allow-headers'
          ];
          
          const hasCors = corsHeaders.some(header => response.headers[header]);
          if (hasCors) {
            console.log('   🌐 CORS headers present');
          }
        }
        
      } catch (error) {
        if (error.message.includes('ECONNREFUSED') && env.name === 'Development') {
          console.log('   ⚠️  Development server not running');
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }
    
    // Test OPTIONS requests for CORS
    console.log('\n🌐 Testing CORS OPTIONS Requests:');
    const corsTestRoutes = ['/api/photos/upload', '/api/photos/enhance', '/api/admin/users'];
    
    for (const path of corsTestRoutes) {
      try {
        const response = await makeRequest(env.baseUrl + path, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
          }
        });
        
        console.log(`   ${path}: ${response.status}`);
        
        const corsHeaders = {
          'access-control-allow-origin': response.headers['access-control-allow-origin'],
          'access-control-allow-methods': response.headers['access-control-allow-methods'],
          'access-control-allow-headers': response.headers['access-control-allow-headers'],
          'access-control-max-age': response.headers['access-control-max-age']
        };
        
        const hasCorsHeaders = Object.values(corsHeaders).some(value => value);
        if (hasCorsHeaders) {
          console.log('     ✅ CORS headers present');
          Object.entries(corsHeaders).forEach(([key, value]) => {
            if (value) console.log(`     ${key}: ${value}`);
          });
        } else {
          console.log('     ❌ No CORS headers found');
          console.log('     Response headers:', Object.keys(response.headers));
        }
        
      } catch (error) {
        console.log(`   ${path}: Error - ${error.message}`);
      }
    }
  }
  
  console.log('\n🎯 Middleware Protection Analysis Complete');
  console.log('\n📋 Summary:');
  console.log('   • Public endpoints should return 200 status');
  console.log('   • Protected endpoints should return 401/403 or redirect to sign-in');
  console.log('   • Admin endpoints should require admin role');
  console.log('   • CORS headers should be present for cross-origin requests');
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
        'User-Agent': 'Middleware-Test/1.0',
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
testMiddlewareProtection().catch(console.error);