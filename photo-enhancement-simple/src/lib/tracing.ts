/**
 * Distributed tracing system for photo enhancement pipeline
 * 
 * This module provides comprehensive request tracing across the entire upload
 * and enhancement pipeline, building on the existing correlation ID infrastructure.
 * 
 * Features:
 * - Trace context propagation across services
 * - Span creation and management
 * - Performance timing collection
 * - Error tracking within traces
 * - Integration with existing logging and metrics
 * 
 * @example
 * ```typescript
 * import { tracer, createSpan } from '@/lib/tracing';
 * 
 * // Start a new trace
 * const trace = tracer.startTrace('photo-upload', { userId: 'user-123' });
 * 
 * // Create spans for different operations
 * const uploadSpan = createSpan('file-upload', { fileName: 'photo.jpg' });
 * uploadSpan.finish();
 * 
 * // Finish the trace
 * trace.finish();
 * ```
 * 
 * @module Tracing
 */

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
import { logger, getCorrelationId, setCorrelationId } from './logger';
import { EnhancementMetrics, UploadMetrics } from './metrics';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  operation: string;
  startTime: number;
  metadata: Record<string, unknown>;
}

export interface SpanData {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  metadata: Record<string, unknown>;
  error?: Error;
  tags: Record<string, string>;
}

export interface TraceData {
  traceId: string;
  correlationId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  spans: SpanData[];
  metadata: Record<string, unknown>;
  error?: Error;
}

// Global trace storage
const activeTraces = new Map<string, TraceData>();
const activeSpans = new Map<string, SpanData>();

// Trace context storage
let currentTraceContext: TraceContext | null = null;

class Tracer {
  /**
   * Start a new distributed trace
   */
  startTrace(operation: string, metadata: Record<string, unknown> = {}): Trace {
    const traceId = generateUUID();
    const correlationId = getCorrelationId() || generateUUID();
    
    // Ensure correlation ID is set
    if (!getCorrelationId()) {
      setCorrelationId(correlationId);
    }
    
    const traceData: TraceData = {
      traceId,
      correlationId,
      operation,
      startTime: Date.now(),
      status: 'pending',
      spans: [],
      metadata
    };
    
    activeTraces.set(traceId, traceData);
    
    // Set trace context
    currentTraceContext = {
      traceId,
      spanId: generateUUID(),
      correlationId,
      operation,
      startTime: Date.now(),
      metadata
    };
    
    logger.info('Trace started', {
      operation: 'trace_start',
      traceId,
      correlationId,
      traceOperation: operation,
      metadata
    });
    
    return new Trace(traceData);
  }
  
  /**
   * Get current trace context
   */
  getCurrentTrace(): TraceContext | null {
    return currentTraceContext;
  }
  
  /**
   * Set trace context (for propagation across services)
   */
  setTraceContext(context: TraceContext): void {
    currentTraceContext = context;
    setCorrelationId(context.correlationId);
  }
  
  /**
   * Clear trace context
   */
  clearTraceContext(): void {
    currentTraceContext = null;
  }
  
  /**
   * Get trace by ID
   */
  getTrace(traceId: string): TraceData | undefined {
    return activeTraces.get(traceId);
  }
  
  /**
   * Get all active traces
   */
  getActiveTraces(): TraceData[] {
    return Array.from(activeTraces.values());
  }
  
  /**
   * Clean up completed traces older than specified time
   */
  cleanupTraces(maxAgeMs: number = 300000): void { // 5 minutes default
    const cutoff = Date.now() - maxAgeMs;
    
    for (const [traceId, trace] of activeTraces.entries()) {
      if (trace.endTime && trace.endTime < cutoff) {
        activeTraces.delete(traceId);
      }
    }
  }
}

class Trace {
  private traceData: TraceData;
  
  constructor(traceData: TraceData) {
    this.traceData = traceData;
  }
  
  /**
   * Create a new span within this trace
   */
  createSpan(operation: string, metadata: Record<string, unknown> = {}): Span {
    const spanId = generateUUID();
    const parentSpanId = currentTraceContext?.spanId;
    
    const spanData: SpanData = {
      spanId,
      traceId: this.traceData.traceId,
      parentSpanId,
      operation,
      startTime: Date.now(),
      status: 'pending',
      metadata,
      tags: {}
    };
    
    activeSpans.set(spanId, spanData);
    this.traceData.spans.push(spanData);
    
    logger.debug('Span started', {
      operation: 'span_start',
      traceId: this.traceData.traceId,
      spanId,
      parentSpanId,
      spanOperation: operation,
      metadata
    });
    
    return new Span(spanData);
  }
  
  /**
   * Add metadata to the trace
   */
  addMetadata(key: string, value: unknown): void {
    this.traceData.metadata[key] = value;
  }
  
  /**
   * Mark trace as successful
   */
  success(): void {
    this.traceData.status = 'success';
    this.traceData.endTime = Date.now();
    this.traceData.duration = this.traceData.endTime - this.traceData.startTime;
    
    logger.info('Trace completed successfully', {
      operation: 'trace_success',
      traceId: this.traceData.traceId,
      correlationId: this.traceData.correlationId,
      traceOperation: this.traceData.operation,
      duration: this.traceData.duration,
      spanCount: this.traceData.spans.length
    });
  }
  
  /**
   * Mark trace as failed
   */
  error(error: Error): void {
    this.traceData.status = 'error';
    this.traceData.error = error;
    this.traceData.endTime = Date.now();
    this.traceData.duration = this.traceData.endTime - this.traceData.startTime;
    
    logger.error('Trace failed', error, {
      operation: 'trace_error',
      traceId: this.traceData.traceId,
      correlationId: this.traceData.correlationId,
      traceOperation: this.traceData.operation,
      duration: this.traceData.duration,
      spanCount: this.traceData.spans.length
    });
  }
  
  /**
   * Finish the trace (automatically determines success/error)
   */
  finish(): void {
    if (this.traceData.status === 'pending') {
      this.success();
    }
    
    // Clean up trace context if this is the current trace
    if (currentTraceContext?.traceId === this.traceData.traceId) {
      currentTraceContext = null;
    }
  }
  
  /**
   * Get trace data
   */
  getData(): TraceData {
    return { ...this.traceData };
  }
  
  /**
   * Get trace ID
   */
  getTraceId(): string {
    return this.traceData.traceId;
  }
}

class Span {
  private spanData: SpanData;
  
  constructor(spanData: SpanData) {
    this.spanData = spanData;
  }
  
  /**
   * Add metadata to the span
   */
  addMetadata(key: string, value: unknown): void {
    this.spanData.metadata[key] = value;
  }
  
  /**
   * Add tags to the span
   */
  addTag(key: string, value: string): void {
    this.spanData.tags[key] = value;
  }
  
  /**
   * Mark span as successful
   */
  success(): void {
    this.spanData.status = 'success';
    this.spanData.endTime = Date.now();
    this.spanData.duration = this.spanData.endTime - this.spanData.startTime;
    
    logger.debug('Span completed successfully', {
      operation: 'span_success',
      traceId: this.spanData.traceId,
      spanId: this.spanData.spanId,
      spanOperation: this.spanData.operation,
      duration: this.spanData.duration
    });
  }
  
  /**
   * Mark span as failed
   */
  error(error: Error): void {
    this.spanData.status = 'error';
    this.spanData.error = error;
    this.spanData.endTime = Date.now();
    this.spanData.duration = this.spanData.endTime - this.spanData.startTime;
    
    logger.error('Span failed', error, {
      operation: 'span_error',
      traceId: this.spanData.traceId,
      spanId: this.spanData.spanId,
      spanOperation: this.spanData.operation,
      duration: this.spanData.duration
    });
  }
  
  /**
   * Finish the span (automatically determines success/error)
   */
  finish(): void {
    if (this.spanData.status === 'pending') {
      this.success();
    }
    
    activeSpans.delete(this.spanData.spanId);
  }
  
  /**
   * Get span data
   */
  getData(): SpanData {
    return { ...this.spanData };
  }
  
  /**
   * Get span ID
   */
  getSpanId(): string {
    return this.spanData.spanId;
  }
}

// Export singleton tracer instance
export const tracer = new Tracer();

// Convenience functions
export function createSpan(operation: string, metadata: Record<string, unknown> = {}): Span {
  const currentTrace = tracer.getCurrentTrace();
  if (!currentTrace) {
    throw new Error('No active trace found. Start a trace before creating spans.');
  }
  
  const trace = tracer.getTrace(currentTrace.traceId);
  if (!trace) {
    throw new Error('Active trace not found in storage.');
  }
  
  return new Trace(trace).createSpan(operation, metadata);
}

export function getCurrentTraceId(): string | null {
  return tracer.getCurrentTrace()?.traceId || null;
}

export function getCurrentCorrelationId(): string | null {
  return tracer.getCurrentTrace()?.correlationId || getCorrelationId() || null;
}

// Middleware for Next.js API routes
export function createTracingMiddleware() {
  return (req: any, res: any, next: any) => {
    // Check for existing trace context in headers
    const traceId = req.headers['x-trace-id'];
    const spanId = req.headers['x-span-id'];
    const correlationId = req.headers['x-correlation-id'];
    
    let trace: Trace;
    
    if (traceId && correlationId) {
      // Continue existing trace
      const existingTrace = tracer.getTrace(traceId);
      if (existingTrace) {
        trace = new Trace(existingTrace);
        tracer.setTraceContext({
          traceId,
          spanId: spanId || generateUUID(),
          correlationId,
          operation: `${req.method} ${req.url}`,
          startTime: Date.now(),
          metadata: {}
        });
      } else {
        // Start new trace if existing one not found
        trace = tracer.startTrace(`${req.method} ${req.url}`, {
          method: req.method,
          path: req.url,
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection?.remoteAddress
        });
      }
    } else {
      // Start new trace
      trace = tracer.startTrace(`${req.method} ${req.url}`, {
        method: req.method,
        path: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection?.remoteAddress
      });
    }
    
    // Add trace headers to response
    res.setHeader('x-trace-id', trace.getTraceId());
    res.setHeader('x-correlation-id', getCurrentCorrelationId() || '');
    
    // Create request span
    const requestSpan = trace.createSpan('http-request', {
      method: req.method,
      path: req.url,
      userAgent: req.headers['user-agent']
    });
    
    // Override res.end to finish trace
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      requestSpan.addTag('status_code', res.statusCode.toString());
      
      if (res.statusCode >= 400) {
        requestSpan.error(new Error(`HTTP ${res.statusCode}`));
        trace.error(new Error(`Request failed with status ${res.statusCode}`));
      } else {
        requestSpan.success();
        trace.success();
      }
      
      trace.finish();
      tracer.clearTraceContext();
      originalEnd.apply(res, args);
    };
    
    if (next) next();
  };
}

// Cleanup function to be called periodically
export function cleanupTraces(): void {
  tracer.cleanupTraces();
}

// Export classes for advanced usage
export { Trace, Span, Tracer };