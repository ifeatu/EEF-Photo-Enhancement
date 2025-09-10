const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUploadWith500Debug() {
  console.log('Testing upload endpoint with authentication to reproduce 500 error...');
  
  // Create a test image file
  const testImageBuffer = Buffer.from('fake-image-data');
  
  // Create form data
  const formData = new FormData();
  formData.append('photo', testImageBuffer, {
    filename: 'test.jpg',
    contentType: 'image/jpeg'
  });
  
  try {
    // Test with a mock session cookie (this should trigger the 500 error)
    const response = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': 'next-auth.session-token=fake-token-to-trigger-auth-flow',
        ...formData.getHeaders()
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 500) {
      console.log('\n🔴 500 ERROR REPRODUCED!');
      console.log('This confirms the issue is in the upload route logic, not middleware.');
    }
    
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Also test the enhance endpoint
async function testEnhanceWith500Debug() {
  console.log('\nTesting enhance endpoint...');
  
  try {
    const response = await fetch('https://photoenhance.dev/api/photos/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=fake-token-to-trigger-auth-flow'
      },
      body: JSON.stringify({ photoId: 'test-id' })
    });
    
    console.log('Enhance response status:', response.status);
    const responseText = await response.text();
    console.log('Enhance response:', responseText.substring(0, 200));
    
  } catch (error) {
    console.error('Enhance request failed:', error.message);
  }
}

async function main() {
  await testUploadWith500Debug();
  await testEnhanceWith500Debug();
}

main().catch(console.error);