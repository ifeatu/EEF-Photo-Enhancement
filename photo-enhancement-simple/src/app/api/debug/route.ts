import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withAuth, addSecurityHeaders, AuthenticatedRequest } from '@/lib/auth-middleware';
import { AuthResult } from '@/lib/service-auth';
import fs from 'fs';
import path from 'path';

interface DebugInfo {
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  database: {
    status: 'connected' | 'disconnected' | 'error';
    error?: string;
    tables?: string[];
  };
  gemini: {
    status: 'connected' | 'disconnected' | 'error';
    error?: string;
  };
  storage: {
    status: 'connected' | 'disconnected' | 'error';
    error?: string;
    uploadsDir?: {
      exists: boolean;
      writable: boolean;
      files?: number;
      size?: number;
    };
  };
  system: {
    platform: string;
    nodeVersion: string;
    cpuUsage: NodeJS.CpuUsage;
    memory: NodeJS.MemoryUsage;
  };
  environment_variables: {
    configured: string[];
    missing: string[];
  };
  auth: {
    accountId: string;
    accountName: string;
    method: string;
    permissions: string[];
  };
  recent_logs?: any[];
}

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    // Get table names
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    
    return {
      status: 'connected' as const,
      tables: tables.map(t => t.tablename)
    };
  } catch (error) {
    return {
      status: 'error' as const,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

async function checkGemini() {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return {
        status: 'error' as const,
        error: 'GOOGLE_AI_API_KEY not configured'
      };
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Simple test to verify API connectivity
    await model.generateContent('test');
    
    return {
      status: 'connected' as const
    };
  } catch (error) {
    return {
      status: 'error' as const,
      error: error instanceof Error ? error.message : 'Unknown Gemini API error'
    };
  }
}

async function checkS3Storage() {
   try {
     const bucketName = process.env.AWS_S3_BUCKET_NAME;
     const region = process.env.AWS_REGION;
     const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
     const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
     
     if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
       return {
         status: 'error' as const,
         error: 'AWS S3 configuration incomplete'
       };
     }
     
     // Simple connectivity check without AWS SDK
     const response = await fetch(`https://${bucketName}.s3.${region}.amazonaws.com/`, {
       method: 'HEAD'
     });
     
     return {
       status: response.ok ? 'connected' as const : 'error' as const,
       error: response.ok ? undefined : `S3 bucket not accessible: ${response.status}`
     };
   } catch (error) {
     return {
       status: 'error' as const,
       error: error instanceof Error ? error.message : 'Unknown S3 error'
     };
   }
 }

function checkLocalStorage() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    const exists = fs.existsSync(uploadsDir);
    let writable = false;
    let files = 0;
    let size = 0;
    
    if (exists) {
      try {
        // Test write access
        const testFile = path.join(uploadsDir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        writable = true;
        
        // Count files and calculate size
        const fileList = fs.readdirSync(uploadsDir);
        files = fileList.length;
        
        for (const file of fileList) {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            size += stats.size;
          }
        }
      } catch (error) {
        // Write test failed
      }
    }
    
    return {
      uploadsDir: {
        exists,
        writable,
        files,
        size
      }
    };
  } catch (error) {
    return {
      uploadsDir: {
        exists: false,
        writable: false
      },
      error: error instanceof Error ? error.message : 'Unknown storage error'
    };
  }
}

function checkEnvironmentVariables() {
  const requiredVars = [
    'DATABASE_URL',
    'GOOGLE_AI_API_KEY',
    'JWT_SECRET',
    'AWS_S3_BUCKET_NAME',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ];
  
  const optionalVars = [
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'METRICS_TOKEN',
    'DEBUG_TOKEN',
    'CRON_SECRET'
  ];
  
  const configured: string[] = [];
  const missing: string[] = [];
  
  // Check required variables
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      configured.push(varName);
    } else {
      missing.push(varName);
    }
  }
  
  // Check optional variables
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      configured.push(`${varName} (optional)`);
    }
  }
  
  return { configured, missing };
}

async function handleDebugRequest(request: AuthenticatedRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('Debug info requested', {
       operation: 'debug_request',
       accountId: request.serviceAccount?.id,
       ip: request.headers.get('x-forwarded-for'),
       userAgent: request.headers.get('user-agent')
     });
    
    // Gather debug information
    const [databaseInfo, geminiInfo, s3StorageInfo] = await Promise.all([
      checkDatabase(),
      checkGemini(),
      checkS3Storage()
    ]);
    
    const localStorageInfo = checkLocalStorage();
    const envInfo = checkEnvironmentVariables();
    
    // Determine overall storage status
    const storageStatus = s3StorageInfo.status === 'connected' ? s3StorageInfo : {
      status: localStorageInfo.error ? 'error' as const : 'connected' as const,
      error: localStorageInfo.error,
      uploadsDir: localStorageInfo.uploadsDir
    };
    
    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: databaseInfo,
      gemini: geminiInfo,
      storage: storageStatus,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        cpuUsage: process.cpuUsage(),
        memory: process.memoryUsage()
      },
      environment_variables: envInfo,
      auth: {
         accountId: request.serviceAccount?.id || 'unknown',
         accountName: request.serviceAccount?.name || 'unknown',
         method: request.authMethod || 'unknown',
         permissions: request.serviceAccount?.permissions || []
       }
    };
    
    const responseTime = Date.now() - startTime;
    
    logger.info('Debug info response sent', {
       operation: 'debug_response',
       accountId: request.serviceAccount?.id,
       responseTime,
       databaseStatus: databaseInfo.status,
       geminiStatus: geminiInfo.status,
       storageStatus: storageStatus.status,
       missingEnvVars: envInfo.missing.length,
       metrics: { responseTime }
     });
    
    return NextResponse.json(debugInfo, { status: 200 });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Debug endpoint error', error as Error, {
       operation: 'debug_error',
       accountId: request.serviceAccount?.id,
       responseTime,
       metrics: { responseTime }
     });
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export const GET = withAuth(handleDebugRequest, {
  requiredPermissions: ['debug:read']
});