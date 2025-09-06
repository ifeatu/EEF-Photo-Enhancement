const axios = require('axios');

const BASE_URL = 'https://photo-enhancement-backend-925756614203.us-central1.run.app';

async function testWorkingAPI() {
  console.log('=== Testing Known Working API ===\n');

  try {
    // Test credit-packages API (should work)
    console.log('Testing GET /api/credit-packages...');
    const creditResponse = await axios.get(`${BASE_URL}/api/credit-packages`);
    console.log('✅ Credit packages API working:', creditResponse.status);
    console.log('Data received:', creditResponse.data.data?.length, 'packages');
  } catch (error) {
    console.log('❌ Credit packages API failed:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }

  try {
    // Test if /api/photos endpoint exists at all
    console.log('\nTesting OPTIONS /api/photos (to check if endpoint exists)...');
    const optionsResponse = await axios.options(`${BASE_URL}/api/photos`);
    console.log('✅ Photos endpoint exists:', optionsResponse.status);
    console.log('Allowed methods:', optionsResponse.headers.allow);
  } catch (error) {
    console.log('❌ Photos endpoint OPTIONS failed:', error.response?.status);
    if (error.response?.status === 404) {
      console.log('🔍 404 - Endpoint does not exist at all');
    } else if (error.response?.status === 405) {
      console.log('🔍 405 - Endpoint exists but OPTIONS not allowed');
    }
  }

  try {
    // Test Strapi admin API to see if it's running
    console.log('\nTesting Strapi admin API...');
    const adminResponse = await axios.get(`${BASE_URL}/admin`);
    console.log('✅ Admin API accessible:', adminResponse.status);
  } catch (error) {
    console.log('❌ Admin API status:', error.response?.status);
    if (error.response?.status === 404) {
      console.log('🔍 Admin API not found - might be disabled in production');
    }
  }

  try {
    // Test if we can get API documentation
    console.log('\nTesting API documentation endpoint...');
    const docsResponse = await axios.get(`${BASE_URL}/documentation`);
    console.log('✅ Documentation accessible:', docsResponse.status);
  } catch (error) {
    console.log('❌ Documentation status:', error.response?.status);
  }

  console.log('\n=== Test Complete ===');
}

testWorkingAPI().catch(console.error);