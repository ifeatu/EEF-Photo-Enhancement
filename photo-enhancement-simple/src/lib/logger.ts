/**
 * Enhanced structured logging system with correlation IDs and observability
 * 
 * This module provides comprehensive logging with:
 * - Correlation IDs for request tracing
 * - Structured JSON logging with Pino
 * - Upload and enhancement operation tracking
 * - Performance metrics collection
 * - Environment-aware configuration
 * 
 * @example
 * ```typescript
 * import { logger, setCorrelationId } from '@/lib/logger';
 * 
 * // Set correlation ID for request tracing
 * setCorrelationId('req-123');
 * 
 * // Upload operation logging
 * logger.uploadStart('user-123', 'photo.jpg', 1024000);
 * logger.uploadError('user-123', 'photo.jpg', new Error('Upload failed'));
 * 
 * // API request logging
 * logger.apiRequest('POST', '/api/photos/upload', 'user-123', 200, 1500);
 * ```
 * 
 * @module Logger
 */

// import pino from 'pino'; // Temporarily disabled due to Edge Runtime issues
// Use crypto.randomUUID() for Node.js runtime, fallback for Edge Runtime
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Edge Runtime
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Correlation ID context
let correlationContext: { correlationId?: string } = {};

// Generate correlation ID
export function generateCorrelationId(): string {
  return generateUUID();
}

// Set correlation ID for current context
export function setCorrelationId(correlationId: string): void {
  correlationContext.correlationId = correlationId;
}

// Get current correlation ID
export function getCorrelationId(): string | undefined {
  return correlationContext.correlationId;
}

// Clear correlation context
export function clearCorrelationContext(): void {
  correlationContext = {};
}

// Simple console-based logger for Edge Runtime compatibility
const pinoLogger = {
  debug: (obj: any, msg?: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(msg || '', obj);
    }
  },
  info: (obj: any, msg?: string) => {
    console.info(msg || '', obj);
  },
  warn: (obj: any, msg?: string) => {
    console.warn(msg || '', obj);
  },
  error: (obj: any, msg?: string) => {
    console.error(msg || '', obj);
  }
};

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private getBaseContext() {
    return {
      correlationId: getCorrelationId(),
      timestamp: new Date().toISOString()
    };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    pinoLogger.debug({ ...this.getBaseContext(), ...context }, message);
  }

  info(message: string, context?: Record<string, unknown>): void {
    pinoLogger.info({ ...this.getBaseContext(), ...context }, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    pinoLogger.warn({ ...this.getBaseContext(), ...context }, message);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorContext = {
      ...this.getBaseContext(),
      ...context,
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };
    pinoLogger.error(errorContext, message);
  }

  // Upload operation logging
  uploadStart(userId: string, fileName: string, fileSize: number): void {
    this.info('Upload started', {
      operation: 'upload_start',
      userId,
      fileName,
      fileSize,
      metrics: { fileSize }
    });
  }

  uploadSuccess(userId: string, fileName: string, processingTime: number): void {
    this.info('Upload completed successfully', {
      operation: 'upload_success',
      userId,
      fileName,
      processingTime,
      metrics: { processingTime }
    });
  }

  uploadError(userId: string, fileName: string, error: Error, processingTime?: number): void {
    this.error('Upload failed', error, {
      operation: 'upload_error',
      userId,
      fileName,
      processingTime,
      metrics: { processingTime }
    });
  }

  // Enhancement operation logging
  enhancementStart(photoId: string, userId: string): void {
    this.info('Photo enhancement started', {
      operation: 'enhancement_start',
      photoId,
      userId
    });
  }

  enhancementSuccess(photoId: string, userId: string, processingTime: number): void {
    this.info('Photo enhancement completed', {
      operation: 'enhancement_success',
      photoId,
      userId,
      processingTime,
      metrics: { processingTime }
    });
  }

  enhancementError(photoId: string, userId: string, error: Error, processingTime?: number): void {
    this.error('Photo enhancement failed', error, {
      operation: 'enhancement_error',
      photoId,
      userId,
      processingTime,
      metrics: { processingTime }
    });
  }

  // API request logging
  apiRequest(method: string, path: string, userId?: string, statusCode?: number, responseTime?: number): void {
    this.info('API request', {
      operation: 'api_request',
      method,
      path,
      userId,
      statusCode,
      responseTime,
      metrics: { responseTime }
    });
  }

  // Database operation logging
  databaseQuery(query: string, duration: number, success: boolean): void {
    this.info('Database query executed', {
      operation: 'database_query',
      query: query.substring(0, 100), // Truncate long queries
      duration,
      success,
      metrics: { duration }
    });
  }

  // External service logging
  externalServiceCall(service: string, endpoint: string, duration: number, success: boolean, statusCode?: number): void {
    this.info('External service call', {
      operation: 'external_service_call',
      service,
      endpoint,
      duration,
      success,
      statusCode,
      metrics: { duration }
    });
  }
}

export const logger = new Logger();

// Middleware helper for Next.js API routes
export function createLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
    setCorrelationId(correlationId);
    
    // Add correlation ID to response headers
    res.setHeader('x-correlation-id', correlationId);
    
    const startTime = Date.now();
    
    // Log request
    logger.info('Request started', {
      operation: 'request_start',
      method: req.method,
      path: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const responseTime = Date.now() - startTime;
      
      logger.apiRequest(
        req.method,
        req.url,
        req.user?.id,
        res.statusCode,
        responseTime
      );
      
      clearCorrelationContext();
      originalEnd.apply(res, args);
    };
    
    if (next) next();
  };
}