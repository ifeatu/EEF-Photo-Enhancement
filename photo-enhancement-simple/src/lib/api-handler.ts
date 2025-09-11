/**
 * API Handler Wrapper with Correlation ID Support
 * 
 * This module provides a wrapper for Next.js API route handlers that automatically:
 * - Generates or preserves correlation IDs
 * - Sets correlation ID response headers
 * - Provides consistent error handling
 * - Integrates with logging and tracing systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, setCorrelationId, getCorrelationId, generateCorrelationId } from './logger';
import { tracer } from './tracing';

export interface ApiHandlerOptions {
  /** Whether to require authentication */
  requireAuth?: boolean;
  /** Custom operation name for tracing */
  operationName?: string;
  /** Whether to enable detailed request logging */
  enableRequestLogging?: boolean;
}

export type ApiHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Wraps an API handler with correlation ID support and consistent error handling
 */
export function withCorrelationId(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
): ApiHandler {
  const {
    operationName,
    enableRequestLogging = true
  } = options;

  return async function wrappedHandler(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    
    // Get or generate correlation ID
    const existingCorrelationId = request.headers.get('x-correlation-id');
    const correlationId = existingCorrelationId || generateCorrelationId();
    
    // Set correlation ID in context
    setCorrelationId(correlationId);
    
    // Start trace if operation name provided
    const trace = operationName ? tracer.startTrace(operationName, {
      method: request.method,
      path: request.nextUrl.pathname,
      correlationId
    }) : null;
    
    try {
      if (enableRequestLogging) {
        logger.info('API request started', {
          operation: 'api_request_start',
          method: request.method,
          path: request.nextUrl.pathname,
          correlationId,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
        });
      }
      
      // Call the actual handler
      const response = await handler(request);
      
      // Add correlation ID to response headers
      response.headers.set('x-correlation-id', correlationId);
      
      // Add trace ID if available
      if (trace) {
        response.headers.set('x-trace-id', trace.getTraceId());
        trace.success();
      }
      
      const responseTime = Date.now() - startTime;
      
      if (enableRequestLogging) {
        logger.info('API request completed', {
          operation: 'api_request_complete',
          method: request.method,
          path: request.nextUrl.pathname,
          correlationId,
          statusCode: response.status,
          responseTime
        });
      }
      
      return response;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('API request failed', error as Error, {
        operation: 'api_request_error',
        method: request.method,
        path: request.nextUrl.pathname,
        correlationId,
        responseTime
      });
      
      if (trace) {
        trace.error(error as Error);
      }
      
      // Create error response with correlation ID
      const errorResponse = NextResponse.json(
        {
          status: 'error',
          message: 'Internal server error',
          correlationId
        },
        { status: 500 }
      );
      
      errorResponse.headers.set('x-correlation-id', correlationId);
      
      if (trace) {
        errorResponse.headers.set('x-trace-id', trace.getTraceId());
      }
      
      return errorResponse;
      
    } finally {
      if (trace) {
        trace.finish();
      }
    }
  };
}

/**
 * Convenience wrapper for health check endpoints
 */
export function withHealthCheck(handler: ApiHandler): ApiHandler {
  return withCorrelationId(handler, {
    operationName: 'health_check',
    enableRequestLogging: false // Health checks are frequent, reduce noise
  });
}

/**
 * Convenience wrapper for debug endpoints
 */
export function withDebugEndpoint(handler: ApiHandler): ApiHandler {
  return withCorrelationId(handler, {
    operationName: 'debug_request',
    enableRequestLogging: true
  });
}

/**
 * Convenience wrapper for API endpoints
 */
export function withApiEndpoint(handler: ApiHandler, operationName?: string): ApiHandler {
  return withCorrelationId(handler, {
    operationName,
    enableRequestLogging: true
  });
}