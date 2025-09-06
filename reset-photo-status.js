async function resetPhotoStatus() {
  try {
    // Login to get JWT
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
    const jwt = loginData.jwt;
    console.log('Login successful, JWT:', jwt ? 'received' : 'failed');
    
    // Update photo status to pending
    const updateResponse = await fetch(
      'http://localhost:1337/api/photos/tdslr6oukwr5u8gktxslq9r7',
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            status: 'pending',
            processingStarted: null,
            processingCompleted: null,
            errorMessage: null
          }
        })
      }
    );
    
    console.log('Update response status:', updateResponse.status);
    if (updateResponse.ok) {
      console.log('Photo status reset to pending');
    } else {
      const errorData = await updateResponse.json();
      console.log('Update failed:', errorData);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

resetPhotoStatus();