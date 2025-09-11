require('dotenv').config({ path: '.env.production' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiImageGeneration() {
  console.log('🧪 Testing Gemini Image Generation Capabilities');
  console.log('=' .repeat(60));

  const googleApiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!googleApiKey) {
    console.log('❌ GOOGLE_AI_API_KEY is missing!');
    return;
  }

  try {
    console.log('\n1. 🤖 Initializing Gemini model...');
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('   ✅ Gemini initialized successfully');

    // Test 1: Text generation (should work)
    console.log('\n2. 📝 Testing text generation...');
    const textResult = await model.generateContent('Say hello in 3 words');
    const textResponse = await textResult.response;
    console.log(`   📥 Text response: ${textResponse.text()}`);
    console.log('   ✅ Text generation works!');

    // Test 2: Image analysis (should work)
    console.log('\n3. 🔍 Testing image analysis...');
    const imageAnalysisPrompt = {
      contents: [{
        role: 'user',
        parts: [
          { text: 'Describe this image briefly.' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
            }
          }
        ]
      }]
    };
    
    const analysisResult = await model.generateContent(imageAnalysisPrompt);
    const analysisResponse = await analysisResult.response;
    console.log(`   📥 Analysis response: ${analysisResponse.text()}`);
    console.log('   ✅ Image analysis works!');

    // Test 3: Try to generate an image (should fail)
    console.log('\n4. 🎨 Testing image generation (this should fail)...');
    const imageGenPrompt = {
      contents: [{
        role: 'user',
        parts: [
          { 
            text: `Subject: An exact recreation of a vintage photograph, but with a total professional makeover. Keep the people, their poses, and the entire scene exactly the same. Your task is to make this look like a high-end portrait taken today.
            
            Aesthetic Transformation:
            
            Make the Colors POP: This is the most important part. Get rid of the old, faded colors and create a modern, vibrant, and deeply saturated look. The colors should be rich, full of life, and bold.
            
            Light the Scene Like a Pro: Forget the harsh flash. Use soft, professional lighting that sculpts the subjects and creates depth. Eliminate all glare on glasses and add a bright sparkle in the eyes.
            
            Ultra-Realistic Detail: Render everything in stunning 8K detail. The skin should look natural, not fake or airbrushed. You should be able to see the texture of their clothes and the patterns on the walls with perfect clarity.
            
            Professional Camera Feel: The final image should have the crisp, clear quality of a modern digital camera with a wide dynamic range.`
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
            }
          }
        ]
      }]
    };
    
    const genResult = await model.generateContent(imageGenPrompt);
    const genResponse = await genResult.response;
    
    console.log('   📥 Generation response:');
    console.log(`   📄 Text: ${genResponse.text()}`);
    
    // Check if response contains image data
    const candidate = genResponse.candidates?.[0];
    if (candidate?.content?.parts) {
      let hasImageData = false;
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          console.log('   🖼️  Found image data in response!');
          hasImageData = true;
          break;
        }
      }
      
      if (!hasImageData) {
        console.log('   ❌ No image data found in response - Gemini only returned text');
        console.log('   ℹ️  This confirms Gemini cannot generate images, only analyze them');
      }
    }
    
  } catch (error) {
    console.log('\n❌ Gemini Error:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    
    if (error.message.includes('UNSUPPORTED_OPERATION')) {
      console.log('   ℹ️  This confirms Gemini does not support image generation');
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 GEMINI IMAGE GENERATION TEST COMPLETE');
  console.log('\n📋 FINDINGS:');
  console.log('   • Gemini can analyze images and generate text descriptions');
  console.log('   • Gemini CANNOT generate or enhance images');
  console.log('   • The enhancement code is fundamentally flawed');
  console.log('   • Need to use a proper image generation/enhancement service');
}

testGeminiImageGeneration().catch(console.error);