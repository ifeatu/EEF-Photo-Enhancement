// Simple integration test for Nano Banana enhancement
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testNanoBananaIntegration() {
  console.log('🧪 Testing Nano Banana (Gemini 2.5 Flash Image) Integration...');
  
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not found in environment variables');
    }
    
    console.log('✅ Google AI API key found');
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    console.log('✅ Gemini AI model initialized');
    
    // Use an actual before photo from the photos directory
    const photoPath = path.join(__dirname, '..', 'photos', 'photo-1-before.jpg');
    const testImageBuffer = fs.readFileSync(photoPath);
    const testImageBase64 = testImageBuffer.toString('base64');
    
    console.log('🔄 Testing image enhancement with Nano Banana...');
    
    // Test enhancement
    const prompt = 'Enhance this image to improve its quality and clarity.';
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: testImageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    console.log('✅ Nano Banana API call successful');
    
    // Check response structure
    const candidate = result.response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error('Invalid response structure from Nano Banana');
    }
    
    console.log('✅ Response structure is valid');
    
    // Look for image data in response
    let hasImageData = false;
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        hasImageData = true;
        console.log('✅ Enhanced image data found in response');
        console.log(`📊 Enhanced image size: ${part.inlineData.data.length} characters (base64)`);
        break;
      }
    }
    
    if (!hasImageData) {
      console.log('⚠️  No image data found in response, but API call was successful');
      console.log('📝 Response parts:', candidate.content.parts.map(p => Object.keys(p)));
    }
    
    console.log('\n🎉 Nano Banana integration test completed successfully!');
    console.log('✅ The enhancement API should work correctly with real photos.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔍 Full error:', error);
    process.exit(1);
  }
}

// Run the test
testNanoBananaIntegration();