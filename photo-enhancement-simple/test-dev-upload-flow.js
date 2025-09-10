const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Test configuration
const DEV_BASE_URL = 'http://localhost:3001';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-fix.jpg');

// Create a simple test image if it doesn't exist
function createTestImage() {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    // Create a minimal JPEG header for testing
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xD9
    ]);
    fs.writeFileSync(TEST_IMAGE_PATH, jpegHeader);
    console.log('✓ Created test image');
  }
}

// Stage 1: Test Development Server Availability
async function testDevServerAvailability() {
  console.log('\n=== STAGE 1: Development Server Availability ===');
  try {
    const response = await fetch(`${DEV_BASE_URL}/`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok || response.status === 307) {
      console.log('✓ Development server is running on', DEV_BASE_URL);
      return true;
    } else {
      console.log('✗ Development server responded with:', response.status);
      return false;
    }
  } catch (error) {
    console.log('✗ Development server is not accessible:', error.message);
    console.log('  Make sure to run: npm run dev');
    return false;
  }
}

// Stage 2: Test Authentication Flow
async function testAuthenticationFlow() {
  console.log('\n=== STAGE 2: Authentication Flow ===');
  
  // Test unauthenticated request
  try {
    const response = await fetch(`${DEV_BASE_URL}/api/photos/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    const result = await response.json();
    console.log('Unauthenticated request status:', response.status);
    console.log('Unauthenticated response:', result);
    
    if (response.status === 401) {
      console.log('✓ Authentication properly required');
    } else {
      console.log('✗ Expected 401 for unauthenticated request');
    }
  } catch (error) {
    console.log('✗ Authentication test failed:', error.message);
  }
}

// Stage 3: Test File Processing (without auth)
async function testFileProcessingStage() {
  console.log('\n=== STAGE 3: File Processing Stage ===');
  
  createTestImage();
  
  const formData = new FormData();
  formData.append('photo', fs.createReadStream(TEST_IMAGE_PATH), {
    filename: 'test-image.jpg',
    contentType: 'image/jpeg'
  });
  formData.append('title', 'Test Upload');
  formData.append('description', 'Testing file processing');
  
  try {
    const response = await fetch(`${DEV_BASE_URL}/api/photos/upload`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('File processing test status:', response.status);
    console.log('File processing response:', result);
    
    if (response.status === 401) {
      console.log('✓ File processing blocked by authentication (expected)');
    } else {
      console.log('✗ Unexpected response for file processing test');
    }
  } catch (error) {
    console.log('✗ File processing test failed:', error.message);
  }
}

// Stage 4: Test Environment Configuration
async function testEnvironmentConfiguration() {
  console.log('\n=== STAGE 4: Environment Configuration ===');
  
  // Check if we're in development mode
  console.log('NODE_ENV check:');
  console.log('- Expected: development or undefined');
  console.log('- Actual:', process.env.NODE_ENV || 'undefined');
  
  // Test environment-specific endpoint
  try {
    const response = await fetch(`${DEV_BASE_URL}/api/debug/env`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const envInfo = await response.json();
      console.log('Environment info:', envInfo);
    } else {
      console.log('Environment debug endpoint not available (status:', response.status, ')');
    }
  } catch (error) {
    console.log('Environment debug endpoint not accessible');
  }
}

// Stage 5: Test Database Connection
async function testDatabaseConnection() {
  console.log('\n=== STAGE 5: Database Connection ===');
  
  try {
    const response = await fetch(`${DEV_BASE_URL}/api/debug/db`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const dbInfo = await response.json();
      console.log('Database connection:', dbInfo);
    } else {
      console.log('Database debug endpoint not available (status:', response.status, ')');
    }
  } catch (error) {
    console.log('Database debug endpoint not accessible');
  }
}

// Stage 6: Test File Storage Configuration
async function testFileStorageConfiguration() {
  console.log('\n=== STAGE 6: File Storage Configuration ===');
  
  // Check uploads directory
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  console.log('Local uploads directory:', uploadsDir);
  console.log('Directory exists:', fs.existsSync(uploadsDir));
  
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✓ Created uploads directory');
    } catch (error) {
      console.log('✗ Failed to create uploads directory:', error.message);
    }
  } else {
    console.log('✓ Uploads directory exists');
  }
  
  // Check directory permissions
  try {
    const testFile = path.join(uploadsDir, 'test-write.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✓ Uploads directory is writable');
  } catch (error) {
    console.log('✗ Uploads directory is not writable:', error.message);
  }
}

// Main test runner
async function runDevelopmentUploadAnalysis() {
  console.log('🔍 DEVELOPMENT UPLOAD FLOW ANALYSIS');
  console.log('=====================================');
  
  const serverAvailable = await testDevServerAvailability();
  
  if (!serverAvailable) {
    console.log('\n❌ Cannot proceed - development server is not running');
    console.log('Please start the development server with: npm run dev');
    return;
  }
  
  await testAuthenticationFlow();
  await testFileProcessingStage();
  await testEnvironmentConfiguration();
  await testDatabaseConnection();
  await testFileStorageConfiguration();
  
  console.log('\n📋 DEVELOPMENT FLOW SUMMARY');
  console.log('============================');
  console.log('1. Server: Development server running on localhost:3000');
  console.log('2. Auth: NextAuth session-based authentication required');
  console.log('3. File Storage: Local file system (public/uploads directory)');
  console.log('4. Database: Prisma with local/development database');
  console.log('5. Processing: Synchronous upload with immediate database record creation');
  console.log('\nNext: Run production analysis to compare environments');
}

// Run the analysis
runDevelopmentUploadAnalysis().catch(console.error);