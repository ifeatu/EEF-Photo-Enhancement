/**
 * Production Domain Validation Script
 * 
 * Validates that photoenhance.dev is properly configured and working
 * with all the serverless refactoring improvements
 */

const https = require('https');
const dns = require('dns').promises;

const PRODUCTION_DOMAIN = 'photoenhance.dev';
const EXPECTED_API_VERSION = '2.0.0-serverless';

class ProductionDomainValidator {
  constructor() {
    this.results = {
      dnsResolution: false,
      httpsConnection: false,
      apiHealth: false,
      geminiConfig: false,
      serverlessConfig: false,
      corsHeaders: false
    };
  }

  async log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const statusEmoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '🔄'
    };
    console.log(`${statusEmoji[status]} [${timestamp}] ${message}`);
  }

  async testDNSResolution() {
    await this.log('Testing DNS resolution for photoenhance.dev...', 'progress');
    
    try {
      const addresses = await dns.lookup(PRODUCTION_DOMAIN);
      await this.log(`DNS resolved to: ${addresses.address}`, 'success');
      
      // Test CNAME/AAAA records for Vercel
      try {
        const cname = await dns.resolveCname(PRODUCTION_DOMAIN);
        await this.log(`CNAME record: ${cname.join(', ')}`, 'info');
      } catch {
        // CNAME might not exist if A record is used
        await this.log('No CNAME record found (using A record)', 'info');
      }
      
      this.results.dnsResolution = true;
      return true;
    } catch (error) {
      await this.log(`DNS resolution failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testHTTPSConnection() {
    await this.log('Testing HTTPS connection...', 'progress');
    
    return new Promise((resolve) => {
      const req = https.get(`https://${PRODUCTION_DOMAIN}`, (res) => {
        this.log(`HTTPS connection successful: ${res.statusCode} ${res.statusMessage}`, 'success');
        this.log(`SSL/TLS: ${res.connection.getPeerCertificate().subject.CN}`, 'info');
        this.results.httpsConnection = true;
        resolve(true);
      });
      
      req.on('error', (error) => {
        this.log(`HTTPS connection failed: ${error.message}`, 'error');
        resolve(false);
      });
      
      req.setTimeout(10000, () => {
        this.log('HTTPS connection timeout', 'error');
        req.destroy();
        resolve(false);
      });
    });
  }

  async testAPIHealth() {
    await this.log('Testing API health endpoint...', 'progress');
    
    try {
      const response = await fetch(`https://${PRODUCTION_DOMAIN}/api/photos/enhance`, {
        method: 'GET',
        headers: {
          'User-Agent': 'ProductionDomainValidator/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.healthy && data.service === 'photo-enhancement-api') {
          await this.log(`API health check passed: ${data.service} ${data.version}`, 'success');
          
          if (data.version === EXPECTED_API_VERSION) {
            await this.log(`Correct API version: ${data.version}`, 'success');
          } else {
            await this.log(`Unexpected API version: ${data.version} (expected ${EXPECTED_API_VERSION})`, 'warning');
          }
          
          this.results.apiHealth = true;
          return data;
        } else {
          await this.log('API health check returned unhealthy status', 'error');
          return null;
        }
      } else {
        await this.log(`API health check failed: ${response.status} ${response.statusText}`, 'error');
        return null;
      }
    } catch (error) {
      await this.log(`API health check error: ${error.message}`, 'error');
      return null;
    }
  }

  async testGeminiConfiguration(healthData) {
    await this.log('Validating Gemini AI configuration...', 'progress');
    
    if (!healthData?.config) {
      await this.log('No configuration data available from health check', 'error');
      return false;
    }

    const config = healthData.config;
    const checks = [
      { name: 'Gemini Model', value: config.model, expected: 'gemini-2.0-flash-exp' },
      { name: 'Sharp Disabled', value: config.sharpEnabled, expected: false },
      { name: 'Timeout Configuration', value: config.timeout, expected: 45000 },
      { name: 'Max Retries', value: config.maxRetries, expected: 2 }
    ];

    let allPassed = true;
    for (const check of checks) {
      if (check.value === check.expected) {
        await this.log(`✓ ${check.name}: ${check.value}`, 'success');
      } else {
        await this.log(`✗ ${check.name}: ${check.value} (expected ${check.expected})`, 'error');
        allPassed = false;
      }
    }

    this.results.geminiConfig = allPassed;
    return allPassed;
  }

  async testServerlessConfiguration(healthData) {
    await this.log('Validating serverless configuration...', 'progress');
    
    if (!healthData?.environment) {
      await this.log('No environment data available from health check', 'error');
      return false;
    }

    const env = healthData.environment;
    const checks = [
      { name: 'Production Environment', value: env.isProduction, expected: true },
      { name: 'Development Environment', value: env.isDevelopment, expected: false }
    ];

    let allPassed = true;
    for (const check of checks) {
      if (check.value === check.expected) {
        await this.log(`✓ ${check.name}: ${check.value}`, 'success');
      } else {
        await this.log(`✗ ${check.name}: ${check.value} (expected ${check.expected})`, 'error');
        allPassed = false;
      }
    }

    // Check base URL
    if (env.baseUrl) {
      if (env.baseUrl === 'https://photoenhance.dev') {
        await this.log(`✓ Base URL: ${env.baseUrl}`, 'success');
      } else {
        await this.log(`✗ Base URL: ${env.baseUrl} (expected https://photoenhance.dev)`, 'warning');
      }
    }

    this.results.serverlessConfig = allPassed;
    return allPassed;
  }

  async testCORSHeaders() {
    await this.log('Testing CORS headers...', 'progress');
    
    try {
      const response = await fetch(`https://${PRODUCTION_DOMAIN}/api/photos/enhance`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://test.example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };

      if (corsHeaders['access-control-allow-origin']) {
        await this.log(`CORS Origin: ${corsHeaders['access-control-allow-origin']}`, 'success');
      }
      if (corsHeaders['access-control-allow-methods']) {
        await this.log(`CORS Methods: ${corsHeaders['access-control-allow-methods']}`, 'success');
      }
      if (corsHeaders['access-control-allow-headers']) {
        await this.log(`CORS Headers: ${corsHeaders['access-control-allow-headers']}`, 'success');
      }

      this.results.corsHeaders = true;
      return true;
    } catch (error) {
      await this.log(`CORS test error: ${error.message}`, 'error');
      return false;
    }
  }

  async generateReport() {
    const report = {
      domain: PRODUCTION_DOMAIN,
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalTests: Object.keys(this.results).length,
        passed: Object.values(this.results).filter(Boolean).length,
        failed: Object.values(this.results).filter(result => result === false).length
      }
    };

    console.log('\n🌐 PRODUCTION DOMAIN VALIDATION REPORT');
    console.log('======================================');
    console.log(`Domain: ${PRODUCTION_DOMAIN}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log('');
    console.log('Test Results:');
    console.log(`✅ DNS Resolution: ${this.results.dnsResolution ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ HTTPS Connection: ${this.results.httpsConnection ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ API Health: ${this.results.apiHealth ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Gemini Configuration: ${this.results.geminiConfig ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Serverless Configuration: ${this.results.serverlessConfig ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ CORS Headers: ${this.results.corsHeaders ? 'PASSED' : 'FAILED'}`);
    console.log(`\n🎯 Overall: ${report.summary.passed}/${report.summary.totalTests} tests passed`);

    if (report.summary.passed === report.summary.totalTests) {
      console.log('\n🎉 All tests passed! photoenhance.dev is properly configured and operational.');
    } else {
      console.log(`\n⚠️ ${report.summary.failed} test(s) failed. Review the details above.`);
    }

    return report;
  }

  async runValidation() {
    await this.log(`Starting production domain validation for ${PRODUCTION_DOMAIN}...`, 'info');
    
    try {
      // Test 1: DNS Resolution
      await this.testDNSResolution();

      // Test 2: HTTPS Connection
      await this.testHTTPSConnection();

      // Test 3: API Health
      const healthData = await this.testAPIHealth();

      // Test 4: Gemini Configuration (if health data available)
      if (healthData) {
        await this.testGeminiConfiguration(healthData);
        await this.testServerlessConfiguration(healthData);
      }

      // Test 5: CORS Headers
      await this.testCORSHeaders();

      // Generate final report
      const report = await this.generateReport();
      
      return report.summary.passed === report.summary.totalTests;

    } catch (error) {
      await this.log(`Validation failed with error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new ProductionDomainValidator();
  validator.runValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = ProductionDomainValidator;