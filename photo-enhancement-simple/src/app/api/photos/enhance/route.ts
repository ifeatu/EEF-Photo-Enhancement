import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// Dynamic import for Google AI to avoid build-time evaluation
import { put } from '@vercel/blob';
import type { Session } from 'next-auth';
import { logger } from '@/lib/logger';
import { 
  AppError, 
  NotFoundError, 
  ExternalServiceError,
  AuthenticationError 
} from '@/lib/errors';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withApiHandler,
  validateRequest,
  hasRequiredFields 
} from '@/lib/api-response';

// Initialize Gemini AI with Nano Banana model (dynamic import for Vercel compatibility)
async function getGeminiModel() {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required');
  }
  
  // Dynamic import to avoid build-time evaluation issues on Vercel
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY.trim());
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
}

// Configuration constants
const ENHANCEMENT_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  TIMEOUT_MS: 300000, // 5 minutes
  MAX_RETRIES: 2
};

// Convert image URL to base64 with validation
async function getImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  try {
    // Convert relative URLs to full URLs
    let fullImageUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
      fullImageUrl = `${baseUrl}${imageUrl}`;
      logger.info('Converting relative URL to full URL', { original: imageUrl, full: fullImageUrl });
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ENHANCEMENT_CONFIG.TIMEOUT_MS);
    
    const response = await fetch(fullImageUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'PhotoEnhance/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new ExternalServiceError('Image fetch', new Error(`HTTP ${response.status}: ${response.statusText}`));
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!ENHANCEMENT_CONFIG.SUPPORTED_FORMATS.includes(contentType)) {
      throw new AppError(`Unsupported image format: ${contentType}`, 400, 'UNSUPPORTED_FORMAT');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength > ENHANCEMENT_CONFIG.MAX_FILE_SIZE) {
      throw new AppError(`Image too large: ${arrayBuffer.byteLength} bytes`, 413, 'FILE_TOO_LARGE');
    }
    
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    return {
      data: base64,
      mimeType: contentType
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ExternalServiceError('Image processing', error as Error);
  }
}

// Validate enhanced URL accessibility
export async function validateEnhancedUrl(url: string): Promise<boolean> {
  try {
    // Check if it's a valid Vercel Blob URL
    if (url.startsWith('https://') && url.includes('vercel-storage.com')) {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    }
    
    // Check if it's a local file that exists
    if (url.startsWith('/uploads/')) {
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.join(process.cwd(), 'public', url);
      return fs.existsSync(fullPath);
    }
    
    return false;
  } catch (error) {
    logger.warn('Enhanced URL validation failed', { url, error });
    return false;
  }
}

// Enhance photo using Nano Banana (Gemini 2.5 Flash Image)
async function enhancePhotoWithAI(photoUrl: string): Promise<string> {
  logger.info('Starting Nano Banana enhancement', { photoUrl });
  
  try {
    // Get image as base64 with validation
    const { data: imageBase64, mimeType } = await getImageAsBase64(photoUrl);
    
    // Create professional enhancement prompt
    const prompt = `Subject: An exact recreation of a vintage photograph, but with a total professional makeover. Keep the people, their poses, and the entire scene exactly the same. Your task is to make this look like a high-end portrait taken today.
    
    Aesthetic Transformation:
    
    Make the Colors POP: This is the most important part. Get rid of the old, faded colors and create a modern, vibrant, and deeply saturated look. The colors should be rich, full of life, and bold.
    
    Light the Scene Like a Pro: Forget the harsh flash. Use soft, professional lighting that sculpts the subjects and creates depth. Eliminate all glare on glasses and add a bright sparkle in the eyes.
    
    Ultra-Realistic Detail: Render everything in stunning 8K detail. The skin should look natural, not fake or airbrushed. You should be able to see the texture of their clothes and the patterns on the walls with perfect clarity.
    
    Professional Camera Feel: The final image should have the crisp, clear quality of a modern digital camera with a wide dynamic range.`;
    
    // Generate enhanced image with Nano Banana
    const model = await getGeminiModel();
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType
        }
      }
    ]);
    
    // Extract enhanced image from response
    const candidate = result.response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error('No enhanced image generated by Nano Banana');
    }
    
    // Find the image part in the response
    let enhancedImageData = null;
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        enhancedImageData = part.inlineData.data;
        break;
      }
    }
    
    if (!enhancedImageData) {
      throw new Error('No image data found in Nano Banana response');
    }
    
    // Upload enhanced image to Vercel Blob
    const timestamp = Date.now();
    const filename = `enhanced_${timestamp}.png`;
    const imageBuffer = Buffer.from(enhancedImageData, 'base64');
    
    const blob = await put(filename, imageBuffer, {
      access: 'public',
      contentType: 'image/png'
    });
    
    logger.info('Nano Banana enhancement completed', { 
      originalUrl: photoUrl, 
      enhancedUrl: blob.url,
      fileSize: imageBuffer.length 
    });
    
    return blob.url;
    
  } catch (error) {
    logger.error('Nano Banana enhancement failed', error as Error, { photoUrl });
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError('AI Enhancement', error as Error);
  }
}

// Request body validation
interface EnhanceRequest extends Record<string, unknown> {
  photoId: string;
}

function isValidEnhanceRequest(data: unknown): data is EnhanceRequest {
  return hasRequiredFields<EnhanceRequest>(data, ['photoId']);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  // Authenticate user
  const session = await getServerSession(authOptions) as Session | null;
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  
  const userId = session.user.id;

  // Validate request body
  const body = await request.json();
  const { photoId } = validateRequest(body, isValidEnhanceRequest, 'Photo ID is required');

  // Get photo from database with proper error handling
  // Allow both PENDING and FAILED photos for retry functionality
  const photo = await prisma.photo.findFirst({
    where: {
      id: photoId,
      userId,
      status: {
        in: ['PENDING', 'FAILED']
      }
    },
    select: {
      id: true,
      originalUrl: true,
      status: true,
      createdAt: true
    }
  });

  if (!photo) {
    throw new NotFoundError('Photo');
  }

  logger.info('Starting photo enhancement', { photoId, userId });

  // Update status to processing
  await prisma.photo.update({
    where: { id: photoId },
    data: { 
      status: 'PROCESSING',
      updatedAt: new Date()
    }
  });

  try {
    // Enhance the photo with retry mechanism
    let enhancedUrl: string;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= ENHANCEMENT_CONFIG.MAX_RETRIES + 1; attempt++) {
      try {
        enhancedUrl = await enhancePhotoWithAI(photo.originalUrl);
        break;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= ENHANCEMENT_CONFIG.MAX_RETRIES) {
          logger.warn(`Enhancement attempt ${attempt} failed, retrying`, { 
            photoId, 
            error: lastError.message,
            attempt 
          });
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          throw lastError;
        }
      }
    }

    // Validate enhanced URL before saving
    const isValidUrl = await validateEnhancedUrl(enhancedUrl!);
    if (!isValidUrl) {
      throw new AppError('Enhanced image URL is not accessible', 500, 'INVALID_ENHANCED_URL');
    }

    // Update with enhanced result
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        enhancedUrl: enhancedUrl!,
        status: 'COMPLETED',
        updatedAt: new Date()
      },
      select: {
        id: true,
        enhancedUrl: true,
        status: true,
        updatedAt: true
      }
    });

    logger.info('Photo enhancement completed successfully', { 
      photoId, 
      userId,
      enhancedUrl: updatedPhoto.enhancedUrl 
    });

    return createSuccessResponse({
      photoId: updatedPhoto.id,
      enhancedUrl: updatedPhoto.enhancedUrl,
      status: 'COMPLETED',
      completedAt: updatedPhoto.updatedAt
    });

  } catch (enhancementError) {
    logger.error('Enhancement failed after all retries', enhancementError as Error, { 
      photoId, 
      userId 
    });
    
    // Update status to failed
    await prisma.photo.update({
      where: { id: photoId },
      data: { 
        status: 'FAILED',
        updatedAt: new Date()
      }
    });
    
    // Re-throw to be handled by error wrapper
    throw enhancementError;
  }
});