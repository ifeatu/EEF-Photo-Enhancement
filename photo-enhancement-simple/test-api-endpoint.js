const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

async function testEnhancementAPI() {
  console.log('🧪 Testing Photo Enhancement API Endpoint...');
  
  try {
    // Use an actual before photo from the photos directory
    const photoPath = path.join(__dirname, '..', 'photos', 'photo-1-before.jpg');
    const photoBuffer = fs.readFileSync(photoPath);
    
    console.log('✅ Test photo loaded:', photoPath);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', photoBuffer, {
      filename: 'photo-1-before.jpg',
      contentType: 'image/jpeg'
    });
    
    console.log('🔄 Making API call to enhancement endpoint...');
    
    // Make API call to the enhancement endpoint
    const response = await fetch('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        // Note: In real usage, this would require authentication
        // For testing, we'll see what happens without auth
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response body:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
    
    if (response.ok) {
      console.log('✅ API endpoint responded successfully!');
      
      try {
        const responseData = JSON.parse(responseText);
        console.log('✅ Response is valid JSON');
        console.log('📝 Response keys:', Object.keys(responseData));
        
        if (responseData.enhancedUrl) {
          console.log('✅ Enhanced URL found:', responseData.enhancedUrl);
        }
      } catch (parseError) {
        console.log('⚠️  Response is not JSON, might be an error page');
      }
    } else {
      console.log('❌ API endpoint returned error status');
      
      if (response.status === 401) {
        console.log('ℹ️  This is expected - authentication is required');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\n🎉 API endpoint test completed!');
}

// Run the test
testEnhancementAPI();