#!/usr/bin/env node

/**
 * Production Test Suite for Serverless Architecture
 * Tests the new upload → status polling → enhancement workflow
 */

const fs = require('fs');
const path = require('path');

const PRODUCTION_URL = 'https://photoenhance.dev';
const TEST_IMAGE_PATH = path.join(__dirname, '..', 'public', 'photos', 'photo-1-before.jpg');

class ProductionTester {
  constructor() {
    this.results = {
      apiHealth: null,
      authentication: null,
      uploadWorkflow: null,
      statusPolling: null,
      enhancementProcessing: null,
      errorHandling: null,
      overallScore: 0
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Serverless Production Test Suite...\n');
    
    try {
      await this.testApiHealth();
      await this.testAuthentication();
      await this.testErrorHandling();
      
      console.log('\n📊 Production Test Results:');
      console.log('=====================================');
      
      Object.entries(this.results).forEach(([test, result]) => {
        if (test !== 'overallScore' && result) {
          const status = result.passed ? '✅' : '❌';
          console.log(`${status} ${test}: ${result.message}`);
        }
      });
      
      const passedTests = Object.values(this.results).filter(r => r && r.passed).length;
      const totalTests = Object.keys(this.results).length - 1; // Exclude overallScore
      this.results.overallScore = (passedTests / totalTests) * 100;
      
      console.log(`\n🎯 Overall Score: ${this.results.overallScore.toFixed(1)}%`);
      
      if (this.results.overallScore >= 90) {
        console.log('🎉 PRODUCTION READY: All critical systems operational');
      } else if (this.results.overallScore >= 75) {
        console.log('⚠️  MOSTLY READY: Some minor issues need attention');
      } else {
        console.log('🚨 NOT READY: Critical issues must be fixed before production use');
      }
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
    }
  }

  async testApiHealth() {
    console.log('🏥 Testing API Health...');
    
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/health`);
      const health = await response.json();
      
      const allHealthy = health.status === 'healthy' && 
                        health.services.database.status === 'healthy' &&
                        health.services.gemini.status === 'healthy' &&
                        health.services.storage.status === 'healthy';
      
      this.results.apiHealth = {
        passed: allHealthy,
        message: allHealthy 
          ? `All services healthy (DB: ${health.services.database.responseTime}ms)`
          : 'Some services unhealthy',
        data: health
      };
      
      console.log(`   ${allHealthy ? '✅' : '❌'} API Health: ${this.results.apiHealth.message}`);
      
    } catch (error) {
      this.results.apiHealth = {
        passed: false,
        message: `Health check failed: ${error.message}`
      };
      console.log(`   ❌ API Health: ${this.results.apiHealth.message}`);
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      // Test upload endpoint without auth (should return 401)
      const uploadResponse = await fetch(`${PRODUCTION_URL}/api/photos/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      // Test status endpoint without auth (should return 401)
      const statusResponse = await fetch(`${PRODUCTION_URL}/api/photos/status?photoId=test`);
      
      const uploadAuthCorrect = uploadResponse.status === 401;
      const statusAuthCorrect = statusResponse.status === 401;
      
      this.results.authentication = {
        passed: uploadAuthCorrect && statusAuthCorrect,
        message: `Upload: ${uploadResponse.status}, Status: ${statusResponse.status}`,
        data: {
          uploadStatus: uploadResponse.status,
          statusStatus: statusResponse.status
        }
      };
      
      console.log(`   ${this.results.authentication.passed ? '✅' : '❌'} Authentication: ${this.results.authentication.message}`);
      
    } catch (error) {
      this.results.authentication = {
        passed: false,
        message: `Auth test failed: ${error.message}`
      };
      console.log(`   ❌ Authentication: ${this.results.authentication.message}`);
    }
  }

  async testErrorHandling() {
    console.log('🛡️ Testing Error Handling...');
    
    try {
      // Test invalid requests return proper errors
      const tests = [
        { 
          name: 'Invalid photo ID', 
          url: `${PRODUCTION_URL}/api/photos/status?photoId=invalid`,
          expectedStatus: 401 // Auth required
        },
        {
          name: 'Invalid enhancement request',
          url: `${PRODUCTION_URL}/api/photos/enhance`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'upload-service',
            'X-User-Id': 'test'
          },
          body: JSON.stringify({ photoId: 'nonexistent' }),
          expectedStatus: 404 // Photo not found
        }
      ];
      
      let allPassed = true;
      const results = [];
      
      for (const test of tests) {
        const response = await fetch(test.url, {
          method: test.method || 'GET',
          headers: test.headers || {},
          body: test.body || undefined
        });
        
        const passed = response.status === test.expectedStatus;
        allPassed = allPassed && passed;
        results.push({ ...test, actualStatus: response.status, passed });
        
        console.log(`   ${passed ? '✅' : '❌'} ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
      }
      
      this.results.errorHandling = {
        passed: allPassed,
        message: `${results.filter(r => r.passed).length}/${results.length} error scenarios handled correctly`,
        data: results
      };
      
    } catch (error) {
      this.results.errorHandling = {
        passed: false,
        message: `Error handling test failed: ${error.message}`
      };
      console.log(`   ❌ Error Handling: ${this.results.errorHandling.message}`);
    }
  }

  // Note: Upload workflow and status polling tests would require authentication
  // These should be tested manually or with proper test credentials
  async testUploadWorkflow() {
    console.log('📤 Testing Upload Workflow...');
    console.log('   ⏭️  Skipping: Requires authenticated session');
    
    this.results.uploadWorkflow = {
      passed: null,
      message: 'Requires manual testing with authenticated session'
    };
  }

  async testStatusPolling() {
    console.log('🔄 Testing Status Polling...');
    console.log('   ⏭️  Skipping: Requires valid photo ID');
    
    this.results.statusPolling = {
      passed: null,
      message: 'Requires manual testing with valid photo ID'
    };
  }

  async testEnhancementProcessing() {
    console.log('🎨 Testing Enhancement Processing...');
    console.log('   ⏭️  Skipping: Requires full upload workflow');
    
    this.results.enhancementProcessing = {
      passed: null,
      message: 'Requires manual testing with uploaded photo'
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ProductionTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ProductionTester;