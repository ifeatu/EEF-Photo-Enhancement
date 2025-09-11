const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function testEnhancedGemini() {
  console.log('Testing enhanced Gemini + Sharp image processing...');
  
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_AI_API_KEY not found in environment');
    return;
  }
  
  try {
    // Create a test image using Sharp
    console.log('\n🎨 Creating test image...');
    const testImageBuffer = await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
    .jpeg()
    .toBuffer();
    
    console.log('✅ Test image created, size:', testImageBuffer.length);
    
    // Convert to base64 for Gemini
    const base64Image = testImageBuffer.toString('base64');
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Test the analysis prompt
    const analysisPrompt = `Analyze this photo and provide enhancement recommendations. Respond with a JSON object containing these numeric values (0-100 scale):
    {
      "brightness": 50,
      "contrast": 50, 
      "saturation": 50,
      "sharpness": 50,
      "needsColorCorrection": true/false,
      "needsNoiseReduction": true/false
    }
    
    Base your recommendations on what would make this photo look more professional and appealing.`;
    
    console.log('\n🧪 Testing Gemini analysis...');
    
    const analysisResult = await model.generateContent([
      analysisPrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const analysisResponse = await analysisResult.response;
    const analysisText = analysisResponse.text();
    
    console.log('✅ Gemini analysis completed:');
    console.log(analysisText);
    
    // Test JSON parsing
    console.log('\n🔍 Testing JSON extraction...');
    const jsonMatch = analysisText.match(/\{[^}]+\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ JSON parsed successfully:', parsed);
        
        // Convert to enhancement parameters
        const enhancementParams = {
          brightness: 1 + (parsed.brightness - 50) / 100,
          contrast: 1 + (parsed.contrast - 50) / 100,
          saturation: 1 + (parsed.saturation - 50) / 100,
          sharpness: 1 + (parsed.sharpness - 50) / 100,
          needsColorCorrection: parsed.needsColorCorrection || false,
          needsNoiseReduction: parsed.needsNoiseReduction || false
        };
        
        console.log('✅ Enhancement parameters:', enhancementParams);
        
        // Test Sharp processing
        console.log('\n🖼️ Testing Sharp image processing...');
        
        let enhancedBuffer = sharp(testImageBuffer);
        
        // Apply brightness, contrast, and saturation adjustments
        enhancedBuffer = enhancedBuffer.modulate({
          brightness: enhancementParams.brightness,
          saturation: enhancementParams.saturation
        });
        
        // Apply contrast adjustment
        enhancedBuffer = enhancedBuffer.linear(enhancementParams.contrast, -(128 * enhancementParams.contrast) + 128);
        
        // Apply sharpening if needed
        if (enhancementParams.sharpness > 1.0) {
          enhancedBuffer = enhancedBuffer.sharpen(enhancementParams.sharpness, 1, 2);
        }
        
        // Apply noise reduction if needed
        if (enhancementParams.needsNoiseReduction) {
          enhancedBuffer = enhancedBuffer.median(3);
        }
        
        // Convert to JPEG with high quality
        const processedImageBuffer = await enhancedBuffer
          .jpeg({ quality: 90, progressive: true })
          .toBuffer();
        
        console.log('✅ Image processing completed!');
        console.log('Original size:', testImageBuffer.length);
        console.log('Enhanced size:', processedImageBuffer.length);
        
        // Save test images for comparison
        fs.writeFileSync('test-original.jpg', testImageBuffer);
        fs.writeFileSync('test-enhanced.jpg', processedImageBuffer);
        console.log('✅ Test images saved: test-original.jpg and test-enhanced.jpg');
        
      } catch (parseError) {
        console.log('❌ JSON parsing failed:', parseError.message);
      }
    } else {
      console.log('❌ No JSON found in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEnhancedGemini().catch(console.error);