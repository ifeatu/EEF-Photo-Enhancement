const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');

async function testNanoBanana() {
  try {
    console.log('Testing Nano Banana (Gemini 2.5 Flash Image)...');
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY not found');
      return;
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY.trim());
    
    // Test the image model specifically
    const imageModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image-preview' 
    });
    
    console.log('Nano Banana model initialized successfully');
    
    // Download the test image
    const imageUrl = 'https://vquaqzw3afdfgloq.public.blob.vercel-storage.com/1757636055500-22mo5963k-Gemini_Generated_Image_gk82d6gk82d6gk82-GxG7KE0ZqV5Yw7oodkRM65DL4OoPN1.png';
    
    const imageData = await new Promise((resolve, reject) => {
      https.get(imageUrl, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            mimeType: res.headers['content-type'] || 'image/png',
            size: buffer.length
          });
        });
        res.on('error', reject);
      });
    });
    
    console.log('Image downloaded:', { size: imageData.size, mimeType: imageData.mimeType });
    
    // Test image enhancement with Nano Banana
    const enhancementPrompt = `Enhance this image to look more professional and vibrant. Make the colors pop, improve lighting, and enhance details while keeping everything exactly the same.`;
    
    console.log('Sending enhancement request to Nano Banana...');
    
    const result = await imageModel.generateContent([
      enhancementPrompt,
      {
        inlineData: {
          data: imageData.buffer.toString('base64'),
          mimeType: imageData.mimeType
        }
      }
    ]);
    
    const response = await result.response;
    console.log('Nano Banana response received');
    
    // Check response structure
    const candidates = response.candidates;
    if (candidates && candidates[0] && candidates[0].content) {
      const content = candidates[0].content;
      console.log('Content parts:', content.parts.length);
      
      // Look for image data in the response
      let foundImage = false;
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log('✅ Nano Banana generated enhanced image!');
          console.log('Enhanced image size:', part.inlineData.data.length, 'chars (base64)');
          foundImage = true;
        } else if (part.text) {
          console.log('Text response:', part.text.substring(0, 200));
        }
      }
      
      if (!foundImage) {
        console.log('❌ No enhanced image found in response');
        console.log('Full response structure:', JSON.stringify(response, null, 2));
      }
    } else {
      console.log('❌ No candidates or content in response');
      console.log('Full response:', JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Nano Banana test failed:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.errorDetails) {
      console.error('Error details:', error.errorDetails);
    }
  }
}

testNanoBanana();