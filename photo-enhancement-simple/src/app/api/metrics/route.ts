import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { metrics, UploadMetrics, EnhancementMetrics, APIMetrics, cleanupMetrics } from '@/lib/metrics';

interface MetricsResponse {
  timestamp: string;
  uptime: number;
  environment: string;
  metrics: {
    uploads: Record<string, any>;
    enhancements: Record<string, any>;
    api: Record<string, any>;
    system: {
      memory: NodeJS.MemoryUsage;
      cpu?: NodeJS.CpuUsage;
    };
  };
  summary: {
    totalUploads: number;
    successfulUploads: number;
    failedUploads: number;
    totalEnhancements: number;
    successfulEnhancements: number;
    failedEnhancements: number;
    totalAPIRequests: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

// Simple authentication for metrics endpoint
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const metricsToken = process.env.METRICS_TOKEN;
  
  // If no token is configured, allow access in development
  if (!metricsToken) {
    return process.env.NODE_ENV === 'development';
  }
  
  if (!authHeader) {
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === metricsToken;
}

function calculateSummary(allMetrics: Record<string, any>) {
  const summary = {
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalEnhancements: 0,
    successfulEnhancements: 0,
    failedEnhancements: 0,
    totalAPIRequests: 0,
    errorRate: 0,
    avgResponseTime: 0,
  };
  
  // Calculate upload stats
  for (const [key, value] of Object.entries(allMetrics)) {
    if (key.startsWith('uploads.started') && value.type === 'counter') {
      summary.totalUploads += value.value;
    }
    if (key.startsWith('uploads.success') && value.type === 'counter') {
      summary.successfulUploads += value.value;
    }
    if (key.startsWith('uploads.error') && value.type === 'counter') {
      summary.failedUploads += value.value;
    }
    
    // Enhancement stats
    if (key.startsWith('enhancements.started') && value.type === 'counter') {
      summary.totalEnhancements += value.value;
    }
    if (key.startsWith('enhancements.success') && value.type === 'counter') {
      summary.successfulEnhancements += value.value;
    }
    if (key.startsWith('enhancements.error') && value.type === 'counter') {
      summary.failedEnhancements += value.value;
    }
    
    // API stats
    if (key.startsWith('api.requests') && value.type === 'counter') {
      summary.totalAPIRequests += value.value;
    }
    if (key.startsWith('api.errors') && value.type === 'counter') {
      // Error rate calculation will be done after we have total requests
    }
    if (key.startsWith('api.response_time') && value.type === 'histogram') {
      summary.avgResponseTime = value.avg || 0;
    }
  }
  
  // Calculate error rate
  let totalErrors = 0;
  for (const [key, value] of Object.entries(allMetrics)) {
    if (key.startsWith('api.errors') && value.type === 'counter') {
      totalErrors += value.value;
    }
  }
  
  if (summary.totalAPIRequests > 0) {
    summary.errorRate = (totalErrors / summary.totalAPIRequests) * 100;
  }
  
  return summary;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      logger.warn('Unauthorized metrics access attempt', {
        operation: 'metrics_unauthorized',
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      });
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    logger.info('Metrics requested', {
      operation: 'metrics_request',
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    });
    
    // Clean up old metrics before returning
    cleanupMetrics();
    
    // Get all metrics
    const allMetrics = metrics.getMetrics();
    const uploadMetrics = UploadMetrics.getUploadStats();
    const enhancementMetrics = EnhancementMetrics.getEnhancementStats();
    const apiMetrics = APIMetrics.getAPIStats();
    
    // Calculate summary
    const summary = calculateSummary(allMetrics);
    
    const response: MetricsResponse = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      metrics: {
        uploads: uploadMetrics,
        enhancements: enhancementMetrics,
        api: apiMetrics,
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      },
      summary
    };
    
    const responseTime = Date.now() - startTime;
    
    logger.info('Metrics response sent', {
      operation: 'metrics_response',
      responseTime,
      metricsCount: Object.keys(allMetrics).length,
      metrics: { responseTime }
    });
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Metrics endpoint error', error as Error, {
      operation: 'metrics_error',
      responseTime,
      metrics: { responseTime }
    });
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}