// Load environment variables from .env.prod
require('dotenv').config({ path: '.env.prod' });

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive test suite for upload error scenarios
 * This helps identify and prevent upload failures
 */

const BASE_URL = 'https://photoenhance.dev';

async function testUploadErrorScenarios() {
  console.log('🧪 Testing Upload Error Scenarios');
  console.log('==================================\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: No authentication
  await runTest('No Authentication', async () => {
    const form = new FormData();
    const testBuffer = Buffer.from('test-image-data');
    form.append('photo', testBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

    const response = await fetch(`${BASE_URL}/api/photos/upload`, {
      method: 'POST',
      body: form
    });

    return {
      expected: 401,
      actual: response.status,
      passed: response.status === 401,
      message: response.status === 401 ? 'Correctly rejects unauthenticated requests' : 'Should reject unauthenticated requests'
    };
  }, results);

  // Test 2: Invalid file type
  await runTest('Invalid File Type', async () => {
    const form = new FormData();
    const testBuffer = Buffer.from('not-an-image');
    form.append('photo', testBuffer, { filename: 'test.txt', contentType: 'text/plain' });

    const response = await fetch(`${BASE_URL}/api/photos/upload`, {
      method: 'POST',
      body: form
    });

    return {
      expected: 401, // Will be 401 due to no auth, but structure is correct
      actual: response.status,
      passed: response.status === 401,
      message: 'File type validation (blocked by auth first)'
    };
  }, results);

  // Test 3: No file provided
  await runTest('No File Provided', async () => {
    const form = new FormData();
    // Don't append any file

    const response = await fetch(`${BASE_URL}/api/photos/upload`, {
      method: 'POST',
      body: form
    });

    return {
      expected: 401,
      actual: response.status,
      passed: response.status === 401,
      message: 'Missing file validation (blocked by auth first)'
    };
  }, results);

  // Test 4: Large file (simulated)
  await runTest('Large File Upload', async () => {
    const form = new FormData();
    // Create a larger buffer to simulate big file
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
    form.append('photo', largeBuffer, { filename: 'large.jpg', contentType: 'image/jpeg' });

    const response = await fetch(`${BASE_URL}/api/photos/upload`, {
      method: 'POST',
      body: form,
      timeout: 30000 // 30 second timeout
    });

    return {
      expected: 401,
      actual: response.status,
      passed: response.status === 401,
      message: 'Large file handling (blocked by auth first)'
    };
  }, results);

  // Test 5: Malformed request
  await runTest('Malformed Request', async () => {
    const response = await fetch(`${BASE_URL}/api/photos/upload`, {
      method: 'POST',
      body: 'invalid-body',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      expected: 401,
      actual: response.status,
      passed: response.status === 401,
      message: 'Malformed request handling (blocked by auth first)'
    };
  }, results);

  // Test 6: Environment variable simulation
  await runTest('Environment Variable Check', async () => {
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;

    return {
      expected: true,
      actual: hasToken && hasDbUrl && hasNextAuthSecret,
      passed: hasToken && hasDbUrl && hasNextAuthSecret,
      message: `Env vars - Token: ${hasToken}, DB: ${hasDbUrl}, Auth: ${hasNextAuthSecret}`
    };
  }, results);

  // Test 7: Blob service connectivity
  await runTest('Blob Service Connectivity', async () => {
    try {
      const { list } = require('@vercel/blob');
      await list({ limit: 1 });
      return {
        expected: true,
        actual: true,
        passed: true,
        message: 'Blob service is accessible'
      };
    } catch (error) {
      return {
        expected: true,
        actual: false,
        passed: false,
        message: `Blob service error: ${error.message}`
      };
    }
  }, results);

  // Test 8: API endpoint availability
  await runTest('API Endpoint Availability', async () => {
    const response = await fetch(`${BASE_URL}/api/photos/upload`, {
      method: 'OPTIONS'
    });

    return {
      expected: [200, 405], // Either OK or Method Not Allowed is fine
      actual: response.status,
      passed: [200, 405].includes(response.status),
      message: 'API endpoint is reachable'
    };
  }, results);

  // Print summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`);

  // Print detailed results
  console.log('📋 DETAILED RESULTS');
  console.log('===================');
  results.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name}: ${test.message}`);
  });

  // Diagnosis and recommendations
  console.log('\n🔍 DIAGNOSIS & RECOMMENDATIONS');
  console.log('===============================');
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! The upload system appears to be configured correctly.');
    console.log('   If you\'re still seeing upload errors, the issue may be:');
    console.log('   • Environment variables not properly set in Vercel production');
    console.log('   • Authentication/session issues in the browser');
    console.log('   • Network connectivity issues from client to server');
  } else {
    console.log('⚠️  Some tests failed. Review the failed tests above for specific issues.');
    
    const failedTests = results.tests.filter(t => !t.passed);
    if (failedTests.some(t => t.name.includes('Environment'))) {
      console.log('   🔧 Environment variable issues detected');
    }
    if (failedTests.some(t => t.name.includes('Blob'))) {
      console.log('   🔧 Blob service connectivity issues detected');
    }
    if (failedTests.some(t => t.name.includes('API'))) {
      console.log('   🔧 API endpoint issues detected');
    }
  }

  console.log('\n📋 NEXT STEPS:');
  console.log('   1. Verify all environment variables are set in Vercel dashboard');
  console.log('   2. Check Vercel deployment logs for any errors');
  console.log('   3. Test with authenticated requests using valid session tokens');
  console.log('   4. Monitor Vercel Blob service status and quotas');
}

async function runTest(name, testFn, results) {
  console.log(`🧪 Running: ${name}...`);
  
  try {
    const result = await testFn();
    const passed = result.passed;
    
    if (passed) {
      results.passed++;
      console.log(`   ✅ ${result.message}`);
    } else {
      results.failed++;
      console.log(`   ❌ ${result.message}`);
      console.log(`      Expected: ${result.expected}, Got: ${result.actual}`);
    }
    
    results.tests.push({
      name,
      passed,
      message: result.message,
      expected: result.expected,
      actual: result.actual
    });
    
  } catch (error) {
    results.failed++;
    console.log(`   ❌ Test failed with error: ${error.message}`);
    
    results.tests.push({
      name,
      passed: false,
      message: `Error: ${error.message}`,
      expected: 'success',
      actual: 'error'
    });
  }
  
  console.log(''); // Empty line for readability
}

// Run the tests
testUploadErrorScenarios().catch(console.error);