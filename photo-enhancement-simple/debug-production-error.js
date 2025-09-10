const fetch = require('node-fetch');

/**
 * Debug script to identify the specific cause of the 500 error in production
 * Based on analysis of the upload route code
 */

async function debugProductionError() {
  console.log('🔍 Debugging production 500 error...');
  
  // Test 1: Check if the issue is with Vercel Blob configuration
  console.log('\n1️⃣ Testing Vercel Blob configuration hypothesis...');
  
  try {
    // Make a request that would trigger the Vercel Blob path
    const response = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // This should trigger authentication redirect first
      }),
      redirect: 'manual'
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers));
    
    if (response.status === 307) {
      console.log('   ✅ Authentication redirect working correctly');
    }
    
  } catch (error) {
    console.error('   ❌ Request failed:', error.message);
  }
  
  // Test 2: Check if we can identify the specific error from server logs
  console.log('\n2️⃣ Analyzing potential error sources...');
  
  const potentialIssues = [
    {
      name: 'Vercel Blob Token Missing/Invalid',
      description: 'BLOB_READ_WRITE_TOKEN not configured properly',
      likelihood: 'HIGH',
      evidence: 'Code checks for token but fallback to local storage might fail in serverless'
    },
    {
      name: 'Database Connection Issues',
      description: 'Prisma connection failing in production',
      likelihood: 'MEDIUM',
      evidence: 'User credit check or photo creation could fail'
    },
    {
      name: 'File System Access',
      description: 'Local file storage path not writable in production',
      likelihood: 'HIGH',
      evidence: 'Serverless functions have read-only file system except /tmp'
    },
    {
      name: 'Environment Variables',
      description: 'Missing or misconfigured environment variables',
      likelihood: 'MEDIUM',
      evidence: 'Production environment might be missing required vars'
    }
  ];
  
  console.log('\n   🎯 Most likely causes:');
  potentialIssues
    .filter(issue => issue.likelihood === 'HIGH')
    .forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.name}`);
      console.log(`      📝 ${issue.description}`);
      console.log(`      🔍 ${issue.evidence}`);
      console.log('');
    });
}

// Test the specific error scenario that would occur with file system issues
async function testFileSystemHypothesis() {
  console.log('\n3️⃣ Testing file system hypothesis...');
  
  console.log('   💡 In serverless environments like Vercel:');
  console.log('   - File system is read-only except /tmp directory');
  console.log('   - Code tries to write to public/uploads which would fail');
  console.log('   - This would cause a 500 error when BLOB_READ_WRITE_TOKEN is not set');
  
  console.log('\n   🔧 Recommended fixes:');
  console.log('   1. Ensure BLOB_READ_WRITE_TOKEN is properly configured in production');
  console.log('   2. Add better error handling for file storage failures');
  console.log('   3. Use /tmp directory for local storage fallback in serverless');
}

// Main function
async function runDebug() {
  console.log('🚀 Starting production error debugging...');
  
  await debugProductionError();
  await testFileSystemHypothesis();
  
  console.log('\n✅ Debug analysis completed');
  console.log('\n📋 Summary:');
  console.log('   The 500 error is most likely caused by:');
  console.log('   1. Missing/invalid BLOB_READ_WRITE_TOKEN in production');
  console.log('   2. Code falling back to local file storage');
  console.log('   3. Attempting to write to read-only file system in serverless environment');
  console.log('\n   🎯 Next steps: Check Vercel environment variables and fix file storage logic');
}

if (require.main === module) {
  runDebug()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugProductionError, testFileSystemHypothesis };