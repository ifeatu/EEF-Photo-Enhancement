import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';

// Initialize Sentry user context
export function setSentryUser(user: { id: string; email?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}

// Clear Sentry user context
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Set operation context
export function setSentryContext(operation: string, data?: Record<string, any>) {
  Sentry.setContext('operation', {
    name: operation,
    ...data,
  });
}

// Capture error with enhanced context
export function captureError(error: Error, context?: {
  operation?: string;
  userId?: string;
  correlationId?: string;
  extra?: Record<string, any>;
}) {
  // Log the error first
  logger.error('Error captured by Sentry', error, context);
  
  // Set Sentry context
  if (context?.operation) {
    setSentryContext(context.operation, context.extra);
  }
  
  if (context?.userId) {
    Sentry.setTag('userId', context.userId);
  }
  
  if (context?.correlationId) {
    Sentry.setTag('correlationId', context.correlationId);
  }
  
  // Capture the error
  return Sentry.captureException(error);
}

// Capture upload-specific errors
export function captureUploadError(error: Error, context: {
  userId: string;
  fileName: string;
  fileSize?: number;
  processingTime?: number;
  correlationId?: string;
}) {
  return captureError(error, {
    operation: 'upload_error',
    userId: context.userId,
    correlationId: context.correlationId,
    extra: {
      fileName: context.fileName,
      fileSize: context.fileSize,
      processingTime: context.processingTime,
    },
  });
}

// Capture enhancement-specific errors
export function captureEnhancementError(error: Error, context: {
  userId: string;
  photoId: string;
  processingTime?: number;
  correlationId?: string;
}) {
  return captureError(error, {
    operation: 'enhancement_error',
    userId: context.userId,
    correlationId: context.correlationId,
    extra: {
      photoId: context.photoId,
      processingTime: context.processingTime,
    },
  });
}

// Capture API errors
export function captureAPIError(error: Error, context: {
  method: string;
  path: string;
  userId?: string;
  statusCode?: number;
  correlationId?: string;
}) {
  return captureError(error, {
    operation: 'api_error',
    userId: context.userId,
    correlationId: context.correlationId,
    extra: {
      method: context.method,
      path: context.path,
      statusCode: context.statusCode,
    },
  });
}

// Capture database errors
export function captureDatabaseError(error: Error, context: {
  query?: string;
  operation: string;
  correlationId?: string;
}) {
  return captureError(error, {
    operation: 'database_error',
    correlationId: context.correlationId,
    extra: {
      query: context.query?.substring(0, 100), // Truncate long queries
      dbOperation: context.operation,
    },
  });
}

// Capture external service errors
export function captureExternalServiceError(error: Error, context: {
  service: string;
  endpoint: string;
  statusCode?: number;
  correlationId?: string;
}) {
  return captureError(error, {
    operation: 'external_service_error',
    correlationId: context.correlationId,
    extra: {
      service: context.service,
      endpoint: context.endpoint,
      statusCode: context.statusCode,
    },
  });
}

// Performance monitoring
export function startTransaction(name: string, operation: string) {
  return Sentry.startSpan({
    name,
    op: operation,
  }, () => {
    // Return a span that can be used for timing
    return {
      finish: () => {}, // No-op for compatibility
    };
  });
}

// Add breadcrumb for debugging
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

// Flush Sentry events (useful for serverless)
export async function flushSentry(timeout = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}