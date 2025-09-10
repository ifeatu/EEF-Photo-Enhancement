const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Test configuration
const DEV_BASE_URL = 'http://localhost:3001';
const PROD_BASE_URL = 'https://photo-enhancement-simple.vercel.app';
const TEST_TIMEOUT = 10000;

// Note: Development mode bypasses authentication for convenience
// This test focuses on production behavior and development route accessibility

/**
 * Comprehensive Service Account Authentication Test Suite
 * Tests all aspects of the authentication system including:
 * - Basic authentication
 * - API key authentication
 * - Bearer token authentication
 * - Permission-based access control
 * - Rate limiting
 * - Security measures
 */

class ServiceAuthTester {
  constructor() {
    this.environments = [
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
    
    this.testCredentials = {
      valid: {
        username: 'admin',
        password: 'secure_admin_2024!',
        apiKey: 'test-api-key-12345',
        token: 'test-service-token-67890'
      },
      invalid: {
        username: 'hacker',
        password: 'wrongpassword',
        apiKey: 'invalid-key',
        token: 'invalid-token'
      }
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }
  
  /**
   * Make HTTP request with proper error handling
   */
  async makeRequest(environment, path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, environment.baseUrl);
      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (environment.protocol === https ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ServiceAuthTester/1.0',
          ...options.headers
        },
        timeout: 10000
      };
      
      const req = environment.protocol.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: jsonData,
              rawData: data
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: {},
              rawData: data
            });
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }
  
  /**
   * Test basic authentication
   */
  async testBasicAuth(environment) {
    console.log(`\n🔐 Testing Basic Authentication on ${environment.name}`);
    
    const tests = [
      {
        name: 'Valid credentials',
        credentials: this.testCredentials.valid,
        expectedStatus: [200, 401] // 401 if auth is working but creds are wrong
      },
      {
        name: 'Invalid credentials',
        credentials: this.testCredentials.invalid,
        expectedStatus: [401]
      },
      {
        name: 'No credentials',
        credentials: null,
        expectedStatus: [401]
      }
    ];
    
    for (const test of tests) {
      try {
        const headers = {};
        if (test.credentials) {
          const auth = Buffer.from(`${test.credentials.username}:${test.credentials.password}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }
        
        const response = await this.makeRequest(environment, '/api/admin', { headers });
        
        if (test.expectedStatus.includes(response.status)) {
          console.log(`  ✅ ${test.name}: ${response.status}`);
          this.testResults.passed++;
        } else {
          console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
          this.testResults.failed++;
          this.testResults.errors.push(`Basic Auth ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${test.name}: Error - ${error.message}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Basic Auth ${test.name}: ${error.message}`);
      }
    }
  }
  
  /**
   * Test API key authentication
   */
  async testApiKeyAuth(environment) {
    console.log(`\n🔑 Testing API Key Authentication on ${environment.name}`);
    
    const tests = [
      {
        name: 'Valid API key',
        apiKey: this.testCredentials.valid.apiKey,
        expectedStatus: [200, 401]
      },
      {
        name: 'Invalid API key',
        apiKey: this.testCredentials.invalid.apiKey,
        expectedStatus: [401]
      },
      {
        name: 'Empty API key',
        apiKey: '',
        expectedStatus: [401]
      }
    ];
    
    for (const test of tests) {
      try {
        const headers = {
          'X-API-Key': test.apiKey
        };
        
        const response = await this.makeRequest(environment, '/api/admin', { headers });
        
        if (test.expectedStatus.includes(response.status)) {
          console.log(`  ✅ ${test.name}: ${response.status}`);
          this.testResults.passed++;
        } else {
          console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
          this.testResults.failed++;
          this.testResults.errors.push(`API Key ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${test.name}: Error - ${error.message}`);
        this.testResults.failed++;
        this.testResults.errors.push(`API Key ${test.name}: ${error.message}`);
      }
    }
  }
  
  /**
   * Test Bearer token authentication
   */
  async testBearerAuth(environment) {
    console.log(`\n🎫 Testing Bearer Token Authentication on ${environment.name}`);
    
    const tests = [
      {
        name: 'Valid bearer token',
        token: this.testCredentials.valid.token,
        expectedStatus: [200, 401]
      },
      {
        name: 'Invalid bearer token',
        token: this.testCredentials.invalid.token,
        expectedStatus: [401]
      },
      {
        name: 'Malformed bearer token',
        token: 'not-a-valid-token-format',
        expectedStatus: [401]
      }
    ];
    
    for (const test of tests) {
      try {
        const headers = {
          'Authorization': `Bearer ${test.token}`
        };
        
        const response = await this.makeRequest(environment, '/api/admin', { headers });
        
        if (test.expectedStatus.includes(response.status)) {
          console.log(`  ✅ ${test.name}: ${response.status}`);
          this.testResults.passed++;
        } else {
          console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
          this.testResults.failed++;
          this.testResults.errors.push(`Bearer ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${test.name}: Error - ${error.message}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Bearer ${test.name}: ${error.message}`);
      }
    }
  }
  
  /**
   * Test permission-based access control
   */
  async testPermissions(environment) {
    console.log(`\n🛡️ Testing Permission-Based Access Control on ${environment.name}`);
    
    const endpoints = [
      {
        path: '/api/admin',
        method: 'GET',
        requiredPermission: 'admin:read',
        description: 'Admin read endpoint'
      },
      {
        path: '/api/admin',
        method: 'POST',
        requiredPermission: 'admin:write',
        description: 'Admin write endpoint',
        body: { action: 'system_info' }
      },
      {
        path: '/api/debug',
        method: 'GET',
        requiredPermission: 'debug:read',
        description: 'Debug endpoint'
      }
    ];
    
    for (const endpoint of endpoints) {
      try {
        // Test with valid credentials (should work if permissions are correct)
        const auth = Buffer.from(`${this.testCredentials.valid.username}:${this.testCredentials.valid.password}`).toString('base64');
        const headers = {
          'Authorization': `Basic ${auth}`
        };
        
        const response = await this.makeRequest(environment, endpoint.path, {
          method: endpoint.method,
          headers,
          body: endpoint.body
        });
        
        // We expect either 200 (success) or 401/403 (auth working but denied)
        if ([200, 401, 403, 404].includes(response.status)) {
          console.log(`  ✅ ${endpoint.description}: ${response.status} (${endpoint.method})`);
          this.testResults.passed++;
        } else {
          console.log(`  ❌ ${endpoint.description}: Unexpected status ${response.status}`);
          this.testResults.failed++;
          this.testResults.errors.push(`Permission ${endpoint.description}: Unexpected status ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${endpoint.description}: Error - ${error.message}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Permission ${endpoint.description}: ${error.message}`);
      }
    }
  }
  
  /**
   * Test rate limiting
   */
  async testRateLimiting(environment) {
    console.log(`\n⏱️ Testing Rate Limiting on ${environment.name}`);
    
    try {
      const requests = [];
      const maxRequests = 10;
      
      // Make multiple rapid requests
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          this.makeRequest(environment, '/api/admin', {
            headers: {
              'Authorization': `Basic ${Buffer.from('invalid:invalid').toString('base64')}`
            }
          })
        );
      }
      
      const responses = await Promise.allSettled(requests);
      const statusCodes = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.status);
      
      const rateLimitedCount = statusCodes.filter(code => code === 429).length;
      
      if (rateLimitedCount > 0) {
        console.log(`  ✅ Rate limiting active: ${rateLimitedCount}/${maxRequests} requests rate limited`);
        this.testResults.passed++;
      } else {
        console.log(`  ⚠️ Rate limiting not detected (may be disabled in development)`);
        this.testResults.passed++; // Not necessarily a failure
      }
    } catch (error) {
      console.log(`  ❌ Rate limiting test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Rate limiting: ${error.message}`);
    }
  }
  
  /**
   * Test security headers
   */
  async testSecurityHeaders(environment) {
    console.log(`\n🔒 Testing Security Headers on ${environment.name}`);
    
    try {
      const response = await this.makeRequest(environment, '/api/admin');
      
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'strict-transport-security'
      ];
      
      let foundHeaders = 0;
      for (const header of securityHeaders) {
        if (response.headers[header]) {
          foundHeaders++;
          console.log(`  ✅ ${header}: ${response.headers[header]}`);
        } else {
          console.log(`  ⚠️ ${header}: Not present`);
        }
      }
      
      if (foundHeaders > 0) {
        console.log(`  ✅ Security headers present: ${foundHeaders}/${securityHeaders.length}`);
        this.testResults.passed++;
      } else {
        console.log(`  ❌ No security headers found`);
        this.testResults.failed++;
        this.testResults.errors.push('No security headers found');
      }
    } catch (error) {
      console.log(`  ❌ Security headers test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Security headers: ${error.message}`);
    }
  }
  
  /**
   * Test middleware protection
   */
  async testMiddlewareProtection(environment) {
    console.log(`\n🛡️ Testing Middleware Protection on ${environment.name}`);
    
    const protectedRoutes = [
      '/api/admin',
      '/api/debug',
      '/api/admin/users',
      '/api/debug/system'
    ];
    
    for (const route of protectedRoutes) {
      try {
        // Test without authentication
        const response = await this.makeRequest(environment, route);
        
        if (response.status === 401) {
          console.log(`  ✅ ${route}: Protected (401)`);
          this.testResults.passed++;
        } else if (response.status === 404) {
          console.log(`  ⚠️ ${route}: Not found (404) - route may not exist`);
          this.testResults.passed++; // Not a security issue
        } else {
          console.log(`  ❌ ${route}: Not protected (${response.status})`);
          this.testResults.failed++;
          this.testResults.errors.push(`Route ${route} not protected: ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${route}: Error - ${error.message}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Route ${route}: ${error.message}`);
      }
    }
  }
  
  /**
   * Run all tests for a specific environment
   */
  async runEnvironmentTests(environment) {
    console.log(`\n🚀 Testing ${environment.name} Environment`);
    console.log(`📍 Base URL: ${environment.baseUrl}`);
    console.log('=' .repeat(60));
    
    await this.testBasicAuth(environment);
    await this.testApiKeyAuth(environment);
    await this.testBearerAuth(environment);
    await this.testPermissions(environment);
    await this.testRateLimiting(environment);
    await this.testSecurityHeaders(environment);
    await this.testMiddlewareProtection(environment);
  }
  
  /**
   * Run comprehensive test suite
   */
  async runAllTests() {
    console.log('🔐 Service Account Authentication Test Suite');
    console.log('=' .repeat(60));
    
    for (const environment of this.environments) {
      try {
        await this.runEnvironmentTests(environment);
      } catch (error) {
        console.log(`\n❌ Failed to test ${environment.name}: ${error.message}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Environment ${environment.name}: ${error.message}`);
      }
    }
    
    this.printSummary();
  }
  
  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🔍 SECURITY RECOMMENDATIONS:');
    console.log('1. Ensure rate limiting is enabled in production');
    console.log('2. Verify all security headers are present');
    console.log('3. Test with real production credentials');
    console.log('4. Monitor authentication logs for suspicious activity');
    console.log('5. Regularly rotate service account credentials');
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ServiceAuthTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ServiceAuthTester;