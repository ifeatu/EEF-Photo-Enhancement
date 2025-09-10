import { logger } from './logger';
import { addBreadcrumb } from './sentry';

// In-memory metrics store (in production, you'd use Redis or a proper metrics service)
class MetricsCollector {
  private metrics: Map<string, any[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();

  // Counter methods
  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    const key = this.buildKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    logger.debug('Metric incremented', {
      operation: 'metric_increment',
      metric: name,
      value,
      total: current + value,
      tags
    });
  }

  // Gauge methods (current value)
  gauge(name: string, value: number, tags?: Record<string, string>) {
    const key = this.buildKey(name, tags);
    this.gauges.set(key, value);
    
    logger.debug('Gauge set', {
      operation: 'metric_gauge',
      metric: name,
      value,
      tags
    });
  }

  // Histogram methods (for timing)
  histogram(name: string, value: number, tags?: Record<string, string>) {
    const key = this.buildKey(name, tags);
    const values = this.metrics.get(key) || [];
    values.push({ value, timestamp: Date.now() });
    
    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
    
    this.metrics.set(key, values);
    
    logger.debug('Histogram recorded', {
      operation: 'metric_histogram',
      metric: name,
      value,
      tags
    });
  }

  // Timer helper
  timer(name: string, tags?: Record<string, string>) {
    const startTime = Date.now();
    
    return {
      finish: () => {
        const duration = Date.now() - startTime;
        this.histogram(name, duration, tags);
        return duration;
      }
    };
  }

  // Get metrics summary
  getMetrics() {
    const summary: Record<string, any> = {};
    
    // Counters
    for (const [key, value] of this.counters.entries()) {
      summary[key] = { type: 'counter', value };
    }
    
    // Gauges
    for (const [key, value] of this.gauges.entries()) {
      summary[key] = { type: 'gauge', value };
    }
    
    // Histograms with basic stats
    for (const [key, values] of this.metrics.entries()) {
      if (values.length > 0) {
        const nums = values.map(v => v.value);
        summary[key] = {
          type: 'histogram',
          count: nums.length,
          min: Math.min(...nums),
          max: Math.max(...nums),
          avg: nums.reduce((a, b) => a + b, 0) / nums.length,
          p95: this.percentile(nums, 0.95),
          p99: this.percentile(nums, 0.99)
        };
      }
    }
    
    return summary;
  }

  // Clear old metrics (call periodically)
  cleanup(maxAge: number = 3600000) { // 1 hour default
    const cutoff = Date.now() - maxAge;
    
    for (const [key, values] of this.metrics.entries()) {
      const filtered = values.filter(v => v.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }
  }

  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    
    return `${name}{${tagString}}`;
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

export const metrics = new MetricsCollector();

// Upload-specific metrics
export class UploadMetrics {
  static recordUploadStart(userId: string, fileName: string, fileSize: number) {
    metrics.increment('uploads.started', 1, { userId });
    metrics.gauge('uploads.file_size', fileSize, { userId, fileName });
    
    addBreadcrumb('Upload started', 'upload', {
      userId,
      fileName,
      fileSize
    });
    
    logger.uploadStart(userId, fileName, fileSize);
  }

  static recordUploadSuccess(userId: string, fileName: string, processingTime: number, fileSize: number) {
    metrics.increment('uploads.success', 1, { userId });
    metrics.histogram('uploads.processing_time', processingTime, { userId });
    metrics.histogram('uploads.success_file_size', fileSize, { userId });
    
    addBreadcrumb('Upload completed', 'upload', {
      userId,
      fileName,
      processingTime,
      fileSize
    });
    
    logger.uploadSuccess(userId, fileName, processingTime);
  }

  static recordUploadError(userId: string, fileName: string, error: Error, processingTime?: number) {
    metrics.increment('uploads.error', 1, { 
      userId, 
      errorType: error.name,
      errorMessage: error.message.substring(0, 50)
    });
    
    if (processingTime) {
      metrics.histogram('uploads.error_processing_time', processingTime, { userId });
    }
    
    addBreadcrumb('Upload failed', 'upload', {
      userId,
      fileName,
      error: error.message,
      processingTime
    });
    
    logger.uploadError(userId, fileName, error, processingTime);
  }

  static getUploadStats() {
    const allMetrics = metrics.getMetrics();
    const uploadMetrics: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(allMetrics)) {
      if (key.startsWith('uploads.')) {
        uploadMetrics[key] = value;
      }
    }
    
    return uploadMetrics;
  }
}

// Enhancement-specific metrics
export class EnhancementMetrics {
  static recordEnhancementStart(photoId: string, userId: string) {
    metrics.increment('enhancements.started', 1, { userId });
    
    addBreadcrumb('Enhancement started', 'enhancement', {
      photoId,
      userId
    });
    
    logger.enhancementStart(photoId, userId);
  }

  static recordEnhancementSuccess(photoId: string, userId: string, processingTime: number) {
    metrics.increment('enhancements.success', 1, { userId });
    metrics.histogram('enhancements.processing_time', processingTime, { userId });
    
    addBreadcrumb('Enhancement completed', 'enhancement', {
      photoId,
      userId,
      processingTime
    });
    
    logger.enhancementSuccess(photoId, userId, processingTime);
  }

  static recordEnhancementError(photoId: string, userId: string, error: Error, processingTime?: number) {
    metrics.increment('enhancements.error', 1, { 
      userId,
      errorType: error.name,
      errorMessage: error.message.substring(0, 50)
    });
    
    if (processingTime) {
      metrics.histogram('enhancements.error_processing_time', processingTime, { userId });
    }
    
    addBreadcrumb('Enhancement failed', 'enhancement', {
      photoId,
      userId,
      error: error.message,
      processingTime
    });
    
    logger.enhancementError(photoId, userId, error, processingTime);
  }

  static getEnhancementStats() {
    const allMetrics = metrics.getMetrics();
    const enhancementMetrics: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(allMetrics)) {
      if (key.startsWith('enhancements.')) {
        enhancementMetrics[key] = value;
      }
    }
    
    return enhancementMetrics;
  }
}

// API metrics
export class APIMetrics {
  static recordRequest(method: string, path: string, statusCode: number, responseTime: number, userId?: string) {
    const tags: Record<string, string> = { method, path: this.normalizePath(path), status: statusCode.toString() };
    if (userId) tags.userId = userId;
    
    metrics.increment('api.requests', 1, tags);
    metrics.histogram('api.response_time', responseTime, tags);
    
    if (statusCode >= 400) {
      metrics.increment('api.errors', 1, tags);
    }
    
    logger.apiRequest(method, path, userId, statusCode, responseTime);
  }

  static getAPIStats() {
    const allMetrics = metrics.getMetrics();
    const apiMetrics: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(allMetrics)) {
      if (key.startsWith('api.')) {
        apiMetrics[key] = value;
      }
    }
    
    return apiMetrics;
  }

  private static normalizePath(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectid');
  }
}

// Cleanup job (call this periodically)
export function cleanupMetrics() {
  metrics.cleanup();
  logger.debug('Metrics cleanup completed', {
    operation: 'metrics_cleanup'
  });
}