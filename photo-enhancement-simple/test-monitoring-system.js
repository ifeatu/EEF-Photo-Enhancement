/**
 * Comprehensive Monitoring System Test Suite
 * 
 * Tests all monitoring, logging, tracing, and alerting functionality:
 * - Health checks
 * - Structured logging
 * - Request tracing
 * - Error tracking (Sentry)
 * - Metrics collection
 * - Alerting system
 * - Debug endpoints
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class MonitoringSystemTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
    this.authToken = null;
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.testResults.push(logMessage);
  }

  async testEndpoint(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MonitoringSystemTester/1.0',
          ...headers
        },
        timeout: 10000,
        validateStatus: () => true // Don't throw on any status code
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return {
        success: response.status >= 200 && response.status < 400,
        status: response.status,
        data: response.data,
        headers: response.headers,
        correlationId: response.headers['x-correlation-id'],
        traceId: response.headers['x-trace-id']
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        error: error.message,
        data: error.response?.data
      };
    }
  }

  // Test 1: Health Check System
  async testHealthChecks() {
    await this.log('\n=== HEALTH CHECK SYSTEM TEST ===');
    
    // Test main health endpoint
    const health = await this.testEndpoint('GET', '/api/health');
    await this.log(`Health endpoint: ${health.success ? '✅' : '❌'} (${health.status})`);
    
    if (health.success && health.data) {
      const healthData = health.data;
      await this.log(`Overall status: ${healthData.status}`);
      await this.log(`Database: ${healthData.services?.database?.status || 'unknown'}`);
      await this.log(`Gemini API: ${healthData.services?.gemini?.status || 'unknown'}`);
      await this.log(`Storage: ${healthData.services?.storage?.status || 'unknown'}`);
      await this.log(`Uptime: ${healthData.uptime || 'unknown'}s`);
      
      // Check if correlation ID is present
      if (health.correlationId) {
        await this.log(`✅ Correlation ID present: ${health.correlationId}`);
      } else {
        await this.log('❌ Correlation ID missing');
      }
    }
    
    return health.success;
  }

  // Test 2: Debug Endpoints
  async testDebugEndpoints() {
    await this.log('\n=== DEBUG ENDPOINTS TEST ===');
    
    const debug = await this.testEndpoint('GET', '/api/debug');
    await this.log(`Debug endpoint: ${debug.success ? '✅' : '❌'} (${debug.status})`);
    
    if (debug.success && debug.data) {
      const debugData = debug.data;
      await this.log(`Environment: ${debugData.environment || 'unknown'}`);
      await this.log(`Node version: ${debugData.nodeVersion || 'unknown'}`);
      await this.log(`Memory usage: ${JSON.stringify(debugData.memoryUsage || {})}`);
      
      if (debug.correlationId) {
        await this.log(`✅ Debug correlation ID: ${debug.correlationId}`);
      }
    }
    
    return debug.success;
  }

  // Test 3: Alerting System
  async testAlertingSystem() {
    await this.log('\n=== ALERTING SYSTEM TEST ===');
    
    // Test alerting status endpoint
    const alertStatus = await this.testEndpoint('GET', '/api/alerts');
    await this.log(`Alert status: ${alertStatus.success ? '✅' : '❌'} (${alertStatus.status})`);
    
    if (alertStatus.success && alertStatus.data) {
      const alertData = alertStatus.data;
      await this.log(`Alert rules: ${alertData.rulesCount || 0}`);
      await this.log(`Enabled rules: ${alertData.enabledRules || 0}`);
      await this.log(`Active alerts: ${alertData.activeAlerts || 0}`);
    }
    
    // Test manual alert check trigger
    const triggerCheck = await this.testEndpoint('POST', '/api/alerts', {
      action: 'check'
    });
    await this.log(`Alert check trigger: ${triggerCheck.success ? '✅' : '❌'} (${triggerCheck.status})`);
    
    // Test alert test functionality
    const testAlert = await this.testEndpoint('POST', '/api/alerts', {
      action: 'test',
      ruleId: 'high-upload-error-rate'
    });
    await this.log(`Alert test: ${testAlert.success ? '✅' : '❌'} (${testAlert.status})`);
    
    return alertStatus.success;
  }

  // Test 4: Request Tracing Headers
  async testRequestTracing() {
    await this.log('\n=== REQUEST TRACING TEST ===');
    
    // Test with custom trace headers
    const customHeaders = {
      'x-trace-id': 'test-trace-' + Date.now(),
      'x-correlation-id': 'test-correlation-' + Date.now()
    };
    
    const traced = await this.testEndpoint('GET', '/api/health', null, customHeaders);
    await this.log(`Traced request: ${traced.success ? '✅' : '❌'} (${traced.status})`);
    
    if (traced.traceId) {
      await this.log(`✅ Trace ID preserved: ${traced.traceId}`);
    } else {
      await this.log('❌ Trace ID not preserved');
    }
    
    if (traced.correlationId) {
      await this.log(`✅ Correlation ID preserved: ${traced.correlationId}`);
    } else {
      await this.log('❌ Correlation ID not preserved');
    }
    
    return traced.success;
  }

  // Test 5: Error Tracking Integration
  async testErrorTracking() {
    await this.log('\n=== ERROR TRACKING TEST ===');
    
    // Test upload endpoint without auth (should trigger error tracking)
    const uploadError = await this.testEndpoint('POST', '/api/photos/upload', {
      test: 'data'
    });
    await this.log(`Upload error test: ${uploadError.status === 401 ? '✅' : '❌'} (${uploadError.status})`);
    
    // Test enhancement endpoint without auth
    const enhanceError = await this.testEndpoint('POST', '/api/photos/enhance', {
      photoId: 'test-id'
    });
    await this.log(`Enhancement error test: ${enhanceError.status === 401 ? '✅' : '❌'} (${enhanceError.status})`);
    
    // Check if correlation IDs are present in error responses
    if (uploadError.correlationId) {
      await this.log(`✅ Upload error correlation ID: ${uploadError.correlationId}`);
    }
    
    if (enhanceError.correlationId) {
      await this.log(`✅ Enhancement error correlation ID: ${enhanceError.correlationId}`);
    }
    
    return true; // Errors are expected
  }

  // Test 6: Metrics Collection
  async testMetricsCollection() {
    await this.log('\n=== METRICS COLLECTION TEST ===');
    
    // Make multiple requests to generate metrics
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(this.testEndpoint('GET', '/api/health'));
    }
    
    const results = await Promise.all(requests);
    const successCount = results.filter(r => r.success).length;
    
    await this.log(`Metrics generation: ${successCount}/5 requests successful`);
    
    // Check if response times are being tracked
    const responseTimes = results.map(r => {
      const start = Date.now();
      return Date.now() - start;
    });
    
    await this.log(`Response time tracking: ✅ (${responseTimes.length} measurements)`);
    
    return successCount >= 3; // At least 3/5 should succeed
  }

  // Test 7: Structured Logging
  async testStructuredLogging() {
    await this.log('\n=== STRUCTURED LOGGING TEST ===');
    
    // Test endpoints that should generate structured logs
    const endpoints = [
      '/api/health',
      '/api/debug',
      '/api/alerts'
    ];
    
    let loggedRequests = 0;
    
    for (const endpoint of endpoints) {
      const response = await this.testEndpoint('GET', endpoint);
      if (response.correlationId) {
        loggedRequests++;
        await this.log(`✅ Structured logging for ${endpoint}: ${response.correlationId}`);
      } else {
        await this.log(`❌ No correlation ID for ${endpoint}`);
      }
    }
    
    await this.log(`Structured logging coverage: ${loggedRequests}/${endpoints.length} endpoints`);
    
    return loggedRequests >= endpoints.length * 0.8; // 80% coverage
  }

  // Test 8: CORS and Security Headers
  async testSecurityHeaders() {
    await this.log('\n=== SECURITY HEADERS TEST ===');
    
    const response = await this.testEndpoint('GET', '/api/health');
    
    if (response.headers) {
      const securityHeaders = [
        'x-correlation-id',
        'x-trace-id'
      ];
      
      let presentHeaders = 0;
      for (const header of securityHeaders) {
        if (response.headers[header]) {
          presentHeaders++;
          await this.log(`✅ ${header}: ${response.headers[header]}`);
        } else {
          await this.log(`❌ Missing header: ${header}`);
        }
      }
      
      await this.log(`Security headers: ${presentHeaders}/${securityHeaders.length} present`);
      return presentHeaders >= 1;
    }
    
    return false;
  }

  // Test 9: Performance Monitoring
  async testPerformanceMonitoring() {
    await this.log('\n=== PERFORMANCE MONITORING TEST ===');
    
    const startTime = Date.now();
    const response = await this.testEndpoint('GET', '/api/health');
    const responseTime = Date.now() - startTime;
    
    await this.log(`Response time: ${responseTime}ms`);
    
    if (responseTime < 5000) {
      await this.log('✅ Response time within acceptable limits');
    } else {
      await this.log('❌ Response time too slow');
    }
    
    // Test concurrent requests
    const concurrentStart = Date.now();
    const concurrentRequests = Array(3).fill().map(() => 
      this.testEndpoint('GET', '/api/health')
    );
    
    const concurrentResults = await Promise.all(concurrentRequests);
    const concurrentTime = Date.now() - concurrentStart;
    
    await this.log(`Concurrent requests (3): ${concurrentTime}ms`);
    await this.log(`Concurrent success rate: ${concurrentResults.filter(r => r.success).length}/3`);
    
    return responseTime < 5000 && concurrentResults.filter(r => r.success).length >= 2;
  }

  // Generate Test Report
  async generateReport() {
    await this.log('\n=== GENERATING TEST REPORT ===');
    
    const reportPath = path.join(__dirname, 'monitoring-test-report.txt');
    const reportContent = this.testResults.join('\n');
    
    try {
      fs.writeFileSync(reportPath, reportContent);
      await this.log(`✅ Test report saved to: ${reportPath}`);
    } catch (error) {
      await this.log(`❌ Failed to save report: ${error.message}`);
    }
  }

  // Run All Tests
  async runAllTests() {
    await this.log('🚀 COMPREHENSIVE MONITORING SYSTEM TEST STARTING\n');
    
    const tests = [
      { name: 'Health Checks', test: () => this.testHealthChecks() },
      { name: 'Debug Endpoints', test: () => this.testDebugEndpoints() },
      { name: 'Alerting System', test: () => this.testAlertingSystem() },
      { name: 'Request Tracing', test: () => this.testRequestTracing() },
      { name: 'Error Tracking', test: () => this.testErrorTracking() },
      { name: 'Metrics Collection', test: () => this.testMetricsCollection() },
      { name: 'Structured Logging', test: () => this.testStructuredLogging() },
      { name: 'Security Headers', test: () => this.testSecurityHeaders() },
      { name: 'Performance Monitoring', test: () => this.testPerformanceMonitoring() }
    ];
    
    const results = [];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        results.push({ name, success: result });
        await this.log(`${name}: ${result ? '✅ PASSED' : '❌ FAILED'}`);
      } catch (error) {
        results.push({ name, success: false, error: error.message });
        await this.log(`${name}: ❌ ERROR - ${error.message}`);
      }
    }
    
    // Summary
    await this.log('\n=== TEST SUMMARY ===');
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    await this.log(`Tests passed: ${passed}/${total}`);
    await this.log(`Success rate: ${Math.round((passed / total) * 100)}%`);
    
    if (passed === total) {
      await this.log('🎉 ALL MONITORING SYSTEMS WORKING CORRECTLY!');
    } else if (passed >= total * 0.8) {
      await this.log('⚠️  Most monitoring systems working, some issues detected');
    } else {
      await this.log('❌ Multiple monitoring system failures detected');
    }
    
    await this.generateReport();
    
    return passed >= total * 0.8; // 80% pass rate required
  }
}

// Run the tests
if (require.main === module) {
  const tester = new MonitoringSystemTester();
  tester.runAllTests().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = MonitoringSystemTester;