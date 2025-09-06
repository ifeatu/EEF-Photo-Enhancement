const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://photo-enhancement-backend-925756614203.us-central1.run.app';

async function registerTestUser() {
  try {
    console.log('Registering new test user...');
    
    const timestamp = Date.now();
    const userData = {
      username: `testuser_${timestamp}`,
      email: `testuser_${timestamp}@example.com`,
      password: 'TestPassword123!'
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/local/register`, userData);
    
    if (response.status === 200 && response.data.jwt) {
      console.log('✅ User registration successful!');
      return { success: true, jwt: response.data.jwt, user: response.data.user, credentials: userData };
    } else {
      console.log('❌ User registration failed');
      return { success: false };
    }
  } catch (error) {
    console.log('❌ User registration failed:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function authenticateUser() {
  try {
    console.log('Authenticating test user...');
    
    const loginData = {
      identifier: 'testuser_photo@example.com',
      password: 'TestPassword123!'
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/local`, loginData);
    
    if (response.status === 200 && response.data.jwt) {
      console.log('✅ Authentication successful!');
      return { success: true, jwt: response.data.jwt, user: response.data.user };
    } else {
      console.log('❌ Authentication failed');
      return { success: false };
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function testPhotoUpload(jwt) {
  try {
    console.log('\nTesting photo upload...');
    
    // Check if test image exists
    const testImagePath = path.join(__dirname, 'photos', 'photo-1-before.jpg');
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found at:', testImagePath);
      return { success: false, error: 'Test image not found' };
    }
    
    const formData = new FormData();
    // Use the correct field name that the backend expects
    formData.append('files.originalImage', fs.createReadStream(testImagePath));
    // Add the data payload as expected by the backend
    formData.append('data', JSON.stringify({
      enhancementType: 'enhance'
    }));
    
    const response = await axios.post(`${BASE_URL}/api/photos`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${jwt}`
      }
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      console.log('✅ Photo upload successful!');
      console.log('Photo ID:', response.data.data.id);
      console.log('Status:', response.data.data.attributes.status);
      console.log('Enhancement Type:', response.data.data.attributes.enhancementType);
      return { success: true, photoId: response.data.data.id, photoData: response.data.data };
    } else {
      console.log('❌ Photo upload failed - unexpected response');
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    console.log('❌ Photo upload failed:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function testPhotoEnhancement(jwt, photoId) {
  try {
    console.log('\nTesting photo enhancement...');
    
    const response = await axios.post(`${BASE_URL}/api/photos/${photoId}/enhance`, {}, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.data) {
      console.log('✅ Photo enhancement request successful!');
      console.log('Photo record ID:', response.data.data.id);
      console.log('Status:', response.data.data.attributes.status);
      return { success: true, photoId: response.data.data.id, status: response.data.data.attributes.status };
    } else {
      console.log('❌ Photo enhancement failed - unexpected response');
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    console.log('❌ Photo enhancement failed:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function checkUserFreePhotos(jwt) {
  try {
    console.log('\nChecking user free photo count...');
    
    const response = await axios.get(`${BASE_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });
    
    if (response.status === 200 && response.data) {
      console.log('✅ User data retrieved!');
      console.log('Free photos used:', response.data.freePhotosUsed || 0);
      console.log('Max free photos:', 3); // Based on our implementation
      return { success: true, freePhotosUsed: response.data.freePhotosUsed || 0 };
    } else {
      console.log('❌ Failed to get user data');
      return { success: false };
    }
  } catch (error) {
    console.log('❌ Failed to get user data:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function runPhotoTests() {
  console.log('=== GCP Photo Upload & Enhancement Test ===\n');
  
  // Register a new test user
  const authResult = await registerTestUser();
  if (!authResult.success) {
    console.log('\n❌ Cannot proceed without user registration');
    return;
  }
  
  // Check initial free photo count
  await checkUserFreePhotos(authResult.jwt);
  
  // Test photo upload
  const uploadResult = await testPhotoUpload(authResult.jwt);
  if (!uploadResult.success) {
    console.log('\n❌ Cannot proceed without successful upload');
    return;
  }
  
  // Test photo enhancement
  const enhancementResult = await testPhotoEnhancement(authResult.jwt, uploadResult.photoId);
  
  // Check updated free photo count
  await checkUserFreePhotos(authResult.jwt);
  
  if (uploadResult.success && enhancementResult.success) {
    console.log('\n✅ All photo functionality is working on GCP!');
  } else {
    console.log('\n❌ Some photo functionality issues detected');
  }
  
  console.log('\n=== Photo Test Complete ===');
}

runPhotoTests().catch(console.error);