// Using built-in fetch API (Node.js 18+)

async function checkPhotos() {
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
    
    // Check existing photos
    const photosResponse = await fetch('http://localhost:1337/api/photos', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.jwt}`
      }
    });
    
    const photosData = await photosResponse.json();
    console.log('Photos response status:', photosResponse.status);
    console.log('Photos data:', JSON.stringify(photosData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPhotos();