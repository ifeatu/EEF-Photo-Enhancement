const fetch = require('node-fetch');

async function testEnhanceAPI() {
  try {
    console.log('Testing enhancement API...');
    
    // Test the enhancement endpoint
    const response = await fetch('http://localhost:3000/api/photos/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        photoId: 'cmf95ilsk00019dyghw51w3bi' 
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Enhancement API call successful');
    } else {
      console.log('❌ Enhancement API call failed');
    }
    
  } catch (error) {
    console.error('Error testing enhancement API:', error);
  }
}

testEnhanceAPI();