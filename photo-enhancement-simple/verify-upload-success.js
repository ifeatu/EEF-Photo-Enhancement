const fetch = require('node-fetch');

// Production configuration
const PRODUCTION_URL = 'https://photoenhance.dev';

async function verifyUploadSuccess() {
    console.log('🔍 Verifying Upload Success');
    console.log('==========================\n');
    
    try {
        // Test if photos endpoint shows any uploaded photos
        console.log('📸 Checking photos endpoint...');
        const photosResponse = await fetch(`${PRODUCTION_URL}/api/photos`);
        console.log(`Photos endpoint: ${photosResponse.status} ${photosResponse.statusText}`);
        
        if (photosResponse.status === 401) {
            console.log('✅ Photos endpoint requires authentication (as expected)');
            console.log('\n📋 To verify upload success:');
            console.log('1. Login to the production app');
            console.log('2. Navigate to your photos/gallery page');
            console.log('3. Look for the uploaded and enhanced photo');
            console.log('4. Verify the enhancement quality\n');
        } else if (photosResponse.ok) {
            const photosData = await photosResponse.json();
            console.log('Photos data:', JSON.stringify(photosData, null, 2));
        } else {
            console.log('⚠️  Unexpected response from photos endpoint');
        }
        
        // Test admin endpoint (should be protected)
        console.log('🔐 Testing admin endpoint...');
        const adminResponse = await fetch(`${PRODUCTION_URL}/api/admin`);
        console.log(`Admin endpoint: ${adminResponse.status} ${adminResponse.statusText}`);
        
        if (adminResponse.status === 401 || adminResponse.status === 403) {
            console.log('✅ Admin endpoint is properly protected');
        }
        
        console.log('\n🎯 Manual Verification Steps:');
        console.log('=============================');
        console.log('1. Open the production app in your browser');
        console.log('2. Sign in with your Google account');
        console.log('3. Check if your uploaded photo appears in the gallery');
        console.log('4. Verify the photo has been enhanced');
        console.log('5. Compare the before/after quality');
        console.log('6. Test downloading the enhanced photo');
        
    } catch (error) {
        console.error('❌ Error during verification:', error.message);
    }
}

// Run verification
verifyUploadSuccess();