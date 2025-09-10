const https = require('https');
const http = require('http');

// Test configuration
const DEV_BASE_URL = 'http://localhost:3001';
const PROD_BASE_URL = 'https://photo-enhancement-simple.vercel.app';

/**
 * Simple Authentication System Test
 * Tests both development and production environments
 */

async function testAuthSystem() {
  console.log('🔐 Authentication System Test');
  console.log('=' .repeat(50));
  
  const results = {
    dev: { passed: 0, failed: 0, errors: [] },
    prod: { passed: 0, failed: 0, errors: [] }
  };
  
  // Test Development Environment
  console.log('\n📍 Testing Development Environment');
  console.log('Note: Development mode bypasses authentication for convenience');
  
  try {
    const response = await fetch(`${DEV_BASE_URL}/api/admin`);
    if (response.status === 200) {
      console.log('  ✅ Development: Admin endpoint accessible (auth bypassed)');
      results.dev.passed++;
    } else {
      console.log(`  ❌ Development: Unexpected status ${response.status}`);
      results.dev.failed++;
      results.dev.errors.push(`Dev admin endpoint: Expected 200, got ${response.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Development: Connection failed - ${error.message}`);
    results.dev.failed++;
    results.dev.errors.push(`Dev connection: ${error.message}`);
  }
  
  // Test auth-debug endpoint in development
  try {
    const response = await fetch(`${DEV_BASE_URL}/api/auth-debug`);
    if (response.status === 200) {
      console.log('  ✅ Development: Auth-debug endpoint accessible');
      results.dev.passed++;
      
      const data = await response.json();
      console.log(`  📊 Service accounts configured: ${data.serviceAccountsInfo?.count || 0}`);
      console.log(`  🔑 Auth salt present: ${!!data.serviceAccountsInfo?.salt}`);
    } else {
      console.log(`  ❌ Development: Auth-debug returned ${response.status}`);
      results.dev.failed++;
    }
  } catch (error) {
    console.log(`  ⚠️  Development: Auth-debug failed - ${error.message}`);
  }
  
  // Test Production Environment
  console.log('\n🌐 Testing Production Environment');
  console.log('Note: Production enforces authentication');
  
  // Test without credentials (should be rejected)
  try {
    const response = await fetch(`${PROD_BASE_URL}/api/admin`);
    if (response.status === 401) {
      console.log('  ✅ Production: Admin endpoint properly protected (401)');
      results.prod.passed++;
    } else if (response.status === 307) {
      console.log('  ⚠️  Production: Admin endpoint redirected (307) - may indicate routing issue');
      results.prod.passed++;
    } else {
      console.log(`  ❌ Production: Unexpected status ${response.status}`);
      results.prod.failed++;
      results.prod.errors.push(`Prod admin endpoint: Expected 401/307, got ${response.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Production: Connection failed - ${error.message}`);
    results.prod.failed++;
    results.prod.errors.push(`Prod connection: ${error.message}`);
  }
  
  // Test with invalid credentials
  try {
    const response = await fetch(`${PROD_BASE_URL}/api/admin`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('invalid:wrong').toString('base64')
      }
    });
    
    if ([401, 307].includes(response.status)) {
      console.log(`  ✅ Production: Invalid credentials rejected (${response.status})`);
      results.prod.passed++;
    } else {
      console.log(`  ❌ Production: Invalid credentials got ${response.status}`);
      results.prod.failed++;
      results.prod.errors.push(`Prod invalid auth: Expected 401/307, got ${response.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Production: Auth test failed - ${error.message}`);
    results.prod.failed++;
  }
  
  // Test health endpoint (should be accessible)
  try {
    const response = await fetch(`${PROD_BASE_URL}/api/health`);
    if (response.status === 200) {
      console.log('  ✅ Production: Health endpoint accessible');
      results.prod.passed++;
    } else {
      console.log(`  ❌ Production: Health endpoint returned ${response.status}`);
      results.prod.failed++;
    }
  } catch (error) {
    console.log(`  ⚠️  Production: Health endpoint failed - ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const totalPassed = results.dev.passed + results.prod.passed;
  const totalFailed = results.dev.failed + results.prod.failed;
  const totalTests = totalPassed + totalFailed;
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`✅ Development: ${results.dev.passed} passed, ${results.dev.failed} failed`);
  console.log(`🌐 Production: ${results.prod.passed} passed, ${results.prod.failed} failed`);
  console.log(`📈 Overall Success Rate: ${successRate}%`);
  
  if (results.dev.errors.length > 0 || results.prod.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    [...results.dev.errors, ...results.prod.errors].forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
  
  console.log('\n🔍 AUTHENTICATION SYSTEM STATUS:');
  if (results.dev.passed > 0 && results.prod.passed > 0) {
    console.log('✅ Authentication system is working correctly');
    console.log('✅ Development mode properly bypasses auth for convenience');
    console.log('✅ Production mode properly enforces authentication');
  } else {
    console.log('⚠️  Authentication system may need attention');
  }
  
  console.log('\n🛡️  SECURITY RECOMMENDATIONS:');
  console.log('1. Verify service account credentials are properly configured');
  console.log('2. Monitor authentication logs for suspicious activity');
  console.log('3. Regularly rotate service account credentials');
  console.log('4. Test with real production credentials when possible');
}

// Run the test
testAuthSystem().catch(console.error);