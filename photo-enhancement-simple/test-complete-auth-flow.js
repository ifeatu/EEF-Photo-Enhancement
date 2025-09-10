#!/usr/bin/env node

/**
 * Complete Authentication Flow Test
 * This script tests the entire authentication and photo upload flow in production
 */

const https = require('https');
const { URL } = require('url');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Auth-Flow-Test/1.0',
        'Accept': 'application/json',
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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testCompleteAuthFlow() {
  console.log('🔍 Testing Complete Authentication Flow in Production\n');
  
  // Test 1: Check NextAuth session endpoint
  console.log('1. Testing NextAuth session endpoint...');
  try {
    const sessionResponse = await makeRequest('https://photoenhance.dev/api/auth/session');
    console.log(`   Status: ${sessionResponse.statusCode}`);
    console.log(`   Response: ${sessionResponse.body.substring(0, 200)}...`);
    
    if (sessionResponse.statusCode === 200) {
      console.log('   ✓ Session endpoint accessible');
    } else {
      console.log('   ✗ Session endpoint issue');
    }
  } catch (error) {
    console.log(`   ✗ Session endpoint failed: ${error.message}`);
  }
  
  // Test 2: Check CSRF token endpoint
  console.log('\n2. Testing NextAuth CSRF token...');
  try {
    const csrfResponse = await makeRequest('https://photoenhance.dev/api/auth/csrf');
    console.log(`   Status: ${csrfResponse.statusCode}`);
    
    if (csrfResponse.statusCode === 200) {
      const csrfData = JSON.parse(csrfResponse.body);
      console.log(`   ✓ CSRF token received: ${csrfData.csrfToken ? 'Yes' : 'No'}`);
    } else {
      console.log('   ✗ CSRF endpoint issue');
    }
  } catch (error) {
    console.log(`   ✗ CSRF endpoint failed: ${error.message}`);
  }
  
  // Test 3: Test photo upload without authentication (should fail)
  console.log('\n3. Testing photo upload without authentication...');
  try {
    const uploadResponse = await makeRequest('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log(`   Status: ${uploadResponse.statusCode}`);
    console.log(`   Response: ${uploadResponse.body}`);
    
    if (uploadResponse.statusCode === 401) {
      console.log('   ✓ Upload correctly requires authentication');
    } else {
      console.log('   ✗ Upload should require authentication');
    }
  } catch (error) {
    console.log(`   ✗ Upload test failed: ${error.message}`);
  }
  
  // Test 4: Test photo enhance without authentication (should fail)
  console.log('\n4. Testing photo enhance without authentication...');
  try {
    const enhanceResponse = await makeRequest('https://photoenhance.dev/api/photos/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log(`   Status: ${enhanceResponse.statusCode}`);
    console.log(`   Response: ${enhanceResponse.body}`);
    
    if (enhanceResponse.statusCode === 401) {
      console.log('   ✓ Enhance correctly requires authentication');
    } else {
      console.log('   ✗ Enhance should require authentication');
    }
  } catch (error) {
    console.log(`   ✗ Enhance test failed: ${error.message}`);
  }
  
  // Test 5: Check CORS headers on API routes
  console.log('\n5. Testing CORS headers...');
  try {
    const corsResponse = await makeRequest('https://photoenhance.dev/api/photos/upload', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://photoenhance.dev',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`   Status: ${corsResponse.statusCode}`);
    console.log(`   CORS Headers:`);
    Object.keys(corsResponse.headers).forEach(header => {
      if (header.toLowerCase().includes('access-control')) {
        console.log(`     ${header}: ${corsResponse.headers[header]}`);
      }
    });
    
    if (corsResponse.headers['access-control-allow-origin']) {
      console.log('   ✓ CORS headers present');
    } else {
      console.log('   ✗ CORS headers missing');
    }
  } catch (error) {
    console.log(`   ✗ CORS test failed: ${error.message}`);
  }
  
  console.log('\n=== Summary ===');
  console.log('If all tests show ✓ for authentication requirements and CORS headers,');
  console.log('then the issue might be in the frontend authentication flow or session handling.');
}

testCompleteAuthFlow().catch(console.error);