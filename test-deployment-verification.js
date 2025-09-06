const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'https://photo-enhancement-backend-925756614203.us-central1.run.app';
const FRONTEND_URL = 'https://frontend-925756614203.us-central1.run.app';

// Test image path
const testImagePath = path.join(__dirname, 'photos', 'photo-1-before.jpg');

let authToken = null;
let userId = null;

async function testEndpoint(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BACKEND_URL}${url}`,
      headers,
      timeout: 30000
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 'Network Error',
      error: error.response?.data || error.message
    };
  }
}

async function testUserRegistration() {
  console.log('\n=== Testing User Registration ===');
  
  const userData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'testpassword123'
  };
  
  const result = await testEndpoint('POST', '/api/auth/local/register', userData);
  
  if (result.success) {
    console.log('✅ User registration successful!');
    authToken = result.data.jwt;
    userId = result.data.user.id;
    console.log(`User ID: ${userId}`);
    return true;
  } else {
    console.log('❌ User registration failed:', result.status);
    console.log('Error:', result.error);
    return false;
  }
}

async function testPhotoEndpoints() {
  console.log('\n=== Testing Photo API Endpoints ===');
  
  // Test OPTIONS request to check available methods
  console.log('\nTesting OPTIONS /api/photos...');
  const optionsResult = await testEndpoint('OPTIONS', '/api/photos');
  console.log(`Status: ${optionsResult.status}`);
  
  // Test GET request
  console.log('\nTesting GET /api/photos...');
  const getResult = await testEndpoint('GET', '/api/photos', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (getResult.success) {
    console.log('✅ GET /api/photos successful');
    console.log('Photos count:', getResult.data.data?.length || 0);
  } else {
    console.log('❌ GET /api/photos failed:', getResult.status);
  }
  
  // Test POST request (photo upload)
  console.log('\nTesting POST /api/photos (photo upload)...');
  
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ Test image not found:', testImagePath);
    return false;
  }
  
  const formData = new FormData();
  formData.append('data', JSON.stringify({
    status: 'pending',
    enhancementType: 'general',
    user: userId
  }));
  formData.append('files.originalImage', fs.createReadStream(testImagePath));
  
  const postResult = await testEndpoint('POST', '/api/photos', formData, {
    'Authorization': `Bearer ${authToken}`,
    ...formData.getHeaders()
  });
  
  if (postResult.success) {
    console.log('✅ POST /api/photos successful!');
    console.log('Photo ID:', postResult.data.data?.id);
    return postResult.data.data;
  } else {
    console.log('❌ POST /api/photos failed:', postResult.status);
    console.log('Error:', postResult.error);
    return false;
  }
}

async function testPhotoEnhancement(photoData) {
  if (!photoData) {
    console.log('\n❌ Skipping enhancement test - no photo data');
    return false;
  }
  
  console.log('\n=== Testing Photo Enhancement ===');
  
  const enhanceResult = await testEndpoint('POST', `/api/photos/${photoData.id}/enhance`, null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (enhanceResult.success) {
    console.log('✅ Photo enhancement initiated successfully!');
    console.log('Enhancement status:', enhanceResult.data.data?.attributes?.status);
    return true;
  } else {
    console.log('❌ Photo enhancement failed:', enhanceResult.status);
    console.log('Error:', enhanceResult.error);
    return false;
  }
}

async function testFreetierLimits() {
  console.log('\n=== Testing Free Tier Limits ===');
  
  const userResult = await testEndpoint('GET', '/api/users/me', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (userResult.success) {
    console.log('✅ User data retrieved!');
    console.log('Free photos used:', userResult.data.freePhotosUsed || 0);
    console.log('Max free photos:', userResult.data.maxFreePhotos || 3);
    return true;
  } else {
    console.log('❌ Failed to get user data:', userResult.status);
    return false;
  }
}

async function testFrontendAccessibility() {
  console.log('\n=== Testing Frontend Accessibility ===');
  
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 10000 });
    console.log('✅ Frontend accessible:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Frontend not accessible:', error.message);
    return false;
  }
}

async function runDeploymentVerification() {
  console.log('=== GCP Deployment Verification Test ===');
  console.log('Backend URL:', BACKEND_URL);
  console.log('Frontend URL:', FRONTEND_URL);
  
  const results = {
    userRegistration: false,
    photoEndpoints: false,
    photoUpload: false,
    photoEnhancement: false,
    freetierLimits: false,
    frontendAccess: false
  };
  
  // Test user registration
  results.userRegistration = await testUserRegistration();
  
  if (results.userRegistration) {
    // Test photo endpoints
    const photoData = await testPhotoEndpoints();
    results.photoEndpoints = !!photoData;
    results.photoUpload = !!photoData;
    
    // Test photo enhancement
    if (photoData) {
      results.photoEnhancement = await testPhotoEnhancement(photoData);
    }
    
    // Test free tier limits
    results.freetierLimits = await testFreeiterLimits();
  }
  
  // Test frontend accessibility
  results.frontendAccess = await testFrontendAccessibility();
  
  // Summary
  console.log('\n=== Deployment Verification Summary ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall Status: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  return results;
}

// Run the verification
runDeploymentVerification().catch(console.error);