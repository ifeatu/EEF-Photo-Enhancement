const axios = require('axios');

// Test login functionality
async function testLogin() {
  try {
    console.log('Testing login functionality...');
    
    const response = await axios.post('http://localhost:1337/api/auth/local', {
      identifier: 'pierre@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('JWT:', response.data.jwt);
    console.log('User:', response.data.user);
    
  } catch (error) {
    console.error('Login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();