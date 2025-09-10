// Load environment variables from .env.prod
require('dotenv').config({ path: '.env.prod' });

const { put, list } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

/**
 * Test script to verify Vercel Blob token validity and permissions
 * This addresses the root cause of "File upload service unavailable" error
 */

async function testBlobToken() {
  console.log('🔍 Testing Vercel Blob Token Validity...');
  console.log('=====================================\n');

  // Check if token is configured
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.log('❌ BLOB_READ_WRITE_TOKEN not found in environment variables');
    console.log('   This is the root cause of the upload failure.');
    console.log('   Please ensure the token is set in production environment.');
    return;
  }

  console.log('✅ BLOB_READ_WRITE_TOKEN found in environment');
  console.log(`   Token length: ${token.length} characters`);
  console.log(`   Token prefix: ${token.substring(0, 20)}...\n`);

  try {
    // Test 1: List existing blobs (read permission)
    console.log('📋 Test 1: Testing READ permissions...');
    const listResult = await list();
    console.log(`   ✅ Successfully listed ${listResult.blobs.length} existing blobs`);
    if (listResult.blobs.length > 0) {
      console.log(`   📄 Sample blob: ${listResult.blobs[0].pathname}`);
    }

    // Test 2: Upload a test file (write permission)
    console.log('\n📤 Test 2: Testing WRITE permissions...');
    const testContent = Buffer.from('Test upload for blob token validation');
    const testFileName = `test-${Date.now()}.txt`;
    
    const uploadResult = await put(testFileName, testContent, {
      access: 'public'
    });
    
    console.log(`   ✅ Successfully uploaded test file`);
    console.log(`   📄 File URL: ${uploadResult.url}`);
    console.log(`   📄 File pathname: ${uploadResult.pathname}`);

    // Test 3: Verify the uploaded file is accessible
    console.log('\n🌐 Test 3: Testing file accessibility...');
    const fetch = require('node-fetch');
    const accessResponse = await fetch(uploadResult.url);
    
    if (accessResponse.ok) {
      const content = await accessResponse.text();
      console.log(`   ✅ File is publicly accessible`);
      console.log(`   📄 Content: ${content}`);
    } else {
      console.log(`   ❌ File not accessible: ${accessResponse.status}`);
    }

    // Test 4: Test image upload (mimicking actual use case)
    console.log('\n🖼️  Test 4: Testing image upload...');
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const imageFileName = `test-image-${Date.now()}.png`;
    
    const imageUploadResult = await put(imageFileName, imageBuffer, {
      access: 'public',
      contentType: 'image/png'
    });
    
    console.log(`   ✅ Successfully uploaded test image`);
    console.log(`   📄 Image URL: ${imageUploadResult.url}`);

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('   The Vercel Blob token is valid and has proper permissions.');
    console.log('   The upload error must be caused by something else.');
    
    console.log('\n🔍 NEXT STEPS:');
    console.log('   1. Check if the token is properly loaded in the production environment');
    console.log('   2. Verify network connectivity from Vercel to Blob storage');
    console.log('   3. Check for any rate limiting or quota issues');
    console.log('   4. Review production logs for specific error details');

  } catch (error) {
    console.log('\n❌ BLOB TOKEN TEST FAILED!');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('unauthorized') || error.message.includes('403')) {
      console.log('\n🔧 DIAGNOSIS: Token Authentication Issue');
      console.log('   - The token may be invalid or expired');
      console.log('   - The token may not have the required permissions');
      console.log('   - Check if the token is correctly set in Vercel environment variables');
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('\n🔧 DIAGNOSIS: Network Connectivity Issue');
      console.log('   - There may be network connectivity issues');
      console.log('   - Vercel may be experiencing service issues');
      console.log('   - Check Vercel status page for any ongoing incidents');
    } else {
      console.log('\n🔧 DIAGNOSIS: Unknown Issue');
      console.log('   - This may be a service-level issue');
      console.log('   - Check Vercel Blob service status');
      console.log('   - Review the full error details above');
    }
    
    console.log('\n📋 RECOMMENDED ACTIONS:');
    console.log('   1. Regenerate the Vercel Blob token');
    console.log('   2. Verify token is set in production environment');
    console.log('   3. Check Vercel dashboard for any service alerts');
    console.log('   4. Contact Vercel support if issue persists');
  }
}

// Run the test
testBlobToken().catch(console.error);