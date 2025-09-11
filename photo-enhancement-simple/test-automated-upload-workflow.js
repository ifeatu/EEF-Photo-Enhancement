const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Production configuration
const PRODUCTION_URL = 'https://photoenhance.dev';
const TEST_PHOTO_PATH = '../photos/photo-1-before.jpg';

// Service account credentials from SERVICE_ACCOUNT_SETUP.md
const SERVICE_CREDENTIALS = {
  // Bearer token authentication
  token: '675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471',
  
  // Basic authentication
  username: 'ifeatu',
  password: 'admin123!', // This would need to be the actual password used to generate the hash
  
  // API key authentication
  apiKey: 'monitoring-key-value' // This would need to be the actual API key
};

/**
 * Automated Upload Workflow Test with Service Account Authentication
 * Tests the complete upload process using service account credentials
 */
class AutomatedUploadTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Make authenticated HTTP request
   */
  async makeAuthenticatedRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, PRODUCTION_URL);
      const requestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AutomatedUploadTester/1.0',
          'Authorization': `Bearer ${SERVICE_CREDENTIALS.token}`,
          ...options.headers
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: jsonData,
              rawData: data
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: {},
              rawData: data
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.setTimeout(30000);

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Test service account authentication
   */
  async testAuthentication() {
    console.log('🔐 Testing Service Account Authentication...');
    
    try {
      const response = await this.makeAuthenticatedRequest('/api/debug');
      
      if (response.status === 200) {
        console.log('  ✅ Service account authentication successful');
        console.log(`  📊 Account: ${response.data.account?.name || 'Unknown'}`);
        console.log(`  🔑 Permissions: ${response.data.account?.permissions?.join(', ') || 'None'}`);
        this.results.passed++;
        return true;
      } else {
        console.log(`  ❌ Authentication failed: ${response.status}`);
        console.log(`  📝 Response: ${response.rawData}`);
        this.results.failed++;
        this.results.errors.push(`Authentication failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`  ❌ Authentication error: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Authentication error: ${error.message}`);
      return false;
    }
  }

  /**
   * Test photo upload with service account
   */
  async testPhotoUpload() {
    console.log('\n📤 Testing Automated Photo Upload...');
    
    // Check if test photo exists
    const photoPath = path.resolve(__dirname, TEST_PHOTO_PATH);
    if (!fs.existsSync(photoPath)) {
      console.log(`  ❌ Test photo not found: ${photoPath}`);
      this.results.failed++;
      this.results.errors.push('Test photo not found');
      return false;
    }

    console.log(`  📁 Test photo found: ${photoPath}`);
    const stats = fs.statSync(photoPath);
    console.log(`  📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);

    try {
      // Create form data for upload
      const form = new FormData();
      form.append('photo', fs.createReadStream(photoPath));
      form.append('enhance', 'true');

      // Make upload request
      const response = await this.makeUploadRequest('/api/upload', form);
      
      if (response.status === 200 || response.status === 201) {
        console.log('  ✅ Photo upload successful');
        console.log(`  📊 Response: ${JSON.stringify(response.data, null, 2)}`);
        this.results.passed++;
        return response.data;
      } else {
        console.log(`  ❌ Upload failed: ${response.status}`);
        console.log(`  📝 Response: ${response.rawData}`);
        this.results.failed++;
        this.results.errors.push(`Upload failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`  ❌ Upload error: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Upload error: ${error.message}`);
      return false;
    }
  }

  /**
   * Make upload request with form data
   */
  async makeUploadRequest(path, formData) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, PRODUCTION_URL);
      
      const requestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_CREDENTIALS.token}`,
          ...formData.getHeaders()
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: jsonData,
              rawData: data
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: {},
              rawData: data
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Upload timeout')));
      req.setTimeout(60000); // Longer timeout for uploads

      formData.pipe(req);
    });
  }

  /**
   * Test photo status checking
   */
  async testPhotoStatus(photoId) {
    if (!photoId) return false;

    console.log('\n🔍 Testing Photo Status Check...');
    
    try {
      const response = await this.makeAuthenticatedRequest(`/api/photos/${photoId}`);
      
      if (response.status === 200) {
        console.log('  ✅ Photo status check successful');
        console.log(`  📊 Status: ${response.data.status || 'Unknown'}`);
        console.log(`  🖼️  Enhanced: ${response.data.enhanced ? 'Yes' : 'No'}`);
        this.results.passed++;
        return response.data;
      } else {
        console.log(`  ❌ Status check failed: ${response.status}`);
        this.results.failed++;
        this.results.errors.push(`Status check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`  ❌ Status check error: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Status check error: ${error.message}`);
      return false;
    }
  }

  /**
   * Run complete automated test suite
   */
  async runCompleteTest() {
    console.log('🚀 Automated Upload Workflow Test with Service Account');
    console.log('=' .repeat(60));
    console.log(`📍 Testing: ${PRODUCTION_URL}`);
    console.log(`📸 Photo: ${TEST_PHOTO_PATH}`);
    console.log(`🔑 Auth: Service Account Token`);
    
    // Test authentication first
    const authSuccess = await this.testAuthentication();
    if (!authSuccess) {
      console.log('\n❌ Authentication failed - cannot proceed with upload tests');
      this.printSummary();
      return;
    }

    // Test photo upload
    const uploadResult = await this.testPhotoUpload();
    if (uploadResult && uploadResult.photoId) {
      // Test photo status
      await this.testPhotoStatus(uploadResult.photoId);
    }

    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 AUTOMATED TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('\n💡 WHY USE SERVICE ACCOUNT TESTING:');
    console.log('✅ Automated end-to-end testing');
    console.log('✅ No manual authentication required');
    console.log('✅ Can test upload, enhancement, and status workflows');
    console.log('✅ Suitable for CI/CD pipelines');
    console.log('✅ Tests actual production authentication');
    
    console.log('\n⚠️  LIMITATIONS OF MANUAL TESTING:');
    console.log('❌ Requires human interaction');
    console.log('❌ Cannot be automated in CI/CD');
    console.log('❌ Slower feedback loop');
    console.log('❌ Prone to human error');
    console.log('❌ Cannot test at scale');
  }
}

// Run the automated test
if (require.main === module) {
  const tester = new AutomatedUploadTester();
  tester.runCompleteTest().catch(console.error);
}

module.exports = AutomatedUploadTester;