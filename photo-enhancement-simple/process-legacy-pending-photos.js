/**
 * One-time script to process legacy PENDING photos
 * These are photos that were uploaded before the immediate processing fix
 */

const API_BASE_URL = process.env.NEXTAUTH_URL || 'https://photoenhance.dev';

async function processLegacyPendingPhotos() {
  console.log('🔄 Processing legacy PENDING photos...');
  console.log('=' .repeat(50));
  
  try {
    // Call the enhance API for the specific photo
    const photoId = 'cmfdzecjb00041cfn7m3p7nf5';
    
    console.log(`📸 Processing photo: ${photoId}`);
    
    const response = await fetch(`${API_BASE_URL}/api/photos/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use internal service authentication
        'x-internal-service': 'legacy-cleanup',
        'x-user-id': 'temp' // Will be retrieved from photo record
      },
      body: JSON.stringify({ photoId })
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Photo processed successfully:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to process photo:', errorText);
      
      if (response.status === 404) {
        console.log('💡 Photo may not exist or may have been deleted');
      } else if (response.status === 400) {
        console.log('💡 Photo may already be processed or have invalid status');
      } else if (response.status === 500) {
        console.log('💡 Server error - check logs for details');
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing photo:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('🌐 DNS resolution failed - check if domain is accessible');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('🔌 Connection refused - server may be down');
    }
  }
  
  console.log('\n💡 Note:');
  console.log('   - This script processes the specific photo that was reported as pending');
  console.log('   - Future uploads will be processed immediately during upload');
  console.log('   - No more legacy PENDING photos should accumulate');
}

// Polyfill fetch for Node.js if needed
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

processLegacyPendingPhotos().catch(console.error);