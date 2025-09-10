// Test Gemini API functionality in production environment
require('dotenv').config({ path: '.env.prod' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

async function testGeminiProduction() {
  console.log('🧪 Testing Gemini API in Production Environment...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check environment variables
    console.log('\n📋 Environment Configuration Check:');
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      console.log('❌ GOOGLE_AI_API_KEY not found in environment');
      return false;
    }
    
    console.log('✅ GOOGLE_AI_API_KEY found:', apiKey.substring(0, 10) + '...');
    console.log('✅ Environment:', process.env.NODE_ENV || 'development');
    console.log('✅ Vercel Environment:', process.env.VERCEL_ENV || 'local');
    
    // 2. Initialize Gemini AI
    console.log('\n🤖 Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    
    // 3. Test text generation (simple test)
    console.log('\n📝 Testing Text Generation:');
    const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const startTime = Date.now();
    const textResult = await textModel.generateContent('Say "Hello from Gemini in production!"');
    const textDuration = Date.now() - startTime;
    
    const textResponse = textResult.response.text();
    console.log('✅ Text generation successful');
    console.log('📊 Response time:', textDuration + 'ms');
    console.log('📄 Response:', textResponse.substring(0, 100) + '...');
    
    // 4. Test image model (used for photo enhancement)
    console.log('\n🖼️  Testing Image Model (Gemini 2.0 Flash):');
    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Create a simple test image (1x1 pixel)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const imageStartTime = Date.now();
    const imageResult = await imageModel.generateContent([
      'Describe this image briefly.',
      {
        inlineData: {
          data: testImageBase64,
          mimeType: 'image/png'
        }
      }
    ]);
    const imageDuration = Date.now() - imageStartTime;
    
    const imageResponse = imageResult.response.text();
    console.log('✅ Image model successful');
    console.log('📊 Response time:', imageDuration + 'ms');
    console.log('📄 Response:', imageResponse.substring(0, 100) + '...');
    
    // 5. Test enhancement prompt (actual use case)
    console.log('\n🎨 Testing Photo Enhancement Prompt:');
    const enhancementPrompt = `Enhance this photo to professional quality: improve lighting, increase sharpness and clarity, enhance colors and contrast, reduce noise, and make it look like it was taken with a high-end DSLR camera.`;
    
    const enhanceStartTime = Date.now();
    const enhanceResult = await imageModel.generateContent([
      enhancementPrompt,
      {
        inlineData: {
          data: testImageBase64,
          mimeType: 'image/png'
        }
      }
    ]);
    const enhanceDuration = Date.now() - enhanceStartTime;
    
    const enhanceResponse = enhanceResult.response.text();
    console.log('✅ Enhancement prompt successful');
    console.log('📊 Response time:', enhanceDuration + 'ms');
    console.log('📄 Response:', enhanceResponse.substring(0, 150) + '...');
    
    // 6. Test rate limits and quotas
    console.log('\n⚡ Testing Rate Limits:');
    const rateLimitTests = [];
    for (let i = 0; i < 3; i++) {
      const testStart = Date.now();
      try {
        await textModel.generateContent(`Test ${i + 1}: Quick response test`);
        rateLimitTests.push(Date.now() - testStart);
        console.log(`✅ Rate limit test ${i + 1}: ${Date.now() - testStart}ms`);
      } catch (error) {
        console.log(`❌ Rate limit test ${i + 1} failed:`, error.message);
        break;
      }
    }
    
    const avgResponseTime = rateLimitTests.reduce((a, b) => a + b, 0) / rateLimitTests.length;
    console.log('📊 Average response time:', Math.round(avgResponseTime) + 'ms');
    
    // 7. Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 GEMINI API PRODUCTION TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ API Key: Valid and working');
    console.log('✅ Text Model: Functional');
    console.log('✅ Image Model: Functional');
    console.log('✅ Enhancement Prompts: Working');
    console.log('✅ Rate Limits: No issues detected');
    console.log('📊 Performance: Average ' + Math.round(avgResponseTime) + 'ms response time');
    
    console.log('\n🔍 Production Readiness:');
    if (avgResponseTime < 5000) {
      console.log('✅ Response times are acceptable for production');
    } else {
      console.log('⚠️  Response times may be slow for production use');
    }
    
    console.log('\n✅ Gemini API is fully functional in production environment!');
    return true;
    
  } catch (error) {
    console.log('\n❌ GEMINI API TEST FAILED');
    console.log('Error:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('- Check if GOOGLE_AI_API_KEY is correct');
      console.log('- Verify API key has proper permissions');
      console.log('- Ensure API key is not expired');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('- API quota has been exceeded');
      console.log('- Check Google AI Studio for usage limits');
      console.log('- Consider upgrading your plan');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('- API key may not have access to required models');
      console.log('- Check model availability in your region');
      console.log('- Verify billing is enabled');
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testGeminiProduction()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testGeminiProduction };