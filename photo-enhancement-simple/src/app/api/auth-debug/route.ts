import { NextRequest, NextResponse } from 'next/server';
import { ServiceAccountAuth } from '@/lib/service-auth';

// Simple hash function for Edge Runtime compatibility
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export async function GET(request: NextRequest) {
  try {
    // Get all headers
    const headers = Object.fromEntries(request.headers.entries());
    
    // Manual basic auth parsing for debugging
    let basicAuthDebug = null;
    const authHeader = headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      try {
        const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        
        // Hash the password with current salt
        const salt = process.env.SERVICE_AUTH_SALT || 'default-salt-change-in-production';
        const hashedPassword = simpleHash(password + salt);
        
        basicAuthDebug = {
          username,
          passwordLength: password.length,
          hashedPassword,
          salt
        };
      } catch (e) {
        basicAuthDebug = { error: 'Failed to parse basic auth' };
      }
    }
    
    // Try to authenticate
    const authResult = ServiceAccountAuth.authenticate(request);
    
    // Get service accounts for debugging
    const serviceAccountsEnv = process.env.SERVICE_ACCOUNTS;
    let serviceAccountsInfo = null;
    
    if (serviceAccountsEnv) {
      try {
        const parsed = JSON.parse(serviceAccountsEnv);
        serviceAccountsInfo = {
          count: Object.keys(parsed).length,
          accounts: Object.keys(parsed),
          firstAccount: Object.values(parsed)[0] ? {
            name: (Object.values(parsed)[0] as any).name,
            username: (Object.values(parsed)[0] as any).username,
            hasPasswordHash: !!(Object.values(parsed)[0] as any).passwordHash,
            passwordHash: (Object.values(parsed)[0] as any).passwordHash,
            permissions: (Object.values(parsed)[0] as any).permissions
          } : null
        };
      } catch (e) {
        serviceAccountsInfo = { error: 'Failed to parse SERVICE_ACCOUNTS' };
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      headers: {
        authorization: headers.authorization ? 'present' : 'missing',
        'x-api-key': headers['x-api-key'] ? 'present' : 'missing',
        'user-agent': headers['user-agent']
      },
      basicAuthDebug,
      authResult: {
        success: authResult.success,
        error: authResult.error,
        method: authResult.method,
        accountId: authResult.account?.id,
        accountName: authResult.account?.name,
        permissions: authResult.account?.permissions
      },
      serviceAccounts: serviceAccountsInfo,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasServiceAccounts: !!process.env.SERVICE_ACCOUNTS,
        hasServiceAuthSalt: !!process.env.SERVICE_AUTH_SALT
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}