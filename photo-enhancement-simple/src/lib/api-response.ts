/**
 * Standardized API response utilities
 */

import { NextResponse } from 'next/server';
import { AppError, formatErrorResponse } from './errors';
import { logger } from './logger';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    context?: Record<string, unknown>;
  };
  timestamp: string;
}

/**
 * Create successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Create error API response
 */
export function createErrorResponse(
  error: unknown,
  statusCode?: number
): NextResponse {
  const formatted = formatErrorResponse(error);
  const finalStatusCode = statusCode || formatted.statusCode;

  const response: ApiResponse = {
    success: false,
    error: {
      message: formatted.error,
      code: formatted.code,
      context: formatted.context
    },
    timestamp: new Date().toISOString()
  };

  // Log error for monitoring
  if (error instanceof Error) {
    logger.error(`API Error: ${formatted.error}`, error, formatted.context);
  } else {
    logger.error(`API Error: ${formatted.error}`, undefined, formatted.context);
  }

  return NextResponse.json(response, { status: finalStatusCode });
}

/**
 * API route wrapper with consistent error handling
 */
export function withApiHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

/**
 * Validation helper for API routes
 */
export function validateRequest<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  errorMessage: string = 'Invalid request data'
): T {
  if (!validator(data)) {
    throw new AppError(errorMessage, 400, 'VALIDATION_ERROR');
  }
  return data;
}

/**
 * Type guard for checking if data has required fields
 */
export function hasRequiredFields<T extends Record<string, unknown>>(
  data: unknown,
  fields: (keyof T)[]
): data is T {
  if (!data || typeof data !== 'object') return false;
  
  return fields.every(field => 
    Object.prototype.hasOwnProperty.call(data, field)
  );
}