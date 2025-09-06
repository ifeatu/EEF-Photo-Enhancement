const axios = require('axios');

const BASE_URL = 'https://backend-925756614203.us-central1.run.app';

async function testRegistration() {
  try {
    console.log('Testing user registration on GCP deployment...');
    
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };
    
    console.log('Attempting to register user:', testUser.username);
    
    const response = await axios.post(`${BASE_URL}/api/auth/local/register`, testUser);
    
    if (response.status === 200 && response.data.jwt) {
      console.log('✅ Registration successful!');
      console.log('User ID:', response.data.user.id);
      console.log('JWT token received:', response.data.jwt ? 'Yes' : 'No');
      console.log('Free photos count:', response.data.user.freePhotosUsed || 0);
      return { success: true, user: response.data.user, jwt: response.data.jwt };
    } else {
      console.log('❌ Registration failed - unexpected response');
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function testLogin(username, password) {
  try {
    console.log('\nTesting user login...');
    
    const loginData = {
      identifier: username,
      password: password
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/local`, loginData);
    
    if (response.status === 200 && response.data.jwt) {
      console.log('✅ Login successful!');
      console.log('User ID:', response.data.user.id);
      console.log('JWT token received:', response.data.jwt ? 'Yes' : 'No');
      return { success: true, user: response.data.user, jwt: response.data.jwt };
    } else {
      console.log('❌ Login failed - unexpected response');
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function runTests() {
  console.log('=== GCP Deployment Core Features Test ===\n');
  
  // Test registration
  const registrationResult = await testRegistration();
  
  if (registrationResult.success) {
    // Test login with the same user
    const loginResult = await testLogin(registrationResult.user.username, 'TestPassword123!');
    
    if (loginResult.success) {
      console.log('\n✅ Both registration and login are working on GCP!');
    }
  }
  
  console.log('\n=== Test Complete ===');
}

runTests().catch(console.error);