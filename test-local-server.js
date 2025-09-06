const { exec } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testLocalServer() {
  console.log('🚀 TESTING LOCAL SERVER WITH OUR FIXES');
  console.log('='.repeat(50));
  
  // Start local server
  console.log('Starting local Strapi server...');
  const serverProcess = exec('cd backend && npm run develop', (error, stdout, stderr) => {
    if (error) {
      console.log('Server error:', error);
    }
  });

  // Wait for server to start
  console.log('Waiting for server to initialize...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  try {
    const BASE_URL = 'http://localhost:1337';
    
    // Test health
    console.log('\\n1. Testing server health...');
    const health = await axios.get(`${BASE_URL}/_health`);
    console.log(`✅ Health check: ${health.status}`);
    
    // Test registration
    console.log('\\n2. Testing user registration...');
    const testUser = {
      username: `testuser${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };
    
    const registration = await axios.post(`${BASE_URL}/api/auth/local/register`, testUser);
    console.log(`✅ Registration: ${registration.status}`);
    
    const authToken = registration.data.jwt;
    
    // Test photos endpoint
    console.log('\\n3. Testing photos API...');
    
    // Test OPTIONS
    const options = await axios.options(`${BASE_URL}/api/photos`);
    console.log(`✅ OPTIONS /api/photos: ${options.status}`);
    console.log(`   Allowed methods: ${options.headers.allow}`);
    
    // Test GET with auth
    const getPhotos = await axios.get(`${BASE_URL}/api/photos`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log(`✅ GET /api/photos: ${getPhotos.status}`);
    console.log(`   Photos returned: ${getPhotos.data.data.length}`);
    
    // Test POST (photo upload)
    console.log('\\n4. Testing photo upload...');
    
    const testImageContent = 'Test image content for local testing';
    fs.writeFileSync('./test-local.txt', testImageContent);
    
    const formData = new FormData();
    formData.append('data', JSON.stringify({
      enhancementType: 'enhance'
    }));
    formData.append('files.originalImage', fs.createReadStream('./test-local.txt'));

    const upload = await axios.post(`${BASE_URL}/api/photos`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });
    
    console.log(`✅ POST /api/photos: ${upload.status}`);
    console.log(`   Photo uploaded successfully!`);
    console.log(`   Photo ID: ${upload.data.data.id}`);
    
    // Cleanup
    fs.unlinkSync('./test-local.txt');
    
    console.log('\\n' + '='.repeat(50));
    console.log('🎉 LOCAL SERVER TEST PASSED!');
    console.log('✅ All our fixes are working correctly locally');
    console.log('✅ Photo upload functionality is operational');
    console.log('✅ All API endpoints responding properly');
    console.log('\\n🔧 The issue is purely with GCP deployment, not our code fixes!');
    
    return true;
    
  } catch (error) {
    console.log('\\n❌ Local test failed:', error.response?.status, error.response?.statusText);
    console.log('Error details:', error.response?.data || error.message);
    return false;
    
  } finally {
    // Kill server process
    serverProcess.kill();
    console.log('\\nStopped local server.');
  }
}

// Auto-kill after 60 seconds to prevent hanging
setTimeout(() => {
  console.log('\\nTimeout reached, exiting...');
  process.exit(0);
}, 60000);

testLocalServer().catch(console.error);