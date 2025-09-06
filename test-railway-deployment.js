const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Update this URL once your Railway backend is deployed
const BASE_URL = 'https://your-backend-service.railway.app'; // Replace with your actual Railway URL

class RailwayTester {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
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
        url: `${this.baseUrl}${endpoint}`,
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
    await this.log('=== RAILWAY CONNECTIVITY TEST ===');
    
    // Test basic connectivity
    const health = await this.testEndpoint('GET', '/_health');
    await this.log(`Health check: ${health.success ? '✅' : '❌'} (${health.status})`);
    
    if (!health.success) {
      await this.log('❌ Health check failed. Deployment may not be ready.');
      await this.log(`Error: ${JSON.stringify(health.error)}`);
    }
    
    return health.success;
  }

  async testUserRegistrationAndAuth() {
    await this.log('\\n=== RAILWAY AUTHENTICATION TEST ===');
    
    const testUser = {
      username: `railwayuser${Date.now()}`,
      email: `railway${Date.now()}@example.com`,
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

  async testPhotosEndpoint() {
    await this.log('\\n=== RAILWAY PHOTOS ENDPOINT TEST ===');
    
    const authHeaders = this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {};
    
    // Test GET with auth
    const getWithAuth = await this.testEndpoint('GET', '/api/photos', null, authHeaders);
    await this.log(`GET /api/photos (with auth): ${getWithAuth.success ? '✅' : '❌'} (${getWithAuth.status})`);
    
    if (getWithAuth.success) {
      await this.log(`Photos response: ${JSON.stringify(getWithAuth.data, null, 2)}`);
      return true;
    } else {
      await this.log(`Photos endpoint error: ${JSON.stringify(getWithAuth.error)}`);
      return false;
    }
  }

  async createTestImage() {
    const testImagePath = path.join(__dirname, 'test-railway-image.txt');
    const testContent = `Railway test image - ${Date.now()}\\nTesting file upload on Railway platform.`;
    
    fs.writeFileSync(testImagePath, testContent);
    await this.log(`Created test image: ${testImagePath}`);
    
    return testImagePath;
  }

  async testPhotoUpload() {
    await this.log('\\n=== RAILWAY PHOTO UPLOAD TEST ===');
    
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

      const response = await axios.post(`${this.baseUrl}/api/photos`, formData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          ...formData.getHeaders()
        }
      });

      await this.log(`✅ Photo upload successful: ${response.status}`);
      await this.log(`Upload response: ${JSON.stringify(response.data, null, 2)}`);
      
      // Clean up test file
      fs.unlinkSync(testImagePath);
      
      return { success: true, photoId: response.data.data?.id };
    } catch (error) {
      await this.log(`❌ Photo upload failed: ${error.response?.status}`);
      await this.log(`Upload error: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);
      
      // Clean up test file
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
      
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async testDatabasePersistence() {
    await this.log('\\n=== RAILWAY DATABASE PERSISTENCE TEST ===');
    
    if (!this.authToken) {
      await this.log('❌ No auth token for database test');
      return false;
    }

    // Get photos to verify database is working
    const photos = await this.testEndpoint('GET', '/api/photos', null, {
      'Authorization': `Bearer ${this.authToken}`
    });

    if (photos.success) {
      const photoCount = photos.data.data?.length || 0;
      await this.log(`✅ Database query successful - found ${photoCount} photos`);
      return true;
    } else {
      await this.log(`❌ Database query failed: ${JSON.stringify(photos.error)}`);
      return false;
    }
  }

  async runFullRailwayTest() {
    await this.log('🚂 RAILWAY DEPLOYMENT TEST STARTING\\n');
    await this.log(`Testing URL: ${this.baseUrl}\\n`);
    
    const connectivity = await this.testHealthAndConnectivity();
    if (!connectivity) {
      await this.log('❌ Railway deployment not accessible - check deployment status');
      return;
    }

    const auth = await this.testUserRegistrationAndAuth();
    if (!auth) {
      await this.log('❌ Authentication failed - check backend deployment');
      return;
    }

    const photosEndpoint = await this.testPhotosEndpoint();
    const upload = await this.testPhotoUpload();
    const persistence = await this.testDatabasePersistence();

    await this.log('\\n🏁 RAILWAY TEST COMPLETE\\n');
    
    if (connectivity && auth && photosEndpoint && upload.success && persistence) {
      await this.log('🎉 ALL TESTS PASSED! Railway deployment is working correctly.');
      await this.log('✅ Health check: Working');
      await this.log('✅ User registration: Working');
      await this.log('✅ Photo upload: Working');
      await this.log('✅ Database persistence: Working');
      return true;
    } else {
      await this.log('❌ Some tests failed. Check the logs above for details.');
      return false;
    }
  }
}

// Usage instructions
if (require.main === module) {
  const baseUrl = process.argv[2] || BASE_URL;
  
  if (baseUrl === BASE_URL) {
    console.log('❗ Please update the BASE_URL in this file or pass it as an argument:');
    console.log('node test-railway-deployment.js https://your-backend-service.railway.app');
    console.log('\\nCurrent URL being tested:', baseUrl);
    console.log('\\nContinuing with test...\\n');
  }
  
  const tester = new RailwayTester(baseUrl);
  tester.runFullRailwayTest().catch(console.error);
}

module.exports = RailwayTester;