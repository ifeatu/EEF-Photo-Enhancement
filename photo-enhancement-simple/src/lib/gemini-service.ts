/**
 * Production-Ready Gemini Service
 * Addresses all critical issues from debugging journey:
 * - Eliminates Sharp dependency (serverless incompatible)
 * - Implements proper timeout management (<60s Vercel limit)
 * - Adds retry mechanisms for reliability
 * - Optimizes memory usage and error handling
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { put } from '@vercel/blob';
import { APP_CONFIG, getGeminiConfig } from './config';
import { downloadImageSafely, generateSafeFilename, resolveImageUrl } from './url-utils';

export interface GeminiAnalysisResult {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  needsColorCorrection: boolean;
  needsNoiseReduction: boolean;
  confidence: number;
  processingTime: number;
}

export interface EnhancementResult {
  enhancedUrl: string;
  analysisData: GeminiAnalysisResult;
  originalSize: number;
  enhancedSize: number;
  processingTime: number;
}

/**
 * Production-ready Gemini service for photo enhancement
 * NO SHARP DEPENDENCY - serverless compatible
 */
export class ProductionGeminiService {
  private genAI: GoogleGenerativeAI;
  private config: ReturnType<typeof getGeminiConfig>;
  
  constructor() {
    if (!APP_CONFIG.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(APP_CONFIG.GOOGLE_AI_API_KEY.trim());
    this.config = getGeminiConfig();
  }
  
  /**
   * Main photo enhancement method - preserves 100% of original functionality
   * while being serverless-optimized
   */
  async enhancePhoto(originalUrl: string): Promise<EnhancementResult> {
    const startTime = Date.now();
    
    try {
      console.log('Starting Gemini enhancement (serverless-optimized)', {
        url: originalUrl,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      });
      
      // Step 1: Download image safely with timeout protection
      const imageData = await this.downloadImageWithTimeout(originalUrl);
      console.log('Image downloaded successfully', {
        size: imageData.size,
        mimeType: imageData.mimeType
      });
      
      // Step 2: Analyze with Gemini (with retry and timeout)
      const analysisData = await this.analyzeWithGeminiRetry(imageData);
      console.log('Gemini analysis completed', {
        confidence: analysisData.confidence,
        processingTime: analysisData.processingTime
      });
      
      // Step 3: Process image (NO SHARP - serverless compatible)
      const enhancedBuffer = await this.processImageServerless(imageData, analysisData);
      console.log('Image processing completed', {
        originalSize: imageData.size,
        enhancedSize: enhancedBuffer.length
      });
      
      // Step 4: Upload to Vercel Blob
      const enhancedUrl = await this.uploadToVercelBlob(enhancedBuffer);
      console.log('Enhanced image uploaded', { enhancedUrl });
      
      const totalTime = Date.now() - startTime;
      
      return {
        enhancedUrl,
        analysisData,
        originalSize: imageData.size,
        enhancedSize: enhancedBuffer.length,
        processingTime: totalTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Gemini enhancement failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        url: originalUrl
      });
      throw error;
    }
  }
  
  /**
   * Download image with timeout protection and validation
   */
  private async downloadImageWithTimeout(imageUrl: string) {
    try {
      const resolvedUrl = resolveImageUrl(imageUrl);
      return await downloadImageSafely(imageUrl);
    } catch (error) {
      throw new Error(`Image download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Analyze image with Gemini AI - includes retry mechanism and timeout protection
   */
  private async analyzeWithGeminiRetry(imageData: {
    buffer: Buffer;
    mimeType: string;
    size: number;
  }): Promise<GeminiAnalysisResult> {
    let lastError: Error;
    const analysisStart = Date.now();
    
    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        console.log(`Gemini analysis attempt ${attempt}`, {
          imageSize: imageData.size,
          mimeType: imageData.mimeType
        });
        
        // Initialize Gemini model for analysis (use text model for analysis)
        const model = this.genAI.getGenerativeModel({ 
          model: 'gemini-2.0-flash-exp' // Use text model for analysis
        });
        
        // Prepare analysis prompt
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
        
        // Convert to base64 for Gemini
        const base64Image = imageData.buffer.toString('base64');
        
        // Create Gemini request with timeout
        const geminiRequest = model.generateContent([
          analysisPrompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: imageData.mimeType
            }
          }
        ]);
        
        // Race with timeout
        const result = await Promise.race([
          geminiRequest,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), this.config.timeout)
          )
        ]) as any;
        
        const response = await result.response;
        const analysisText = response.text();
        
        console.log('Gemini response received', {
          attempt,
          responseLength: analysisText.length,
          preview: analysisText.substring(0, 200)
        });
        
        // Parse and validate response
        const analysisData = this.parseGeminiResponse(analysisText);
        analysisData.processingTime = Date.now() - analysisStart;
        
        return analysisData;
        
      } catch (error) {
        lastError = error as Error;
        
        console.warn(`Gemini analysis attempt ${attempt} failed`, {
          error: lastError.message,
          attempt,
          willRetry: attempt <= this.config.maxRetries
        });
        
        if (attempt <= this.config.maxRetries) {
          // Exponential backoff with jitter
          const baseDelay = APP_CONFIG.RETRY_CONFIG.BASE_DELAY;
          const backoffDelay = Math.pow(APP_CONFIG.RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
          const jitter = Math.random() * 500; // Add randomness
          const delay = baseDelay * backoffDelay + jitter;
          
          console.log(`Waiting ${Math.round(delay)}ms before retry ${attempt + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Gemini analysis failed after ${this.config.maxRetries + 1} attempts: ${lastError!.message}`);
  }
  
  /**
   * Parse Gemini response and extract enhancement parameters
   */
  private parseGeminiResponse(responseText: string): GeminiAnalysisResult {
    // Default values in case parsing fails
    const defaults: GeminiAnalysisResult = {
      brightness: 55,    // Slightly brighter
      contrast: 60,      // More contrast
      saturation: 55,    // Slightly more saturated
      sharpness: 50,     // No change
      needsColorCorrection: true,
      needsNoiseReduction: true,
      confidence: 75,    // Moderate confidence
      processingTime: 0
    };
    
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[^}]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in Gemini response, using defaults');
        return defaults;
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize values
      return {
        brightness: this.clampValue(parsed.brightness, 0, 100) || defaults.brightness,
        contrast: this.clampValue(parsed.contrast, 0, 100) || defaults.contrast,
        saturation: this.clampValue(parsed.saturation, 0, 100) || defaults.saturation,
        sharpness: this.clampValue(parsed.sharpness, 0, 100) || defaults.sharpness,
        needsColorCorrection: Boolean(parsed.needsColorCorrection ?? defaults.needsColorCorrection),
        needsNoiseReduction: Boolean(parsed.needsNoiseReduction ?? defaults.needsNoiseReduction),
        confidence: this.clampValue(parsed.confidence, 0, 100) || defaults.confidence,
        processingTime: 0 // Will be set by caller
      };
      
    } catch (error) {
      console.warn('Failed to parse Gemini response, using defaults', {
        error: error instanceof Error ? error.message : 'Parse error',
        responsePreview: responseText.substring(0, 200)
      });
      return defaults;
    }
  }
  
  /**
   * Process image using Gemini 2.5 Flash Image (Nano Banana) for actual enhancement
   * Uses Google's state-of-the-art image editing model for professional photo enhancement
   */
  private async processImageServerless(
    imageData: { buffer: Buffer; mimeType: string; size: number },
    analysisData: GeminiAnalysisResult
  ): Promise<Buffer> {
    console.log('Starting Nano Banana (Gemini 2.5 Flash Image) enhancement', {
      analysisData,
      originalSize: imageData.size
    });
    
    try {
      // Use Gemini 2.5 Flash Image (Nano Banana) for image generation and editing
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-image-preview' // Nano Banana - the image editing model
      });
      
      // Enhanced prompt for professional photo recreation
      const enhancementPrompt = `Subject: An exact recreation of a vintage photograph, but with a total professional makeover. Keep the people, their poses, and the entire scene exactly the same. Your task is to make this look like a high-end portrait taken today.

Aesthetic Transformation:

Make the Colors POP: This is the most important part. Get rid of the old, faded colors and create a modern, vibrant, and deeply saturated look. The colors should be rich, full of life, and bold.

Light the Scene Like a Pro: Forget the harsh flash. Use soft, professional lighting that sculpts the subjects and creates depth. Eliminate all glare on glasses and add a bright sparkle in the eyes.

Ultra-Realistic Detail: Render everything in stunning 8K detail. The skin should look natural, not fake or airbrushed. You should be able to see the texture of their clothes and the patterns on the walls with perfect clarity.

Professional Camera Feel: The final image should have the crisp, clear quality of a modern digital camera with a wide dynamic range.

Keep everything exactly the same - just make it look like it was shot today with professional equipment and lighting.`;
      
      // Convert to base64 for Gemini
      const base64Image = imageData.buffer.toString('base64');
      
      // Generate enhanced image
      const result = await Promise.race([
        model.generateContent([
          enhancementPrompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: imageData.mimeType
            }
          }
        ]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Image enhancement timeout')), this.config.timeout)
        )
      ]) as any;
      
      const response = await result.response;
      
      // Check if we got an image back
      const candidates = response.candidates;
      if (candidates && candidates[0] && candidates[0].content) {
        const content = candidates[0].content;
        
        // Look for image data in the response
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            // We got an enhanced image back
            const enhancedImageBase64 = part.inlineData.data;
            const enhancedBuffer = Buffer.from(enhancedImageBase64, 'base64');
            
            console.log('Gemini enhanced image successfully', {
              originalSize: imageData.size,
              enhancedSize: enhancedBuffer.length
            });
            
            return enhancedBuffer;
          }
        }
      }
      
      // If no enhanced image, this is a failure - don't fallback to original
      console.error('Gemini did not return enhanced image - enhancement failed');
      throw new Error('Gemini failed to generate enhanced image - no enhanced content returned');
      
    } catch (error: any) {
      console.error('Gemini image enhancement failed:', error.message);
      // Re-throw the error instead of falling back to original
      throw error;
    }
  }
  
  /**
   * Upload processed image to Vercel Blob storage
   */
  private async uploadToVercelBlob(imageBuffer: Buffer): Promise<string> {
    try {
      const filename = generateSafeFilename(undefined, 'gemini_enhanced');
      
      const blob = await put(filename, imageBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: true
      });
      
      console.log('Image uploaded to Vercel Blob', {
        filename,
        url: blob.url,
        size: imageBuffer.length
      });
      
      return blob.url;
      
    } catch (error) {
      throw new Error(`Blob upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Utility to clamp values within range
   */
  private clampValue(value: number, min: number, max: number): number {
    if (typeof value !== 'number' || isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * Health check method for monitoring
   */
  async healthCheck(): Promise<{ healthy: boolean; version: string; config: any }> {
    try {
      return {
        healthy: Boolean(APP_CONFIG.GOOGLE_AI_API_KEY),
        version: '2.5.0-nano-banana',
        config: {
          analysisModel: 'gemini-2.0-flash-exp',
          imageModel: 'gemini-2.5-flash-image-preview', // Nano Banana
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries,
          sharpEnabled: false // Explicitly disabled for serverless
        }
      };
    } catch (error) {
      return {
        healthy: false,
        version: '2.5.0-nano-banana',
        config: {}
      };
    }
  }
}