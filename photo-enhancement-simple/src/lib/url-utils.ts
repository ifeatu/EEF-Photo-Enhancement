/**
 * URL Utilities - Consistent URL handling across environments
 * Addresses critical image URL resolution issues from debugging journey
 */

import { APP_CONFIG, getBaseUrl } from './config';

/**
 * Resolve image URLs consistently across dev/prod environments
 * CRITICAL: Fixes the localhost:3001 vs 3000 URL resolution issues
 */
export function resolveImageUrl(imageUrl: string): string {
  // Handle null/undefined
  if (!imageUrl) {
    throw new Error('Image URL is required');
  }
  
  // Absolute URLs (Vercel Blob, CDN) pass through unchanged
  if (imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Handle relative URLs - convert to full URLs using correct base
  if (imageUrl.startsWith('/')) {
    const baseUrl = getBaseUrl();
    return `${baseUrl}${imageUrl}`;
  }
  
  // Handle protocol-relative URLs
  if (imageUrl.startsWith('//')) {
    const protocol = APP_CONFIG.IS_PRODUCTION ? 'https:' : 'http:';
    return `${protocol}${imageUrl}`;
  }
  
  // If it's already a relative path without leading slash, add it
  return `${getBaseUrl()}/${imageUrl}`;
}

/**
 * Validate URL accessibility and format
 * Prevents the image processing failures from the debugging journey
 */
export async function validateImageUrl(imageUrl: string): Promise<{
  valid: boolean;
  error?: string;
  mimeType?: string;
  size?: number;
}> {
  try {
    const resolvedUrl = resolveImageUrl(imageUrl);
    
    // Use HEAD request to check accessibility without downloading
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(), 
      APP_CONFIG.SERVERLESS_TIMEOUTS.IMAGE_DOWNLOAD
    );
    
    try {
      const response = await fetch(resolvedUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'PhotoEnhance/2.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return {
          valid: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      const mimeType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength, 10) : undefined;
      
      // Validate format
      if (!APP_CONFIG.LIMITS.SUPPORTED_FORMATS.includes(mimeType as any)) {
        return {
          valid: false,
          error: `Unsupported format: ${mimeType}. Supported: ${APP_CONFIG.LIMITS.SUPPORTED_FORMATS.join(', ')}`
        };
      }
      
      // Validate size
      if (size && size > APP_CONFIG.LIMITS.MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File too large: ${size} bytes. Max: ${APP_CONFIG.LIMITS.MAX_FILE_SIZE} bytes`
        };
      }
      
      return {
        valid: true,
        mimeType,
        size
      };
      
    } finally {
      clearTimeout(timeoutId);
    }
    
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

/**
 * Download image with proper error handling and timeouts
 * Addresses the memory and timeout issues from the debugging journey
 */
export async function downloadImageSafely(imageUrl: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  size: number;
}> {
  const resolvedUrl = resolveImageUrl(imageUrl);
  
  // Validate first to avoid downloading invalid images
  const validation = await validateImageUrl(imageUrl);
  if (!validation.valid) {
    throw new Error(`Image validation failed: ${validation.error}`);
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    APP_CONFIG.SERVERLESS_TIMEOUTS.IMAGE_DOWNLOAD
  );
  
  try {
    const response = await fetch(resolvedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PhotoEnhance/2.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    // Final size check after download
    if (buffer.length > APP_CONFIG.LIMITS.MAX_FILE_SIZE) {
      throw new Error(`Downloaded image too large: ${buffer.length} bytes`);
    }
    
    // Memory usage warning
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed + buffer.length > APP_CONFIG.LIMITS.MAX_MEMORY_USAGE) {
      console.warn('High memory usage detected', {
        heapUsed: memoryUsage.heapUsed,
        imageSize: buffer.length,
        total: memoryUsage.heapUsed + buffer.length
      });
    }
    
    return {
      buffer,
      mimeType,
      size: buffer.length
    };
    
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate safe filenames for uploads
 */
export function generateSafeFilename(originalName?: string, prefix = 'enhanced'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  if (originalName) {
    const ext = originalName.split('.').pop() || 'jpg';
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${prefix}_${timestamp}_${random}_${safeName}`;
  }
  
  return `${prefix}_${timestamp}_${random}.jpg`;
}

/**
 * Check if URL is a Vercel Blob URL
 */
export function isVercelBlobUrl(url: string): boolean {
  return url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com');
}

/**
 * Get the appropriate Next.js Image src for optimization
 */
export function getOptimizedImageSrc(imageUrl: string): string {
  // Vercel Blob URLs can be optimized by Next.js
  if (isVercelBlobUrl(imageUrl)) {
    return imageUrl;
  }
  
  // Local images need proper resolution
  return resolveImageUrl(imageUrl);
}