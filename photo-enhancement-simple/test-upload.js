const fs = require('fs');
const path = require('path');

// Create a simple test image file
const testImageContent = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buffer = Buffer.from(testImageContent.split(',')[1], 'base64');

async function testUpload() {
  try {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/png' });
    const file = new File([blob], 'test-image.png', { type: 'image/png' });
    
    formData.append('photo', file);
    formData.append('title', 'Test Upload');
    
    const response = await fetch('http://localhost:3000/api/photos/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Add session cookie if needed
      }
    });
    
    const result = await response.json();
    console.log('Upload result:', result);
    console.log('Status:', response.status);
    
  } catch (error) {
    console.error('Test upload error:', error);
  }
}

testUpload();