/**
 * Image processing and optimization utilities
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    size: number;
    type: string;
    dimensions?: { width: number; height: number };
  };
}

export const IMAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MIN_FILE_SIZE: 1024, // 1KB
  SUPPORTED_FORMATS: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ],
  MAX_DIMENSIONS: 4096, // 4K resolution
  MIN_DIMENSIONS: 100,
  COMPRESSION_QUALITY: 0.85
};

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check file size
  if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${IMAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  if (file.size < IMAGE_CONFIG.MIN_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too small. Minimum size is 1KB'
    };
  }

  // Check file type
  if (!IMAGE_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported format. Supported formats: ${IMAGE_CONFIG.SUPPORTED_FORMATS.join(', ')}`
    };
  }

  return {
    valid: true,
    metadata: {
      size: file.size,
      type: file.type
    }
  };
}

/**
 * Get image dimensions from file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(file: File): Promise<ImageValidationResult> {
  try {
    const dimensions = await getImageDimensions(file);
    
    if (dimensions.width > IMAGE_CONFIG.MAX_DIMENSIONS || dimensions.height > IMAGE_CONFIG.MAX_DIMENSIONS) {
      return {
        valid: false,
        error: `Image too large. Maximum dimensions: ${IMAGE_CONFIG.MAX_DIMENSIONS}x${IMAGE_CONFIG.MAX_DIMENSIONS}px`
      };
    }

    if (dimensions.width < IMAGE_CONFIG.MIN_DIMENSIONS || dimensions.height < IMAGE_CONFIG.MIN_DIMENSIONS) {
      return {
        valid: false,
        error: `Image too small. Minimum dimensions: ${IMAGE_CONFIG.MIN_DIMENSIONS}x${IMAGE_CONFIG.MIN_DIMENSIONS}px`
      };
    }

    return {
      valid: true,
      metadata: {
        size: file.size,
        type: file.type,
        dimensions
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to validate image dimensions'
    };
  }
}

/**
 * Compress image file for upload
 */
export function compressImage(file: File, quality = IMAGE_CONFIG.COMPRESSION_QUALITY): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image on canvas
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }

      // Convert to blob with compression
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }

        // Create new file
        const compressedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now()
        });

        resolve(compressedFile);
      }, file.type, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

/**
 * Generate image preview URL
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate optimized filename
 */
export function generateOptimizedFilename(originalName: string, suffix = ''): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'jpg';
  const baseName = originalName.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  return `${baseName}${suffix}-${timestamp}-${randomId}.${extension}`;
}