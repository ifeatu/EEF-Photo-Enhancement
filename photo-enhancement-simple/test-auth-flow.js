// Test the authentication flow with a mock request
async function testAuthFlow() {
  console.log('Testing authentication flow...');
  
  try {
    // Test session endpoint
    console.log('\n1. Testing session endpoint...');
    const sessionResponse = await fetch('https://photoenhance.dev/api/auth/session');
    const sessionData = await sessionResponse.json();
    console.log('Session response:', sessionData);
    
    // Test signin page
    console.log('\n2. Testing signin page...');
    const signinResponse = await fetch('https://photoenhance.dev/api/auth/signin');
    console.log('Signin status:', signinResponse.status);
    
    // Test our new debug endpoint
    console.log('\n3. Testing database debug endpoint...');
    const dbResponse = await fetch('https://photoenhance.dev/api/debug/db');
    const dbData = await dbResponse.text();
    console.log('Database debug response:', dbData);
    
    // Try the upload endpoint one more time to see if errors have changed
    console.log('\n4. Testing upload endpoint again...');
    const uploadResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });
    const uploadText = await uploadResponse.text();
    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response:', uploadText);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAuthFlow().catch(console.error);