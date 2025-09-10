const https = require('https');
const fs = require('fs');
const path = require('path');

// Production debugging test for 502 errors
class VercelProductionDebugger {
  constructor() {
    this.baseUrl = 'https://photoenhance-frontend.vercel.app';
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }

  async makeRequest(endpoint, options = {}) {
    return new Promise((resolve) => {
      const url = `${this.baseUrl}${endpoint}`;
      const startTime = Date.now();
      
      const req = https.request(url, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Production-Debugger/1.0',
          'Accept': 'application/json',
          ...options.headers
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime,
            url
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          status: 0,
          error: error.message,
          responseTime,
          url
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        resolve({
          status: 0,
          error: 'Request timeout',
          responseTime,
          url
        });
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  async testHealthEndpoints() {
    console.log('\n🔍 Testing Health Endpoints...');
    
    const endpoints = [
      '/api/health',
      '/api/debug',
      '/api/metrics'
    ];

    for (const endpoint of endpoints) {
      const result = await this.makeRequest(endpoint);
      const passed = result.status === 200;
      
      this.results.tests.push({
        name: `Health Check: ${endpoint}`,
        endpoint,
        status: result.status,
        responseTime: result.responseTime,
        passed,
        error: result.error,
        details: passed ? 'OK' : `Status: ${result.status}, Error: ${result.error || 'Unknown'}`
      });

      console.log(`  ${passed ? '✅' : '❌'} ${endpoint}: ${result.status} (${result.responseTime}ms)`);
      if (!passed) {
        console.log(`    Error: ${result.error || 'HTTP ' + result.status}`);
      }
    }
  }

  async testUploadEndpoint() {
    console.log('\n🔍 Testing Upload Endpoint...');
    
    // Test OPTIONS request first
    const optionsResult = await this.makeRequest('/api/photos/upload', {
      method: 'OPTIONS'
    });
    
    const optionsPassed = optionsResult.status === 204 || optionsResult.status === 200;
    this.results.tests.push({
      name: 'Upload OPTIONS Request',
      endpoint: '/api/photos/upload',
      method: 'OPTIONS',
      status: optionsResult.status,
      responseTime: optionsResult.responseTime,
      passed: optionsPassed,
      error: optionsResult.error,
      details: optionsPassed ? 'CORS preflight OK' : `Status: ${optionsResult.status}`
    });

    console.log(`  ${optionsPassed ? '✅' : '❌'} OPTIONS /api/photos/upload: ${optionsResult.status} (${optionsResult.responseTime}ms)`);

    // Test POST request (should fail with 401 since no auth)
    const postResult = await this.makeRequest('/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    // 401 or 403 is expected for unauthenticated request, 502 is not
    const postPassed = postResult.status === 401 || postResult.status === 403;
    const is502Error = postResult.status === 502;
    
    this.results.tests.push({
      name: 'Upload POST Request (Unauthenticated)',
      endpoint: '/api/photos/upload',
      method: 'POST',
      status: postResult.status,
      responseTime: postResult.responseTime,
      passed: postPassed,
      error: postResult.error,
      is502: is502Error,
      details: is502Error ? '502 BAD GATEWAY - Server Error!' : 
               postPassed ? 'Expected auth error' : 
               `Unexpected status: ${postResult.status}`
    });

    console.log(`  ${postPassed ? '✅' : '❌'} POST /api/photos/upload: ${postResult.status} (${postResult.responseTime}ms)`);
    if (is502Error) {
      console.log(`    🚨 502 ERROR DETECTED! This indicates a server-side issue.`);
      this.results.summary.errors.push({
        type: '502_error',
        endpoint: '/api/photos/upload',
        details: 'Bad Gateway error indicates server configuration or code issue'
      });
    }
  }

  async testStaticAssets() {
    console.log('\n🔍 Testing Static Assets...');
    
    const assets = [
      '/',
      '/favicon.ico',
      '/_next/static/css/app/layout.css'
    ];

    for (const asset of assets) {
      const result = await this.makeRequest(asset);
      const passed = result.status === 200 || result.status === 404; // 404 is acceptable for some assets
      
      this.results.tests.push({
        name: `Static Asset: ${asset}`,
        endpoint: asset,
        status: result.status,
        responseTime: result.responseTime,
        passed,
        error: result.error,
        details: passed ? 'OK' : `Status: ${result.status}`
      });

      console.log(`  ${passed ? '✅' : '❌'} ${asset}: ${result.status} (${result.responseTime}ms)`);
    }
  }

  async testAuthEndpoints() {
    console.log('\n🔍 Testing Auth Endpoints...');
    
    const authEndpoints = [
      '/api/auth/providers',
      '/api/auth/session',
      '/api/auth/csrf'
    ];

    for (const endpoint of authEndpoints) {
      const result = await this.makeRequest(endpoint);
      const passed = result.status === 200;
      
      this.results.tests.push({
        name: `Auth Endpoint: ${endpoint}`,
        endpoint,
        status: result.status,
        responseTime: result.responseTime,
        passed,
        error: result.error,
        details: passed ? 'OK' : `Status: ${result.status}`
      });

      console.log(`  ${passed ? '✅' : '❌'} ${endpoint}: ${result.status} (${result.responseTime}ms)`);
    }
  }

  async checkServerHeaders() {
    console.log('\n🔍 Checking Server Headers...');
    
    const result = await this.makeRequest('/');
    const headers = result.headers || {};
    
    const serverInfo = {
      server: headers.server || 'Unknown',
      xVercelId: headers['x-vercel-id'] || 'Not found',
      xVercelCache: headers['x-vercel-cache'] || 'Not found',
      contentType: headers['content-type'] || 'Not found'
    };

    console.log(`  Server: ${serverInfo.server}`);
    console.log(`  Vercel ID: ${serverInfo.xVercelId}`);
    console.log(`  Vercel Cache: ${serverInfo.xVercelCache}`);
    console.log(`  Content-Type: ${serverInfo.contentType}`);

    this.results.serverInfo = serverInfo;
  }

  generateSummary() {
    const total = this.results.tests.length;
    const passed = this.results.tests.filter(t => t.passed).length;
    const failed = total - passed;
    const has502Errors = this.results.tests.some(t => t.is502);

    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${Math.round((passed / total) * 100)}%`,
      has502Errors,
      errors: this.results.summary.errors
    };

    console.log('\n📊 SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${this.results.summary.successRate}`);
    
    if (has502Errors) {
      console.log('\n🚨 502 ERRORS DETECTED!');
      console.log('This indicates a server-side issue that needs immediate attention.');
      console.log('\nPossible causes:');
      console.log('- Environment variables missing or incorrect');
      console.log('- Database connection issues');
      console.log('- Code compilation errors');
      console.log('- Dependency issues');
      console.log('- Memory/timeout limits exceeded');
    }

    console.log('\n📝 RECOMMENDATIONS');
    if (has502Errors) {
      console.log('1. Check Vercel function logs for detailed error messages');
      console.log('2. Verify all environment variables are set correctly');
      console.log('3. Test database connectivity');
      console.log('4. Check for any recent code changes that might cause issues');
      console.log('5. Verify all dependencies are properly installed');
    } else {
      console.log('No 502 errors detected. The issue might be intermittent or resolved.');
    }
  }

  async saveReport() {
    const reportPath = path.join(__dirname, 'vercel-502-debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  async runAllTests() {
    console.log('🚀 Starting Vercel Production 502 Debug Test');
    console.log('=' .repeat(60));
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Time: ${this.results.timestamp}`);

    try {
      await this.checkServerHeaders();
      await this.testHealthEndpoints();
      await this.testAuthEndpoints();
      await this.testUploadEndpoint();
      await this.testStaticAssets();
      
      this.generateSummary();
      await this.saveReport();
      
    } catch (error) {
      console.error('\n❌ Test execution failed:', error.message);
      this.results.summary.errors.push({
        type: 'test_execution_error',
        details: error.message
      });
    }
  }
}

// Run the debugger
if (require.main === module) {
  const productionDebugger = new VercelProductionDebugger();
  productionDebugger.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = VercelProductionDebugger;