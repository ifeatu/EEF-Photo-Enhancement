async function testApiEndpoint() {
  console.log('Testing API endpoint at https://photoenhance.dev...');
  
  try {
    // First, test a simple GET to see if the site is responsive
    console.log('\n1. Testing site availability...');
    const response = await fetch('https://photoenhance.dev');
    console.log('Site status:', response.status);
    
    // Test authentication endpoint
    console.log('\n2. Testing auth endpoint...');
    const authResponse = await fetch('https://photoenhance.dev/api/auth/session');
    console.log('Auth endpoint status:', authResponse.status);
    const authData = await authResponse.text();
    console.log('Auth response:', authData.substring(0, 200));
    
    // Test upload endpoint (should redirect to signin without auth)
    console.log('\n3. Testing upload endpoint (unauthenticated)...');
    const uploadResponse = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      redirect: 'manual'
    });
    console.log('Upload endpoint status:', uploadResponse.status);
    console.log('Upload endpoint location:', uploadResponse.headers.get('location'));
    
  } catch (error) {
    console.error('Error testing API:', error.message);
    console.error('Full error:', error);
  }
}

testApiEndpoint().catch(console.error);