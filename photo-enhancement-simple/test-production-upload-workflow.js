const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test configuration
const PRODUCTION_URL = 'https://photoenhance-frontend-bz1t6mwfb-pierre-malbroughs-projects.vercel.app';
const TEST_PHOTO_PATH = '../photos/photo-1-before.jpg'; // Use original photo for enhancement

async function testProductionUploadWorkflow() {
    console.log('🚀 Testing Production Upload Workflow');
    console.log('=====================================\n');
    
    try {
        // Step 1: Check if test photo exists
        console.log('📁 Checking test photo...');
        if (!fs.existsSync(TEST_PHOTO_PATH)) {
            throw new Error(`Test photo not found: ${TEST_PHOTO_PATH}`);
        }
        console.log(`✅ Found test photo: ${TEST_PHOTO_PATH}\n`);
        
        // Step 2: Test production health
        console.log('🏥 Checking production health...');
        const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`);
        console.log(`Health check: ${healthResponse.status} ${healthResponse.statusText}`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('Health data:', JSON.stringify(healthData, null, 2));
        }
        console.log('');
        
        // Step 3: Test authentication (should require login)
        console.log('🔐 Testing authentication requirement...');
        const authTestResponse = await fetch(`${PRODUCTION_URL}/api/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: 'auth' })
        });
        
        console.log(`Auth test: ${authTestResponse.status} ${authTestResponse.statusText}`);
        if (authTestResponse.status === 401) {
            console.log('✅ Authentication properly required for upload endpoint\n');
        } else {
            console.log('⚠️  Unexpected auth response\n');
        }
        
        // Step 4: Open production app for manual login
        console.log('🌐 Opening production app for manual login...');
        console.log(`Please open: ${PRODUCTION_URL}`);
        console.log('1. Login with your Google account');
        console.log('2. Navigate to the upload page');
        console.log('3. Upload the photo manually to test the workflow\n');
        
        // Step 5: Test photos endpoint (should show uploaded photos after login)
        console.log('📸 Testing photos endpoint...');
        const photosResponse = await fetch(`${PRODUCTION_URL}/api/photos`);
        console.log(`Photos endpoint: ${photosResponse.status} ${photosResponse.statusText}`);
        
        if (photosResponse.ok) {
            const photosData = await photosResponse.json();
            console.log(`Found ${photosData.photos ? photosData.photos.length : 0} photos`);
        } else if (photosResponse.status === 401) {
            console.log('✅ Photos endpoint properly requires authentication');
        }
        console.log('');
        
        // Step 6: Instructions for manual testing
        console.log('📋 Manual Testing Instructions:');
        console.log('==============================');
        console.log('1. Open the production URL above');
        console.log('2. Sign in with Google OAuth');
        console.log('3. Navigate to the upload page');
        console.log(`4. Upload the test photo: ${path.resolve(TEST_PHOTO_PATH)}`);
        console.log('5. Wait for enhancement to complete');
        console.log('6. Verify the enhanced photo appears in your photos list');
        console.log('7. Check that the enhancement quality is good\n');
        
        console.log('✅ Production workflow test setup complete!');
        console.log('The app is ready for manual testing.');
        
    } catch (error) {
        console.error('❌ Error during production workflow test:', error.message);
        process.exit(1);
    }
}

// Run the test
testProductionUploadWorkflow();