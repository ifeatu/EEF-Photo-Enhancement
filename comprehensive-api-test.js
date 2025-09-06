const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://photo-enhancement-backend-925756614203.us-central1.run.app';

class APITester {
  constructor() {
    this.authToken = null;
    this.testUserId = null;
  }

  async log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async testEndpoint(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers,
        ...data && { data }
      };
      
      const response = await axios(config);
      return { success: true, status: response.status, data: response.data, headers: response.headers };
    } catch (error) {
      return { 
        success: false, 
        status: error.response?.status, 
        error: error.response?.data || error.message,
        headers: error.response?.headers
      };
    }
  }

  async testHealthAndConnectivity() {
    await this.log('=== CONNECTIVITY TEST ===');
    
    // Test basic connectivity
    const health = await this.testEndpoint('GET', '/_health');
    await this.log(`Health check: ${health.success ? '✅' : '❌'} (${health.status})`);
    
    // Test API root
    const apiRoot = await this.testEndpoint('GET', '/api');
    await this.log(`API root: ${apiRoot.success ? '✅' : '❌'} (${apiRoot.status})`);
    
    return health.success;
  }

  async testUserRegistrationAndAuth() {
    await this.log('\\n=== AUTHENTICATION TEST ===');
    
    const testUser = {
      username: `testuser${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    // Register user
    const registration = await this.testEndpoint('POST', '/api/auth/local/register', testUser);
    await this.log(`Registration: ${registration.success ? '✅' : '❌'} (${registration.status})`);
    
    if (!registration.success) {
      await this.log(`Registration error: ${JSON.stringify(registration.error)}`);
      return false;
    }

    this.authToken = registration.data.jwt;
    this.testUserId = registration.data.user.id;
    await this.log(`Auth token obtained: ${this.authToken ? '✅' : '❌'}`);
    
    return true;
  }

  async analyzePhotosEndpoint() {
    await this.log('\\n=== PHOTOS ENDPOINT ANALYSIS ===');
    
    const authHeaders = this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {};
    
    // Test OPTIONS to see allowed methods
    const options = await this.testEndpoint('OPTIONS', '/api/photos');
    await this.log(`OPTIONS /api/photos: ${options.success ? '✅' : '❌'} (${options.status})`);
    if (options.headers?.allow) {
      await this.log(`Allowed methods: ${options.headers.allow}`);
    }

    // Test GET without auth
    const getNoAuth = await this.testEndpoint('GET', '/api/photos');
    await this.log(`GET /api/photos (no auth): ${getNoAuth.success ? '✅' : '❌'} (${getNoAuth.status})`);
    
    // Test GET with auth
    const getWithAuth = await this.testEndpoint('GET', '/api/photos', null, authHeaders);
    await this.log(`GET /api/photos (with auth): ${getWithAuth.success ? '✅' : '❌'} (${getWithAuth.status})`);
    
    // Test POST without data to see if method is allowed
    const postEmpty = await this.testEndpoint('POST', '/api/photos', {}, authHeaders);
    await this.log(`POST /api/photos (empty): ${postEmpty.success ? '✅' : '❌'} (${postEmpty.status})`);
    
    if (postEmpty.status === 405) {
      await this.log('🚨 POST method not allowed - route configuration issue!');
    }
    
    return postEmpty.status !== 405;
  }

  async createTestImage() {
    const testImagePath = path.join(__dirname, 'test-image.txt');
    const testContent = `Test image data - ${Date.now()}\\nThis is a test file for photo upload functionality.`;
    
    fs.writeFileSync(testImagePath, testContent);
    await this.log(`Created test image: ${testImagePath}`);
    
    return testImagePath;
  }

  async testPhotoUpload() {
    await this.log('\\n=== PHOTO UPLOAD TEST ===');
    
    if (!this.authToken) {
      await this.log('❌ No auth token available for upload test');
      return false;
    }

    const testImagePath = await this.createTestImage();
    
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({
        enhancementType: 'enhance'
      }));
      formData.append('files.originalImage', fs.createReadStream(testImagePath));

      const response = await axios.post(`${BASE_URL}/api/photos`, formData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          ...formData.getHeaders()
        }
      });

      await this.log(`✅ Photo upload successful: ${response.status}`);
      await this.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      
      // Clean up test file
      fs.unlinkSync(testImagePath);
      
      return { success: true, photoId: response.data.data?.id };
    } catch (error) {
      await this.log(`❌ Photo upload failed: ${error.response?.status}`);
      await this.log(`Error: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);
      
      // Clean up test file
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
      
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async testPhotoEnhancement(photoId) {
    if (!photoId) {
      await this.log('❌ No photo ID available for enhancement test');
      return false;
    }

    await this.log('\\n=== PHOTO ENHANCEMENT TEST ===');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/photos/${photoId}/enhance`, {}, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      await this.log(`✅ Photo enhancement started: ${response.status}`);
      await this.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      
      return true;
    } catch (error) {
      await this.log(`❌ Photo enhancement failed: ${error.response?.status}`);
      await this.log(`Error: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);
      
      return false;
    }
  }

  async runFullTest() {
    await this.log('🚀 COMPREHENSIVE API TEST STARTING\\n');
    
    const connectivity = await this.testHealthAndConnectivity();
    if (!connectivity) {
      await this.log('❌ Basic connectivity failed - cannot proceed');
      return;
    }

    const auth = await this.testUserRegistrationAndAuth();
    if (!auth) {
      await this.log('❌ Authentication failed - cannot test protected endpoints');
      return;
    }

    const photosEndpoint = await this.analyzePhotosEndpoint();
    if (!photosEndpoint) {
      await this.log('❌ Photos endpoint POST method not available - deployment issue');
    }

    const upload = await this.testPhotoUpload();
    if (upload.success) {
      await this.testPhotoEnhancement(upload.photoId);
    }

    await this.log('\\n🏁 TEST COMPLETE');
  }
}

// Run the test
const tester = new APITester();
tester.runFullTest().catch(console.error);