const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');
const http = require('http');

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          mimeType: res.headers['content-type'] || 'image/jpeg',
          size: buffer.length
        });
      });
      res.on('error', reject);
    });
  });
}

async function testGeminiImage() {
  try {
    console.log('Testing Gemini image enhancement...');
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY not found');
      return;
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    console.log('Model initialized successfully');
    
    // Test image from the failed photo
    const imageUrl = 'https://mswcsm1awm9kjfph.public.blob.vercel-storage.com/1726086810671-5lqnkqaql-Gemini_Generated_Image_gk82d6gk82d6gk82.png-hOoRZ5eKWYZm0GGHwaBgU4HJFHEYkm.png';
    
    console.log('Downloading test image...');
    const imageData = await downloadImage(imageUrl);
    console.log('Image downloaded:', { size: imageData.size, mimeType: imageData.mimeType });
    
    // Test 1: Simple analysis
    console.log('Testing image analysis...');
    const analysisPrompt = `Analyze this photo and provide enhancement recommendations. 
    Respond with a JSON object containing these numeric values (0-100 scale):
    {
      "brightness": 50,
      "contrast": 50,
      "saturation": 50,
      "sharpness": 50,
      "needsColorCorrection": true/false,
      "needsNoiseReduction": true/false,
      "confidence": 85
    }
    
    Base your recommendations on what would make this photo look more professional and appealing.
    Provide a confidence score (0-100) based on image quality and clarity.`;
    
    const analysisResult = await model.generateContent([
      analysisPrompt,
      {
        inlineData: {
          data: imageData.buffer.toString('base64'),
          mimeType: imageData.mimeType
        }
      }
    ]);
    
    const analysisResponse = await analysisResult.response;
    console.log('Analysis result:', analysisResponse.text().substring(0, 200));
    
    // Test 2: Image enhancement (this is where it likely fails)
    console.log('Testing image enhancement...');
    const enhancementPrompt = `Subject: An exact recreation of a vintage photograph, but with a total professional makeover. Keep the people, their poses, and the entire scene exactly the same. Your task is to make this look like a high-end portrait taken today.

Aesthetic Transformation:

Make the Colors POP: This is the most important part. Get rid of the old, faded colors and create a modern, vibrant, and deeply saturated look. The colors should be rich, full of life, and bold.

Light the Scene Like a Pro: Forget the harsh flash. Use soft, professional lighting that sculpts the subjects and creates depth. Eliminate all glare on glasses and add a bright sparkle in the eyes.

Ultra-Realistic Detail: Render everything in stunning 8K detail. The skin should look natural, not fake or airbrushed. You should be able to see the texture of their clothes and the patterns on the walls with perfect clarity.

Professional Camera Feel: The final image should have the crisp, clear quality of a modern digital camera with a wide dynamic range.

Keep everything exactly the same - just make it look like it was shot today with professional equipment and lighting.`;
    
    const enhancementResult = await model.generateContent([
      enhancementPrompt,
      {
        inlineData: {
          data: imageData.buffer.toString('base64'),
          mimeType: imageData.mimeType
        }
      }
    ]);
    
    const enhancementResponse = await enhancementResult.response;
    const candidates = enhancementResponse.candidates;
    
    console.log('Enhancement response candidates:', candidates ? candidates.length : 0);
    
    if (candidates && candidates[0] && candidates[0].content) {
      const content = candidates[0].content;
      console.log('Content parts:', content.parts.length);
      
      // Look for image data in the response
      let foundImage = false;
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log('✅ Found enhanced image data, size:', part.inlineData.data.length);
          foundImage = true;
        } else if (part.text) {
          console.log('Found text response:', part.text.substring(0, 200));
        }
      }
      
      if (!foundImage) {
        console.log('❌ No enhanced image found in response');
      }
    } else {
      console.log('❌ No candidates or content in response');
    }
    
    console.log('✅ Gemini image test completed');
  } catch (error) {
    console.error('❌ Gemini image test failed:', error.message);
    console.error('Error details:', error);
  }
}

testGeminiImage();