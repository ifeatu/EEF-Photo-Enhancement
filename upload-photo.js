// Using built-in fetch API (Node.js 18+)
const fs = require('fs');

async function uploadPhoto() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:1337/api/auth/local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: 'testuser2@example.com',
        password: 'testpassword123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login successful, JWT:', loginData.jwt ? 'received' : 'failed');
    
    if (!loginData.jwt) {
      console.error('Failed to get JWT token');
      return;
    }
    
    // Create FormData for file upload
    const FormData = require('form-data');
    const form = new FormData();
    
    // Add the image file
    form.append('files.originalImage', fs.createReadStream('/Users/pierre/EEF-Photo-Enhancement/photos/photo-1-before.jpg'));
    
    // Add the data payload
    form.append('data', JSON.stringify({
      enhancementType: 'enhance'
    }));
    
    // Upload the photo
    const uploadResponse = await fetch('http://localhost:1337/api/photos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loginData.jwt}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    const uploadData = await uploadResponse.json();
    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response:', JSON.stringify(uploadData, null, 2));
    
    if (uploadData.data && uploadData.data.documentId) {
      console.log('Photo uploaded successfully with documentId:', uploadData.data.documentId);
      return uploadData.data.documentId;
    } else {
      console.error('Failed to upload photo');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

uploadPhoto();