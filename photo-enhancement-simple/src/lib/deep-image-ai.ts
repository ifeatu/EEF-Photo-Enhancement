/**
 * Deep-Image.ai API client for photo enhancement
 * Replaces the non-functional Gemini image generation approach
 */

interface DeepImageResponse {
  status: 'completed' | 'processing' | 'failed';
  url?: string;
  hash?: string;
  error?: string;
}

interface EnhancementOptions {
  width?: number;
  height?: number;
  enhancements?: string[];
  output_format?: 'jpg' | 'png' | 'webp';
  quality?: number;
}

export class DeepImageAI {
  private apiKey: string;
  private baseUrl = 'https://deep-image.ai/rest_api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Enhance an image using Deep-Image.ai API
   * @param imageUrl - URL of the image to enhance
   * @param options - Enhancement options
   * @returns Promise with enhanced image URL
   */
  async enhanceImage(imageUrl: string, options: EnhancementOptions = {}): Promise<string> {
    const defaultOptions: EnhancementOptions = {
      enhancements: ['denoise', 'light', 'color', 'deblur'],
      width: 2048, // Upscale to 2K for better quality
      output_format: 'jpg',
      quality: 90
    };

    const enhancementParams = { ...defaultOptions, ...options };

    try {
      // First try the quick process_result endpoint (returns immediately if < 25s)
      const response = await fetch(`${this.baseUrl}/process_result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey
        },
        body: JSON.stringify({
          url: imageUrl,
          ...enhancementParams
        })
      });

      if (!response.ok) {
        throw new Error(`Deep-Image.ai API error: ${response.status} ${response.statusText}`);
      }

      const result: DeepImageResponse = await response.json();

      if (result.status === 'completed' && result.url) {
        return result.url;
      }

      // If processing takes longer, we get a hash and need to poll for results
      if (result.status === 'processing' && result.hash) {
        return await this.pollForResult(result.hash);
      }

      throw new Error(`Enhancement failed: ${result.error || 'Unknown error'}`);
    } catch (error) {
      console.error('Deep-Image.ai enhancement error:', error);
      throw error;
    }
  }

  /**
   * Poll for processing results when enhancement takes longer than 25 seconds
   */
  private async pollForResult(hash: string, maxAttempts = 30): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/result/${hash}`, {
          method: 'GET',
          headers: {
            'X-API-KEY': this.apiKey
          }
        });

        if (!response.ok) {
          throw new Error(`Result polling error: ${response.status}`);
        }

        const result: DeepImageResponse = await response.json();

        if (result.status === 'completed' && result.url) {
          return result.url;
        }

        if (result.status === 'failed') {
          throw new Error(`Enhancement failed: ${result.error || 'Processing failed'}`);
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Polling attempt ${attempt + 1} failed:`, error);
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error('Enhancement timed out after maximum polling attempts');
  }

  /**
   * Test the API connection and get account info
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        method: 'GET',
        headers: {
          'X-API-KEY': this.apiKey
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Deep-Image.ai connection test failed:', error);
      return false;
    }
  }
}

/**
 * Create a Deep-Image.ai client instance
 */
export function createDeepImageClient(): DeepImageAI {
  const apiKey = process.env.DEEP_IMAGE_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEP_IMAGE_API_KEY environment variable is required');
  }

  return new DeepImageAI(apiKey);
}