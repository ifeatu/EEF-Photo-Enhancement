import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { put } from '@vercel/blob';
import type { Session } from 'next-auth';
import { logger, generateCorrelationId, setCorrelationId } from '@/lib/logger';
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
import { EnhancementMetrics } from '@/lib/metrics';
import { addBreadcrumb, captureEnhancementError } from '@/lib/sentry';
import { alertManager } from '@/lib/alerting';
import { tracer } from '@/lib/tracing';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

// Initialize Gemini AI (dynamic import for Vercel compatibility)
async function getGeminiModel() {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required');
  }
  
  // Dynamic import to avoid build-time evaluation issues on Vercel
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY.trim());
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
}

// Configuration constants
const ENHANCEMENT_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  TIMEOUT_MS: 8000, // 8 seconds (Vercel hobby plan limit is 10s)
  GEMINI_TIMEOUT: 6000, // 6 seconds for Gemini API
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

// Enhance photo using Gemini AI
async function enhancePhotoWithAI(photoUrl: string): Promise<string> {
  logger.info('Starting Gemini AI enhancement', { photoUrl });
  
  try {
    // Download and convert image to base64
    const imageResponse = await fetch(photoUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    logger.info('Image converted to base64', { size: base64Image.length });
    
    // Initialize Gemini with proper error handling
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Use Gemini for image analysis and enhancement suggestions
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
    
    logger.info('Sending analysis request to Gemini...');
    
    const geminiPromise = model.generateContent([
      analysisPrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
    ]);
    
    const analysisResult = await Promise.race([
      geminiPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), ENHANCEMENT_CONFIG.GEMINI_TIMEOUT)
      )
    ]) as any;
    
    const analysisResponse = await analysisResult.response;
    const analysisText = analysisResponse.text();
    
    logger.info('Gemini analysis completed', { analysisPreview: analysisText.substring(0, 200) + '...' });
    
    // Parse enhancement parameters from Gemini's analysis
    let enhancementParams = {
      brightness: 1.1,
      contrast: 1.1,
      saturation: 1.1,
      sharpness: 1.0,
      needsColorCorrection: true,
      needsNoiseReduction: true
    };
    
    try {
      // Try to extract JSON from Gemini's response
      const jsonMatch = analysisText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        enhancementParams = {
          brightness: 1 + (parsed.brightness - 50) / 100,
          contrast: 1 + (parsed.contrast - 50) / 100,
          saturation: 1 + (parsed.saturation - 50) / 100,
          sharpness: 1 + (parsed.sharpness - 50) / 100,
          needsColorCorrection: parsed.needsColorCorrection || false,
          needsNoiseReduction: parsed.needsNoiseReduction || false
        };
      }
    } catch (parseError) {
      logger.warn('Could not parse Gemini analysis, using default enhancements', { parseError });
    }
    
    // Apply image enhancements using Sharp (optimized for memory)
    const sharp = (await import('sharp')).default;
    let enhancedBuffer = sharp(Buffer.from(imageBuffer), { 
      limitInputPixels: 268402689, // ~16k x 16k max
      sequentialRead: true 
    });
    
    // Resize if image is too large (memory optimization)
    const metadata = await enhancedBuffer.metadata();
    if (metadata.width && metadata.height && metadata.width * metadata.height > 4000000) {
      const maxDimension = 2000;
      enhancedBuffer = enhancedBuffer.resize(maxDimension, maxDimension, { 
        fit: 'inside', 
        withoutEnlargement: true 
      });
    }
    
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
      .jpeg({ quality: 85, progressive: true, mozjpeg: true })
      .toBuffer();
    
    // Upload enhanced image
    const timestamp = Date.now();
    const filename = `enhanced_${timestamp}.jpg`;
    
    const blob = await put(filename, processedImageBuffer, {
      access: 'public',
      contentType: 'image/jpeg'
    });
    
    logger.info('Gemini AI enhancement completed', { 
      originalUrl: photoUrl, 
      enhancedUrl: blob.url,
      originalSize: imageBuffer.byteLength,
      enhancedSize: processedImageBuffer.byteLength,
      enhancementParams,
      analysisLength: analysisText.length 
    });
    
    return blob.url;
    
  } catch (error) {
    logger.error('Gemini AI enhancement failed', error as Error, { photoUrl });
    
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
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  setCorrelationId(correlationId);
  
  const trace = tracer.startTrace('photo-enhancement', {
    operation: 'enhance_photo',
    correlationId
  });
  
  addBreadcrumb('Enhancement request started', 'enhancement');
  
  let userId: string;
  
  // Check if this is an internal service call from cron or upload service
  const internalServiceHeader = request.headers.get('x-internal-service');
  const isInternalService = internalServiceHeader === 'cron-processor' || internalServiceHeader === 'upload-service' || internalServiceHeader === 'legacy-cleanup';
  
  addBreadcrumb(`Enhancement request type: ${isInternalService ? 'internal' : 'external'}`, 'enhancement', { internalServiceHeader });
  
  if (isInternalService) {
    // For internal service calls, get userId from header or from photo record
    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader) {
      userId = userIdHeader;
    } else {
      // If no user ID header, we'll get it from the photo record after validation
      userId = 'temp'; // Temporary value, will be replaced below
    }
  } else {
    // Authenticate user using standardized auth for regular requests
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.user) {
      throw new AuthenticationError();
    }
    userId = authResult.user.id;
  }

  // Validate request body
  const body = await request.json();
  const { photoId } = validateRequest(body, isValidEnhanceRequest, 'Photo ID is required');

  // For upload service calls, we need to get the userId from the photo record first
  if (isInternalService && userId === 'temp') {
    const photoForUserId = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { userId: true }
    });
    
    if (!photoForUserId) {
      throw new NotFoundError('Photo not found');
    }
    
    userId = photoForUserId.userId;
  }

  addBreadcrumb('Looking up photo in database', 'database', { photoId, userId });
  
  // Create span for photo validation
  const validationSpan = trace.createSpan('photo-validation', {
    operation: 'validate_photo_access',
    photoId,
    userId
  });
  
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
    validationSpan.addTag('error', 'true');
      validationSpan.error(new Error('Photo not found'));
    validationSpan.finish();
    
    const processingTime = Date.now() - startTime;
    const notFoundError = new Error('Photo not found');
    logger.enhancementError(photoId, userId, notFoundError, processingTime);
    addBreadcrumb('Photo not found in database', 'error', { photoId, userId });
    
    trace.finish();
    throw new NotFoundError('Photo');
  }

  validationSpan.finish();
  
  addBreadcrumb('Photo found, starting enhancement', 'enhancement', { photoId, status: photo.status });
  logger.enhancementStart(photoId, userId);
  EnhancementMetrics.recordEnhancementStart(photoId, userId);

  addBreadcrumb('Updating photo status to PROCESSING', 'database', { photoId });
  
  // Update status to processing
  await prisma.photo.update({
    where: { id: photoId },
    data: { 
      status: 'PROCESSING',
      updatedAt: new Date()
    }
  });

  try {
    addBreadcrumb('Starting AI enhancement with retry mechanism', 'enhancement', { 
      maxRetries: ENHANCEMENT_CONFIG.MAX_RETRIES,
      originalUrl: photo.originalUrl 
    });
    
    // Create span for AI enhancement
    const enhancementSpan = trace.createSpan('ai-enhancement', {
      operation: 'enhance_with_ai',
      photoId,
      originalUrl: photo.originalUrl
    });
    
    // Enhance the photo with retry mechanism and timeout
    let enhancedUrl: string;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= ENHANCEMENT_CONFIG.MAX_RETRIES + 1; attempt++) {
      try {
        addBreadcrumb(`Enhancement attempt ${attempt}`, 'enhancement', { attempt, photoId });
        
        // Wrap enhancement with timeout
        enhancedUrl = await Promise.race([
          enhancePhotoWithAI(photo.originalUrl),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Enhancement timeout')), ENHANCEMENT_CONFIG.TIMEOUT_MS)
          )
        ]);
        
        addBreadcrumb(`Enhancement attempt ${attempt} succeeded`, 'enhancement', { attempt, photoId });
        enhancementSpan.addTag('attempts', attempt.toString());
         enhancementSpan.addTag('success', 'true');
        break;
      } catch (error) {
        lastError = error as Error;
        
        addBreadcrumb(`Enhancement attempt ${attempt} failed`, 'error', { 
          attempt, 
          photoId, 
          error: lastError.message 
        });
        
        if (attempt <= ENHANCEMENT_CONFIG.MAX_RETRIES) {
          logger.warn(`Enhancement attempt ${attempt} failed, retrying`, { 
            photoId, 
            error: lastError.message,
            attempt 
          });
          
          // For timeout errors, use shorter delays
          const isTimeout = lastError.message.includes('timeout');
          const delay = isTimeout ? 500 : Math.pow(2, attempt) * 1000;
          
          addBreadcrumb(`Waiting ${delay}ms before retry`, 'enhancement', { 
            attempt, 
            photoId, 
            delay,
            isTimeout 
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          enhancementSpan.addTag('error', 'true');
           enhancementSpan.error(lastError);
          throw lastError;
        }
      }
    }

    enhancementSpan.finish();
    
    addBreadcrumb('Validating enhanced URL', 'validation', { enhancedUrl: enhancedUrl! });
    
    // Create span for URL validation
    const urlValidationSpan = trace.createSpan('url-validation', {
      operation: 'validate_enhanced_url',
      enhancedUrl: enhancedUrl!
    });
    
    // Validate enhanced URL before saving
    const isValidUrl = await validateEnhancedUrl(enhancedUrl!);
    if (!isValidUrl) {
      urlValidationSpan.addTag('error', 'true');
       urlValidationSpan.error(new Error('Enhanced URL validation failed'));
      urlValidationSpan.finish();
      
      addBreadcrumb('Enhanced URL validation failed', 'error', { enhancedUrl: enhancedUrl! });
      trace.finish();
      throw new AppError('Enhanced image URL is not accessible', 500, 'INVALID_ENHANCED_URL');
    }
    
    urlValidationSpan.finish();

    addBreadcrumb('Enhanced URL validated, updating database', 'database', { enhancedUrl: enhancedUrl! });
    
    // Create span for database update
    const dbUpdateSpan = trace.createSpan('database-update', {
      operation: 'update_photo_status',
      photoId,
      status: 'COMPLETED'
    });
    
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
    
    dbUpdateSpan.finish();

    const processingTime = Date.now() - startTime;
    
    addBreadcrumb('Enhancement completed successfully', 'success', { 
      photoId, 
      processingTime,
      enhancedUrl: updatedPhoto.enhancedUrl 
    });
    
    logger.enhancementSuccess(photoId, userId, processingTime);
    EnhancementMetrics.recordEnhancementSuccess(photoId, userId, processingTime);

    logger.info('Photo enhancement completed successfully', { 
      photoId, 
      userId,
      enhancedUrl: updatedPhoto.enhancedUrl,
      processingTime
    });

    trace.addMetadata('success', true);
     trace.addMetadata('processing_time_ms', processingTime);
    trace.finish();

    return createSuccessResponse({
      photoId: updatedPhoto.id,
      enhancedUrl: updatedPhoto.enhancedUrl,
      status: 'COMPLETED',
      completedAt: updatedPhoto.updatedAt
    });

  } catch (enhancementError) {
    const processingTime = Date.now() - startTime;
    const error = enhancementError as Error;
    
    addBreadcrumb('Enhancement failed after all retries', 'error', { 
      photoId, 
      userId,
      processingTime,
      error: error.message 
    });
    
    logger.enhancementError(photoId, userId, error, processingTime);
     EnhancementMetrics.recordEnhancementError(photoId, userId, error, processingTime);
     captureEnhancementError(error, { photoId, userId, processingTime });
     
     // Record error for alerting and report if critical
     alertManager.recordEnhancementError();
     if (error instanceof Error && (error.message.includes('database') || error.message.includes('Gemini'))) {
       await alertManager.reportCriticalError(error, {
         userId,
         photoId,
         correlationId,
         endpoint: '/api/photos/enhance'
       });
     }
    
    logger.error('Enhancement failed after all retries', error, { 
      photoId, 
      userId,
      processingTime
    });
    
    addBreadcrumb('Updating photo status to FAILED', 'database', { photoId });
    
    // Create span for failure database update
    const failureUpdateSpan = trace.createSpan('database-update-failure', {
      operation: 'update_photo_status',
      photoId,
      status: 'FAILED'
    });
    
    // Update status to failed
    await prisma.photo.update({
      where: { id: photoId },
      data: { 
        status: 'FAILED',
        updatedAt: new Date()
      }
    });
    
    failureUpdateSpan.finish();
    
    trace.addMetadata('error', true);
     trace.error(error);
     trace.addMetadata('processing_time_ms', processingTime);
    trace.finish();
    
    // Re-throw to be handled by error wrapper
    throw enhancementError;
  }
});