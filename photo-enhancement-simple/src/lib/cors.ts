/**
 * Unified CORS Handling System
 * Addresses CORS configuration conflicts identified in debugging journey
 */

import { NextResponse } from 'next/server';
import { APP_CONFIG, getBaseUrl } from './config';

/**
 * Centralized CORS headers configuration
 * CRITICAL: Single source of truth for CORS to prevent conflicts
 */
export const CORS_HEADERS = {
  // Origin configuration - environment-aware
  'Access-Control-Allow-Origin': getCorsOrigin(),
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Internal-Service, X-User-Id, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
} as const;

/**
 * Get appropriate CORS origin based on environment
 */
function getCorsOrigin(): string {
  if (APP_CONFIG.IS_PRODUCTION) {
    // Production: Specific domain only
    return APP_CONFIG.PROD_URL;
  }
  
  if (APP_CONFIG.IS_PREVIEW) {
    // Preview: Allow Vercel preview URLs
    return '*'; // Note: Vercel preview domains vary
  }
  
  // Development: localhost:3000 (STANDARDIZED)
  return APP_CONFIG.DEV_URL;
}

/**
 * Create CORS response with standardized headers
 * Replaces all individual CORS implementations throughout the app
 */
export function createCorsResponse(
  data?: any, 
  status: number = 200,
  additionalHeaders?: Record<string, string>
): NextResponse {
  const headers = {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  const responseData = data ? JSON.stringify(data) : null;
  
  return new NextResponse(responseData, {
    status,
    headers
  });
}

/**
 * Handle OPTIONS (preflight) requests consistently
 */
export function handleOptionsRequest(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

/**
 * Create error response with CORS headers
 */
export function createCorsErrorResponse(
  message: string,
  status: number = 500,
  code?: string
): NextResponse {
  return createCorsResponse({
    error: message,
    code,
    timestamp: new Date().toISOString()
  }, status);
}

/**
 * Create success response with CORS headers
 */
export function createCorsSuccessResponse(
  data: any,
  message?: string
): NextResponse {
  return createCorsResponse({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Validate CORS origin for security
 */
export function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Development: Allow localhost variations
  if (APP_CONFIG.IS_DEVELOPMENT) {
    return origin.startsWith('http://localhost:') || 
           origin.startsWith('http://127.0.0.1:');
  }
  
  // Production: Strict origin checking
  if (APP_CONFIG.IS_PRODUCTION) {
    return origin === APP_CONFIG.PROD_URL;
  }
  
  // Preview: More permissive for Vercel previews
  return origin.includes('vercel.app') || origin === APP_CONFIG.PROD_URL;
}

/**
 * Middleware helper to add CORS headers to any response
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * API route wrapper that automatically handles CORS
 */
export function withCors<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const response = await handler(...args);
      return addCorsHeaders(response);
    } catch (error) {
      console.error('API handler error:', error);
      return createCorsErrorResponse(
        error instanceof Error ? error.message : 'Internal server error'
      );
    }
  };
}

/**
 * Check if request is from internal service
 */
export function isInternalServiceRequest(request: Request): boolean {
  const internalHeader = request.headers.get('x-internal-service');
  const validServices = ['upload-service', 'cron-processor', 'legacy-cleanup'];
  
  return Boolean(internalHeader && validServices.includes(internalHeader));
}

/**
 * Create internal service headers for inter-service calls
 */
export function createInternalServiceHeaders(
  service: 'upload-service' | 'cron-processor' | 'legacy-cleanup',
  userId?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-internal-service': service,
    'Content-Type': 'application/json'
  };
  
  if (userId) {
    headers['x-user-id'] = userId;
  }
  
  return headers;
}