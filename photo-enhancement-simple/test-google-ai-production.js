require('dotenv').config({ path: '.env.production' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGoogleAIProduction() {
  console.log('🧪 Testing Google AI API in Production Environment');
  console.log('=' .repeat(60));

  // Check environment variables
  console.log('\n1. 🔧 Environment Variables Check...');
  const googleApiKey = process.env.GOOGLE_AI_API_KEY;
  console.log(`   🔑 GOOGLE_AI_API_KEY: ${googleApiKey ? 'SET (' + googleApiKey.substring(0, 10) + '...)' : 'NOT SET'}`);
  
  if (!googleApiKey) {
    console.log('   ❌ GOOGLE_AI_API_KEY is missing!');
    return;
  }

  try {
    // Initialize Google AI
    console.log('\n2. 🤖 Initializing Google AI...');
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('   ✅ Google AI initialized successfully');

    // Test simple text generation
    console.log('\n3. 📝 Testing simple text generation...');
    const prompt = 'Say "Hello from production!" in exactly 5 words.';
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(`   📤 Prompt: ${prompt}`);
    console.log(`   📥 Response: ${text}`);
    console.log('   ✅ Text generation working!');

    // Test image analysis (similar to photo enhancement)
    console.log('\n4. 🖼️  Testing image analysis capabilities...');
    const imagePrompt = {
      contents: [{
        role: 'user',
        parts: [
          { text: 'Describe this image in one sentence.' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
            }
          }
        ]
      }]
    };
    
    try {
      const imageResult = await model.generateContent(imagePrompt);
      const imageResponse = await imageResult.response;
      const imageText = imageResponse.text();
      console.log(`   📥 Image analysis response: ${imageText}`);
      console.log('   ✅ Image analysis working!');
    } catch (imageError) {
      console.log(`   ⚠️  Image analysis failed: ${imageError.message}`);
      console.log('   ℹ️  This might be why photo enhancement is failing');
    }

    console.log('\n🎉 Google AI API is working in production!');
    
  } catch (error) {
    console.log('\n❌ Google AI API Error:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('   🔑 The API key appears to be invalid');
    } else if (error.message.includes('quota')) {
      console.log('   💰 API quota may be exceeded');
    } else if (error.message.includes('network')) {
      console.log('   🌐 Network connectivity issue');
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 GOOGLE AI PRODUCTION TEST COMPLETE');
}

testGoogleAIProduction().catch(console.error);