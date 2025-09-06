// Using built-in fetch API (Node.js 18+)

async function testEnhancement() {
  try {
    // First try to register the user
    const registerResponse = await fetch('http://localhost:1337/api/auth/local/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser2',
        email: 'testuser2@example.com',
        password: 'testpassword123'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('Register response:', registerData);
    
    // Try to login (whether registration succeeded or user already exists)
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
    console.log('Login response:', loginData);
    
    if (!loginData.jwt) {
      console.error('Failed to get JWT token');
      return;
    }
    
    // Add credits to the user first
    const creditsResponse = await fetch(`http://localhost:1337/api/users/${loginData.user.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${loginData.jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        credits: 10
      })
    });
    
    console.log('Credits update status:', creditsResponse.status);
    
    // Use existing photo ID 9 that we created earlier
    const photoDocumentId = 'zee83qt4o11kp4lidi19ifr3';
    console.log('Using existing photo with documentId:', photoDocumentId);
    
    // Test enhancement with the JWT token
    const enhanceResponse = await fetch(`http://localhost:1337/api/photos/${photoDocumentId}/enhance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loginData.jwt}`,
        'Content-Type': 'application/json'
      }
    });
    
    const enhanceData = await enhanceResponse.json();
    console.log('Enhancement response status:', enhanceResponse.status);
    console.log('Enhancement response:', enhanceData);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testEnhancement();