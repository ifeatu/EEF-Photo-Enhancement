import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { PrismaClient } from '@prisma/client';
import { alertManager } from '@/lib/alerting';
import { withHealthCheck } from '@/lib/api-handler';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    gemini: {
      status: 'healthy' | 'unhealthy' | 'not_configured';
      error?: string;
    };
    storage: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
}

const prisma = new PrismaClient();

async function checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    
    logger.databaseQuery('SELECT 1', responseTime, true);
    return { status: 'healthy', responseTime };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    logger.error('Database health check failed', error as Error);
    alertManager.recordServiceFailure('database');
    return { status: 'unhealthy', error: errorMessage };
  }
}

function checkGeminiAPI(): { status: 'healthy' | 'unhealthy' | 'not_configured'; error?: string } {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    return { status: 'not_configured', error: 'GOOGLE_AI_API_KEY not configured' };
  }
  
  if (apiKey.length < 10) {
    const errorMessage = 'GOOGLE_AI_API_KEY appears to be invalid';
    alertManager.recordServiceFailure('gemini');
    return { status: 'unhealthy', error: errorMessage };
  }
  
  return { status: 'healthy' };
}

function checkStorage(): { status: 'healthy' | 'unhealthy'; error?: string } {
  try {
    // Check if we can access the file system (for local storage)
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Try to access the uploads directory
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    return { status: 'healthy' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
    alertManager.recordServiceFailure('storage');
    return { status: 'unhealthy', error: errorMessage };
  }
}

async function handleHealthCheck(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info('Health check requested', {
      operation: 'health_check',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for')
    });

    // Check all services
    const [databaseHealth] = await Promise.all([
      checkDatabase()
    ]);
    
    const geminiHealth = checkGeminiAPI();
    const storageHealth = checkStorage();
    
    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (databaseHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (
      geminiHealth.status === 'unhealthy' || 
      storageHealth.status === 'unhealthy' ||
      geminiHealth.status === 'not_configured'
    ) {
      overallStatus = 'degraded';
    }
    
    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      services: {
        database: databaseHealth,
        gemini: geminiHealth,
        storage: storageHealth
      },
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
    
    const responseTime = Date.now() - startTime;
    
    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    logger.info('Health check completed', {
      operation: 'health_check_complete',
      status: overallStatus,
      responseTime,
      metrics: { responseTime }
    });
    
    return NextResponse.json(healthCheck, { status: statusCode });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Health check failed', error as Error, {
      operation: 'health_check_error',
      responseTime,
      metrics: { responseTime }
    });
    
    const errorHealthCheck: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      services: {
        database: { status: 'unhealthy', error: 'Health check failed' },
        gemini: { status: 'unhealthy', error: 'Health check failed' },
        storage: { status: 'unhealthy', error: 'Health check failed' }
      },
      metrics: {
        memoryUsage: process.memoryUsage()
      }
    };
    
    return NextResponse.json(errorHealthCheck, { status: 503 });
  } finally {
    await prisma.$disconnect();
  }
}

export const GET = withHealthCheck(handleHealthCheck);