#!/usr/bin/env node

/**
 * Test CORS with Specific Origin
 * This script tests CORS with the exact origin header that should be allowed
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
        'User-Agent': 'CORS-Test/1.0',
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

async function testCORSSpecific() {
  console.log('🔍 Testing CORS with Specific Origin Headers\n');
  
  const testCases = [
    {
      name: 'Production domain origin',
      origin: 'https://photoenhance.dev'
    },
    {
      name: 'Localhost development origin',
      origin: 'http://localhost:3001'
    },
    {
      name: 'No origin header',
      origin: null
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    const headers = {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    };
    
    if (testCase.origin) {
      headers['Origin'] = testCase.origin;
    }
    
    try {
      const response = await makeRequest('https://photoenhance.dev/api/photos/upload', {
        method: 'OPTIONS',
        headers
      });
      
      console.log(`  Status: ${response.statusCode}`);
      console.log(`  Headers:`);
      
      const corsHeaders = {};
      Object.keys(response.headers).forEach(header => {
        if (header.toLowerCase().includes('access-control')) {
          corsHeaders[header] = response.headers[header];
          console.log(`    ${header}: ${response.headers[header]}`);
        }
      });
      
      if (Object.keys(corsHeaders).length === 0) {
        console.log(`    No CORS headers found`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`  Error: ${error.message}\n`);
    }
  }
  
  console.log('=== Analysis ===');
  console.log('If CORS headers are still missing, the OPTIONS handler might not be deployed correctly.');
  console.log('Check if the deployment actually included the route changes.');
}

testCORSSpecific().catch(console.error);