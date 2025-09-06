const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'https://photo-enhancement-backend-925756614203.us-central1.run.app';

async function runFinalVerificationTest() {
  console.log('🚀 FINAL VERIFICATION TEST - POST-DEPLOYMENT');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Health Check
    console.log('\\n1. Health Check...');
    const health = await axios.get(`${BASE_URL}/_health`);
    console.log(`✅ Health: ${health.status}`);

    // Step 2: Register User
    console.log('\\n2. User Registration...');
    const testUser = {
      username: `testuser${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };
    
    const registration = await axios.post(`${BASE_URL}/api/auth/local/register`, testUser);
    console.log(`✅ Registration: ${registration.status}`);
    console.log(`   User ID: ${registration.data.user.id}`);
    console.log(`   JWT Token: ${registration.data.jwt ? 'Obtained' : 'Missing'}`);
    
    const authToken = registration.data.jwt;
    const userId = registration.data.user.id;

    // Step 3: Test Photo API Endpoints
    console.log('\\n3. Photo API Endpoint Testing...');
    
    // Test OPTIONS to see allowed methods
    const options = await axios.options(`${BASE_URL}/api/photos`);
    console.log(`✅ OPTIONS /api/photos: ${options.status}`);
    console.log(`   Allowed methods: ${options.headers.allow}`);
    
    // Test GET with authentication
    const getPhotos = await axios.get(`${BASE_URL}/api/photos`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log(`✅ GET /api/photos: ${getPhotos.status}`);
    console.log(`   Photos returned: ${getPhotos.data.data.length}`);

    // Step 4: Test Photo Upload
    console.log('\\n4. Photo Upload Test...');
    
    // Create test image
    const testImageContent = 'Test image data for photo enhancement';
    const testImagePath = './test-upload.txt';
    fs.writeFileSync(testImagePath, testImageContent);
    
    const formData = new FormData();
    formData.append('data', JSON.stringify({
      enhancementType: 'enhance'
    }));
    formData.append('files.originalImage', fs.createReadStream(testImagePath));

    const upload = await axios.post(`${BASE_URL}/api/photos`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });
    
    console.log(`✅ POST /api/photos: ${upload.status}`);
    console.log(`   Photo uploaded successfully!`);
    console.log(`   Photo ID: ${upload.data.data.id}`);
    console.log(`   Status: ${upload.data.data.status}`);
    console.log(`   Enhancement Type: ${upload.data.data.enhancementType}`);
    
    const photoId = upload.data.data.id;

    // Step 5: Test Photo Enhancement
    console.log('\\n5. Photo Enhancement Test...');
    
    const enhance = await axios.post(`${BASE_URL}/api/photos/${photoId}/enhance`, {}, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log(`✅ POST /api/photos/${photoId}/enhance: ${enhance.status}`);
    console.log(`   Enhancement started!`);
    console.log(`   Updated status: ${enhance.data.data.status}`);
    
    // Step 6: Verify Updated Photo List
    console.log('\\n6. Verify Photo in List...');
    
    const updatedPhotos = await axios.get(`${BASE_URL}/api/photos`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log(`✅ GET /api/photos (updated): ${updatedPhotos.status}`);
    console.log(`   Total photos: ${updatedPhotos.data.data.length}`);
    console.log(`   First photo status: ${updatedPhotos.data.data[0]?.status}`);

    // Cleanup
    fs.unlinkSync(testImagePath);
    
    console.log('\\n' + '='.repeat(50));
    console.log('🎉 ALL TESTS PASSED! API IS FULLY FUNCTIONAL!');
    console.log('✅ Photo upload works');
    console.log('✅ Photo enhancement works'); 
    console.log('✅ Authentication works');
    console.log('✅ All endpoints responding correctly');
    
    return true;
    
  } catch (error) {
    console.log('\\n❌ Test failed:', error.response?.status, error.response?.statusText);
    console.log('Error details:', error.response?.data || error.message);
    
    // Cleanup test file if it exists
    try { fs.unlinkSync('./test-upload.txt'); } catch {}
    
    return false;
  }
}

// Run the test
runFinalVerificationTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });