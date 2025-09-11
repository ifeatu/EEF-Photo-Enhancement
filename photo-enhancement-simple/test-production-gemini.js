const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testProductionGemini() {
  console.log('Testing Gemini API in production environment...');
  
  // Use the same environment variable as production
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_AI_API_KEY not found in environment');
    return;
  }
  
  console.log('✅ API Key found, length:', apiKey.length);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('\n🧪 Testing text generation...');
    const textResult = await model.generateContent('Say hello in a creative way');
    const textResponse = await textResult.response;
    console.log('✅ Text generation successful:', textResponse.text().substring(0, 100) + '...');
    
    console.log('\n🧪 Testing image analysis...');
    // Create a simple test image (1x1 pixel base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const imageAnalysisResult = await model.generateContent([
      'Describe this image briefly',
      {
        inlineData: {
          data: testImageBase64,
          mimeType: 'image/png'
        }
      }
    ]);
    
    const imageResponse = await imageAnalysisResult.response;
    console.log('✅ Image analysis successful:', imageResponse.text().substring(0, 100) + '...');
    
    console.log('\n🧪 Testing image generation (this should fail)...');
    try {
      const imageGenResult = await model.generateContent([
        'Generate an enhanced version of this image with better lighting and colors',
        {
          inlineData: {
            data: testImageBase64,
            mimeType: 'image/png'
          }
        }
      ]);
      
      const imageGenResponse = await imageGenResult.response;
      const responseText = imageGenResponse.text();
      
      // Check if response contains actual image data or just text
      if (responseText.includes('base64') || responseText.includes('data:image')) {
        console.log('✅ Image generation successful (unexpected!)');
      } else {
        console.log('❌ Image generation returned text only:', responseText.substring(0, 200) + '...');
        console.log('\n🔍 This confirms Gemini cannot generate images, only analyze them.');
      }
    } catch (error) {
      console.log('❌ Image generation failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Gemini API test failed:', error.message);
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('🔍 The API key appears to be invalid');
    } else if (error.message.includes('quota')) {
      console.error('🔍 API quota may be exceeded');
    }
  }
}

testProductionGemini().catch(console.error);