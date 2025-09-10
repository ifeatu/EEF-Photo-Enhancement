const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Test with a real authentication flow
async function testRealUserUpload() {
  console.log('Testing upload with real user authentication flow...');
  
  try {
    // First, try to get the signin page to get any session cookies
    console.log('1. Getting signin page...');
    const signinResponse = await fetch('https://photoenhance.dev/auth/signin', {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log('Signin response status:', signinResponse.status);
    const cookies = signinResponse.headers.get('set-cookie');
    console.log('Cookies from signin:', cookies);
    
    // Now try to upload with any session cookies we got
    console.log('\n2. Testing upload with session cookies...');
    
    const testImageBuffer = Buffer.from('fake-image-data-for-testing');
    const formData = new FormData();
    formData.append('photo', testImageBuffer, {
      filename: 'test.jpg',
      contentType: 'image/jpeg'
    });
    
    const uploadHeaders = {
      ...formData.getHeaders()
    };
    
    if (cookies) {
      uploadHeaders['Cookie'] = cookies;
    }
    
    const uploadResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: formData,
      headers: uploadHeaders
    });
    
    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));
    
    const uploadText = await uploadResponse.text();
    console.log('Upload response body:', uploadText);
    
    if (uploadResponse.status === 500) {
      console.log('\n🔴 500 ERROR FOUND!');
      console.log('Response body contains:', uploadText.substring(0, 500));
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Test the dashboard page to see if there are any general issues
async function testDashboard() {
  console.log('\n3. Testing dashboard page...');
  
  try {
    const response = await fetch('https://photoenhance.dev/dashboard', {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log('Dashboard response status:', response.status);
    console.log('Dashboard redirect location:', response.headers.get('location'));
    
  } catch (error) {
    console.error('Dashboard test failed:', error.message);
  }
}

async function main() {
  await testRealUserUpload();
  await testDashboard();
  
  console.log('\n=== SUMMARY ===');
  console.log('If 500 error occurred, check:');
  console.log('1. Database connection issues');
  console.log('2. Environment variables missing');
  console.log('3. Blob storage configuration');
  console.log('4. NextAuth configuration');
}

main().catch(console.error);