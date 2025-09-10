const FormData = require('form-data');
const fs = require('fs');
const https = require('https');

console.log('Testing production upload endpoint with file to reproduce 500 error...');

// Create a simple test image file
const testImageContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('test-image.png', testImageContent);

const form = new FormData();
form.append('file', fs.createReadStream('test-image.png'), {
  filename: 'test-image.png',
  contentType: 'image/png'
});

const options = {
  hostname: 'photoenhance.dev',
  port: 443,
  path: '/api/photos/upload',
  method: 'POST',
  headers: {
    ...form.getHeaders(),
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', data);
    
    if (res.statusCode === 500) {
      console.log('\n=== 500 ERROR DETECTED ===');
      console.log('This is the actual error causing the browser console message');
      
      // Try to parse as JSON
      try {
        const errorData = JSON.parse(data);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Response is not JSON, raw content:', data);
      }
    }
    
    // Cleanup
    fs.unlinkSync('test-image.png');
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
  fs.unlinkSync('test-image.png');
});

form.pipe(req);