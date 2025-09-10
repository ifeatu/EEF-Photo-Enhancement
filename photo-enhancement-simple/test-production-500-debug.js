const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testProductionUpload() {
  console.log('🔍 Debugging production 500 errors...');
  
  // Test with authentication to see the actual 500 error
  const testImagePath = './test-fix.jpg';
  
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ Test image not found, creating a simple test file...');
    fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));
  }
  
  const form = new FormData();
  form.append('photo', fs.createReadStream(testImagePath)); // Correct field name
  
  try {
    console.log('\n📤 Testing upload with form data (no auth - expecting 401)...');
    const response = await fetch('https://photoenhance.dev/api/photos/upload', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders()
      }
    });
    
    console.log(`   📊 Status: ${response.status}`);
    console.log(`   📊 Content-Type: ${response.headers.get('content-type')}`);
    
    const responseText = await response.text();
    console.log(`   📊 Response: ${responseText}`);
    
    if (response.status === 500) {
      console.log('\n❌ FOUND 500 ERROR!');
      console.log('   📋 This suggests an internal server error in the upload handler');
      console.log('   📋 Possible causes:');
      console.log('   • Database connection issues');
      console.log('   • Missing environment variables');
      console.log('   • File processing errors');
      console.log('   • Blob storage configuration issues');
    } else if (response.status === 401) {
      console.log('\n✅ Got expected 401 - middleware fix working');
      console.log('   📋 The 500 error might be happening after authentication');
    }
    
  } catch (error) {
    console.log(`\n❌ Request failed: ${error.message}`);
  }
  
  // Test other endpoints for comparison
  console.log('\n📤 Testing enhance endpoint...');
  try {
    const enhanceResponse = await fetch('https://photoenhance.dev/api/photos/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ photoId: 'test' })
    });
    
    console.log(`   📊 Enhance Status: ${enhanceResponse.status}`);
    const enhanceText = await enhanceResponse.text();
    console.log(`   📊 Enhance Response: ${enhanceText}`);
    
  } catch (error) {
    console.log(`   ❌ Enhance test failed: ${error.message}`);
  }
  
  // Test health endpoint
  console.log('\n📤 Testing health endpoint...');
  try {
    const healthResponse = await fetch('https://photoenhance.dev/api/health');
    console.log(`   📊 Health Status: ${healthResponse.status}`);
    const healthText = await healthResponse.text();
    console.log(`   📊 Health Response: ${healthText}`);
    
  } catch (error) {
    console.log(`   ❌ Health test failed: ${error.message}`);
  }
}

testProductionUpload().catch(console.error);