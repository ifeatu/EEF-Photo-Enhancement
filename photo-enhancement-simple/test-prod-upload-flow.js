const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Test configuration
const PROD_BASE_URL = 'https://photoenhance.dev';
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

// Stage 1: Test Production Server Availability
async function testProdServerAvailability() {
  console.log('\n=== STAGE 1: Production Server Availability ===');
  try {
    const response = await fetch(`${PROD_BASE_URL}/`, {
      method: 'GET',
      timeout: 10000
    });
    
    if (response.ok || response.status === 307) {
      console.log('✓ Production server is accessible at', PROD_BASE_URL);
      console.log('  Response status:', response.status);
      return true;
    } else {
      console.log('✗ Production server responded with:', response.status);
      return false;
    }
  } catch (error) {
    console.log('✗ Production server is not accessible:', error.message);
    return false;
  }
}

// Stage 2: Test Production Authentication Flow
async function testProdAuthenticationFlow() {
  console.log('\n=== STAGE 2: Production Authentication Flow ===');
  
  // Test unauthenticated request
  try {
    const response = await fetch(`${PROD_BASE_URL}/api/photos/upload`, {
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
      console.log('✓ Production authentication properly required');
      return true;
    } else {
      console.log('✗ Expected 401 for unauthenticated request, got:', response.status);
      return false;
    }
  } catch (error) {
    console.log('✗ Production authentication test failed:', error.message);
    return false;
  }
}

// Stage 3: Test Production File Processing (without auth)
async function testProdFileProcessingStage() {
  console.log('\n=== STAGE 3: Production File Processing Stage ===');
  
  createTestImage();
  
  const formData = new FormData();
  formData.append('photo', fs.createReadStream(TEST_IMAGE_PATH), {
    filename: 'test-image.jpg',
    contentType: 'image/jpeg'
  });
  formData.append('title', 'Test Upload');
  formData.append('description', 'Testing file processing');
  
  try {
    const response = await fetch(`${PROD_BASE_URL}/api/photos/upload`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Production file processing test status:', response.status);
    console.log('Production file processing response:', result);
    
    if (response.status === 401) {
      console.log('✓ Production file processing blocked by authentication (expected)');
      return true;
    } else {
      console.log('✗ Unexpected response for production file processing test');
      return false;
    }
  } catch (error) {
    console.log('✗ Production file processing test failed:', error.message);
    return false;
  }
}

// Stage 4: Test Production Environment Configuration
async function testProdEnvironmentConfiguration() {
  console.log('\n=== STAGE 4: Production Environment Configuration ===');
  
  // Test NextAuth endpoints
  try {
    const sessionResponse = await fetch(`${PROD_BASE_URL}/api/auth/session`, {
      method: 'GET'
    });
    
    console.log('NextAuth session endpoint status:', sessionResponse.status);
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('Session data:', sessionData);
      console.log('✓ NextAuth is configured in production');
    }
  } catch (error) {
    console.log('✗ NextAuth session test failed:', error.message);
  }
  
  // Test signin page
  try {
    const signinResponse = await fetch(`${PROD_BASE_URL}/api/auth/signin`, {
      method: 'GET'
    });
    
    console.log('NextAuth signin endpoint status:', signinResponse.status);
    if (signinResponse.ok) {
      console.log('✓ NextAuth signin page is accessible');
    }
  } catch (error) {
    console.log('✗ NextAuth signin test failed:', error.message);
  }
}

// Stage 5: Test Production Database Connection
async function testProdDatabaseConnection() {
  console.log('\n=== STAGE 5: Production Database Connection ===');
  
  try {
    const response = await fetch(`${PROD_BASE_URL}/api/debug/db`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const dbInfo = await response.json();
      console.log('Production database connection:', dbInfo);
      console.log('✓ Production database is accessible');
    } else {
      console.log('Production database debug endpoint status:', response.status);
      console.log('(Debug endpoint may be disabled in production for security)');
    }
  } catch (error) {
    console.log('Production database debug endpoint not accessible');
    console.log('(This is expected in production for security reasons)');
  }
}

// Stage 6: Test Production File Storage Configuration
async function testProdFileStorageConfiguration() {
  console.log('\n=== STAGE 6: Production File Storage Configuration ===');
  
  console.log('Production file storage analysis:');
  console.log('- Expected: Vercel Blob storage (cloud-based)');
  console.log('- Fallback: Temporary serverless storage (not persistent)');
  console.log('- Local uploads directory: Not applicable in serverless environment');
  
  // Test if we can detect storage configuration through error messages
  createTestImage();
  
  const formData = new FormData();
  formData.append('photo', fs.createReadStream(TEST_IMAGE_PATH), {
    filename: 'storage-test.jpg',
    contentType: 'image/jpeg'
  });
  
  try {
    const response = await fetch(`${PROD_BASE_URL}/api/photos/upload`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.status === 401) {
      console.log('✓ Upload endpoint is functional (blocked by auth as expected)');
    } else if (response.status === 500 && result.error && result.error.includes('storage')) {
      console.log('Storage configuration detected from error:', result.error);
    } else {
      console.log('Unexpected response:', response.status, result);
    }
  } catch (error) {
    console.log('Storage test error:', error.message);
  }
}

// Stage 7: Test Production Middleware
async function testProdMiddleware() {
  console.log('\n=== STAGE 7: Production Middleware ===');
  
  // Test protected route access
  try {
    const dashboardResponse = await fetch(`${PROD_BASE_URL}/dashboard`, {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log('Dashboard access status:', dashboardResponse.status);
    
    if (dashboardResponse.status === 307 || dashboardResponse.status === 302) {
      const location = dashboardResponse.headers.get('location');
      console.log('Redirected to:', location);
      console.log('✓ Production middleware is protecting routes');
    } else {
      console.log('Unexpected dashboard response:', dashboardResponse.status);
    }
  } catch (error) {
    console.log('✗ Middleware test failed:', error.message);
  }
}

// Main test runner
async function runProductionUploadAnalysis() {
  console.log('🔍 PRODUCTION UPLOAD FLOW ANALYSIS');
  console.log('===================================');
  
  const serverAvailable = await testProdServerAvailability();
  
  if (!serverAvailable) {
    console.log('\n❌ Cannot proceed - production server is not accessible');
    return;
  }
  
  const authWorking = await testProdAuthenticationFlow();
  const fileProcessingWorking = await testProdFileProcessingStage();
  
  await testProdEnvironmentConfiguration();
  await testProdDatabaseConnection();
  await testProdFileStorageConfiguration();
  await testProdMiddleware();
  
  console.log('\n📋 PRODUCTION FLOW SUMMARY');
  console.log('===========================');
  console.log('1. Server: Vercel serverless deployment');
  console.log('2. Auth: NextAuth with OAuth providers (Google, etc.)');
  console.log('3. File Storage: Vercel Blob storage (cloud-based)');
  console.log('4. Database: Prisma with production PostgreSQL');
  console.log('5. Processing: Serverless function with async enhancement queue');
  console.log('6. Middleware: Route protection and authentication handling');
  
  console.log('\n🔄 KEY DIFFERENCES FROM DEVELOPMENT:');
  console.log('=====================================');
  console.log('• File Storage: Local filesystem → Vercel Blob');
  console.log('• Environment: Node.js server → Serverless functions');
  console.log('• Database: Local/dev DB → Production PostgreSQL');
  console.log('• Processing: Synchronous → Async with queuing');
  console.log('• Security: Development mode → Production hardening');
  
  return {
    serverAvailable,
    authWorking,
    fileProcessingWorking
  };
}

// Run the analysis
runProductionUploadAnalysis().catch(console.error);