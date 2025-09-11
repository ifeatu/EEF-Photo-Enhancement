const fetch = require('node-fetch');

async function testProductionEnhancement() {
  console.log('Testing production photo enhancement endpoint...');
  
  try {
    // Test the enhancement endpoint with a sample request
    console.log('\n🚀 Testing enhancement endpoint functionality...');
    
    const enhanceResponse = await fetch('https://photoenhance.dev/api/photos/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': 'upload-service'
      },
      body: JSON.stringify({
        photoId: 'test-photo-id-12345'
      })
    });
    
    console.log('Enhancement response status:', enhanceResponse.status);
    
    if (enhanceResponse.ok) {
      const enhanceData = await enhanceResponse.json();
      console.log('✅ Enhancement endpoint is working!');
      console.log('Response:', enhanceData);
    } else {
      const errorText = await enhanceResponse.text();
      console.log('Enhancement response details:', {
        status: enhanceResponse.status,
        statusText: enhanceResponse.statusText,
        body: errorText
      });
      
      // Check if it's a "photo not found" error (which is expected) vs other errors
      if (enhanceResponse.status === 404 && errorText.includes('Photo not found')) {
        console.log('✅ Enhancement endpoint is working! (Got expected 404 for non-existent photo)');
      } else if (enhanceResponse.status === 400 && errorText.includes('Photo not found')) {
        console.log('✅ Enhancement endpoint is working! (Got expected 400 for non-existent photo)');
      } else {
        console.log('❌ Enhancement endpoint has issues:', enhanceResponse.status, errorText);
      }
    }
    
    // Test with an actual image URL to see if the Gemini + Sharp processing works
    console.log('\n🖼️ Testing with a real image URL...');
    
    const testImageResponse = await fetch('https://photoenhance.dev/api/photos/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': 'upload-service'
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
      })
    });
    
    console.log('Image URL test response status:', testImageResponse.status);
    
    if (testImageResponse.ok) {
      const imageData = await testImageResponse.json();
      console.log('✅ Image URL enhancement working!');
      console.log('Response:', imageData);
    } else {
      const errorText = await testImageResponse.text();
      console.log('Image URL test details:', {
        status: testImageResponse.status,
        statusText: testImageResponse.statusText,
        body: errorText
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProductionEnhancement().catch(console.error);