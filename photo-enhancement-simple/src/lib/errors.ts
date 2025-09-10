/**
 * Centralized error handling utilities
 */

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR', { field });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHZ_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND', { resource });
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(`${service} service error`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalMessage: originalError?.message
    });
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      400,
      'INSUFFICIENT_CREDITS',
      { required, available }
    );
  }
}

/**
 * Error response formatter for API routes
 */
export function formatErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      context: error.context,
      statusCode: error.statusCode
    };
  }

  if (error instanceof Error) {
    return {
      error: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    };
  }

  return {
    error: 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  };
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const formatted = formatErrorResponse(error);
      throw new AppError(
        formatted.error,
        formatted.statusCode,
        formatted.code,
        formatted.context
      );
    }
  };
}