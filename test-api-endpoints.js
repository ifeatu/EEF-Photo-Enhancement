const axios = require('axios');

const BASE_URL = 'https://photo-enhancement-backend-925756614203.us-central1.run.app';

async function testEndpoints() {
  console.log('=== Testing API Endpoints ===\n');
  
  // Test 1: Basic health check
  try {
    console.log('Testing basic connectivity...');
    const response = await axios.get(`${BASE_URL}/_health`, { timeout: 10000 });
    console.log('✅ Health check successful:', response.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.response?.status || error.message);
  }
  
  // Test 2: Register a user first
  let jwt = null;
  try {
    console.log('\nRegistering test user...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/local/register`, {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123'
    });
    
    if (registerResponse.data.jwt) {
      jwt = registerResponse.data.jwt;
      console.log('✅ User registration successful');
    }
  } catch (error) {
    console.log('❌ User registration failed:', error.response?.data || error.message);
    return;
  }
  
  // Test 3: GET /api/photos (should work)
  try {
    console.log('\nTesting GET /api/photos...');
    const response = await axios.get(`${BASE_URL}/api/photos`, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      },
      timeout: 10000
    });
    console.log('✅ GET /api/photos successful:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ GET /api/photos failed:', error.response?.status, error.response?.data || error.message);
  }
  
  // Test 4: POST /api/photos with minimal data (Strapi v5 format)
  try {
    console.log('\nTesting POST /api/photos with minimal data...');
    const response = await axios.post(`${BASE_URL}/api/photos`, {
      data: {
        status: 'pending'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('✅ POST /api/photos successful:', response.status);
  } catch (error) {
    console.log('❌ POST /api/photos status:', error.response?.status);
    console.log('Error details:', error.response?.statusText);
    if (error.response?.status === 405) {
      console.log('🔍 405 Method Not Allowed - Route may not be registered properly');
    }
  }
  
  // Test 5: Check available routes
  try {
    console.log('\nTesting available routes...');
    const response = await axios.get(`${BASE_URL}/api`, {
      timeout: 10000
    });
    console.log('✅ API root accessible:', response.status);
  } catch (error) {
    console.log('❌ API root failed:', error.response?.status || error.message);
  }
}

testEndpoints().catch(console.error);