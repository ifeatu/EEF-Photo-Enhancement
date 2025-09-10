import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { withAuth, addSecurityHeaders, AuthenticatedRequest } from '@/lib/auth-middleware';
import { ServiceAccountUtils } from '@/lib/service-auth';

interface AdminInfo {
  timestamp: string;
  requestedBy: {
    accountId: string;
    accountName: string;
    method: string;
    permissions: string[];
  };
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    platform: string;
    nodeVersion: string;
    environment: string;
  };
  database: {
    status: string;
    userCount?: number;
    recentUploads?: number;
    error?: string;
  };
  services: {
    gemini: { status: string; error?: string };
    storage: { status: string; error?: string };
  };
  security: {
    recentAuthAttempts: number;
    activeServiceAccounts: number;
    lastSecurityEvent?: string;
  };
  performance: {
    avgResponseTime?: number;
    errorRate?: number;
    requestCount?: number;
  };
}

const prisma = new PrismaClient();

async function getDatabaseStats() {
  try {
    // Get user count
    const userCount = await prisma.user.count();
    
    // Get recent uploads (last 24 hours) - using User as proxy since Upload model may not exist
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUploads = await prisma.user.count({
      where: {
        createdAt: {
          gte: yesterday
        }
      }
    });
    
    return {
      status: 'connected',
      userCount,
      recentUploads
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

async function getServiceStatus() {
  const services: {
    gemini: { status: string; error?: string };
    storage: { status: string; error?: string };
  } = {
    gemini: { status: 'unknown' },
    storage: { status: 'unknown' }
  };
  
  // Check Gemini API
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      services.gemini = { status: 'error', error: 'API key not configured' };
    } else {
      // Simple connectivity test
      const response = await fetch('https://generativelanguage.googleapis.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      services.gemini = { status: response.ok ? 'connected' : 'error' };
    }
  } catch (error) {
    services.gemini = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  // Check Storage
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      services.storage = { status: 'error', error: 'S3 not configured' };
    } else {
      services.storage = { status: 'configured' };
    }
  } catch (error) {
    services.storage = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  return services;
}

function getSecurityInfo() {
  // In a real implementation, this would query security logs
  return {
    recentAuthAttempts: 0, // Would be from logs/metrics
    activeServiceAccounts: 1, // Would count from environment
    lastSecurityEvent: undefined
  };
}

function getPerformanceMetrics() {
  // In a real implementation, this would query performance metrics
  return {
    avgResponseTime: undefined,
    errorRate: undefined,
    requestCount: undefined
  };
}

async function handleAdminRequest(request: AuthenticatedRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('Admin endpoint accessed', {
      operation: 'admin_access',
      accountId: request.serviceAccount?.id,
      accountName: request.serviceAccount?.name,
      method: request.authMethod,
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    });
    
    // Gather admin information
    const [databaseStats, serviceStatus] = await Promise.all([
      getDatabaseStats(),
      getServiceStatus()
    ]);
    
    const securityInfo = getSecurityInfo();
    const performanceMetrics = getPerformanceMetrics();
    
    const adminInfo: AdminInfo = {
      timestamp: new Date().toISOString(),
      requestedBy: {
        accountId: request.serviceAccount?.id || 'unknown',
        accountName: request.serviceAccount?.name || 'unknown',
        method: request.authMethod || 'unknown',
        permissions: request.serviceAccount?.permissions || []
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'unknown'
      },
      database: databaseStats,
      services: serviceStatus,
      security: securityInfo,
      performance: performanceMetrics
    };
    
    const responseTime = Date.now() - startTime;
    
    logger.info('Admin info response sent', {
      operation: 'admin_response',
      accountId: request.serviceAccount?.id,
      responseTime,
      databaseStatus: databaseStats.status,
      userCount: databaseStats.userCount,
      recentUploads: databaseStats.recentUploads,
      metrics: { responseTime }
    });
    
    const response = NextResponse.json(adminInfo, { status: 200 });
    return addSecurityHeaders(response);
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Admin endpoint error', error as Error, {
      operation: 'admin_error',
      accountId: request.serviceAccount?.id,
      responseTime,
      metrics: { responseTime }
    });
    
    const response = NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
    return addSecurityHeaders(response);
    
  } finally {
    await prisma.$disconnect();
  }
}

// POST endpoint for admin actions
async function handleAdminActions(request: AuthenticatedRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { action, params } = body;
    
    logger.info('Admin action requested', {
      operation: 'admin_action',
      action,
      accountId: request.serviceAccount?.id,
      ip: request.headers.get('x-forwarded-for')
    });
    
    let result;
    
    switch (action) {
      case 'generate_api_key':
        result = {
          apiKey: ServiceAccountUtils.generateApiKey(),
          hash: ServiceAccountUtils.hashApiKey(ServiceAccountUtils.generateApiKey())
        };
        break;
        
      case 'generate_token':
        const secret = ServiceAccountUtils.generateSecret();
        result = {
          secret,
          token: ServiceAccountUtils.generateServiceToken(secret)
        };
        break;
        
      case 'hash_password':
        if (!params?.password) {
          throw new Error('Password required');
        }
        result = {
          hash: ServiceAccountUtils.hashPassword(params.password)
        };
        break;
        
      case 'system_info':
        result = {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          environment: process.env.NODE_ENV
        };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    const responseTime = Date.now() - startTime;
    
    logger.info('Admin action completed', {
      operation: 'admin_action_complete',
      action,
      accountId: request.serviceAccount?.id,
      responseTime,
      metrics: { responseTime }
    });
    
    const response = NextResponse.json({ success: true, result }, { status: 200 });
    return addSecurityHeaders(response);
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Admin action error', error as Error, {
      operation: 'admin_action_error',
      accountId: request.serviceAccount?.id,
      responseTime,
      metrics: { responseTime }
    });
    
    const response = NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 400 }
    );
    return addSecurityHeaders(response);
    
  } finally {
    await prisma.$disconnect();
  }
}

// Export authenticated handlers
export const GET = withAuth(handleAdminRequest, {
  requiredPermissions: ['admin:read']
});

export const POST = withAuth(handleAdminActions, {
  requiredPermissions: ['admin:write']
});