const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY not found');
      return;
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    console.log('Model initialized successfully');
    
    // Test simple text generation
    const result = await model.generateContent('Hello, are you working?');
    const response = await result.response;
    console.log('Text generation test:', response.text().substring(0, 100));
    
    console.log('✅ Gemini API is working');
  } catch (error) {
    console.error('❌ Gemini API failed:', error.message);
    console.error('Error details:', error);
  }
}

testGemini();