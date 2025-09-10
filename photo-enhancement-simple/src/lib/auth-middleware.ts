import { NextRequest, NextResponse } from 'next/server';
import { ServiceAccountAuth, AuthResult } from './service-auth';
import { logger } from './logger';

/**
 * Authentication middleware for protecting admin and debug endpoints
 */

export interface AuthMiddlewareOptions {
  requiredPermissions?: string[];
  allowDevelopment?: boolean;
  rateLimitKey?: string;
  logAccess?: boolean;
}

export interface AuthenticatedRequest extends NextRequest {
  serviceAccount?: AuthResult['account'];
  authMethod?: AuthResult['method'];
}

/**
 * Rate limiting for authentication attempts
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxAttempts = 10;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    if (record.count >= this.maxAttempts) {
      return true;
    }

    record.count++;
    return false;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  getAttempts(key: string): number {
    const record = this.attempts.get(key);
    return record?.count || 0;
  }
}

const rateLimiter = new RateLimiter();

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const {
    requiredPermissions = [],
    allowDevelopment = true,
    rateLimitKey,
    logAccess = true
  } = options;

  return async function authMiddleware(
    request: NextRequest
  ): Promise<NextResponse | { request: AuthenticatedRequest; authResult: AuthResult }> {
    const startTime = Date.now();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const path = request.nextUrl.pathname;
    
    // Rate limiting
    const limitKey = rateLimitKey || ip;
    if (rateLimiter.isRateLimited(limitKey)) {
      logger.warn('Rate limit exceeded for authentication', {
        ip,
        userAgent,
        path,
        attempts: rateLimiter.getAttempts(limitKey)
      });
      
      return NextResponse.json(
        { 
          error: 'Too many authentication attempts. Please try again later.',
          retryAfter: 900 // 15 minutes
        },
        { status: 429 }
      );
    }

    // Authenticate request
    const authResult = ServiceAccountAuth.authenticate(request);
    
    if (!authResult.success) {
      logger.warn('Authentication failed', {
        ip,
        userAgent,
        path,
        error: authResult.error,
        duration: Date.now() - startTime
      });
      
      return NextResponse.json(
        { 
          error: 'Authentication required',
          details: authResult.error,
          hint: 'Use Bearer token, Basic auth, or X-API-Key header'
        },
        { status: 401 }
      );
    }

    // Reset rate limit on successful auth
    rateLimiter.reset(limitKey);

    // Check permissions
    if (requiredPermissions.length > 0 && authResult.account) {
      const hasAllPermissions = requiredPermissions.every(permission => 
        ServiceAccountAuth.hasPermission(authResult.account!, permission)
      );
      
      if (!hasAllPermissions) {
        logger.warn('Insufficient permissions', {
          accountId: authResult.account.id,
          accountName: authResult.account.name,
          requiredPermissions,
          accountPermissions: authResult.account.permissions,
          ip,
          userAgent,
          path
        });
        
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            required: requiredPermissions,
            granted: authResult.account.permissions
          },
          { status: 403 }
        );
      }
    }

    // Log successful access
    if (logAccess) {
      logger.info('Authenticated access granted', {
        accountId: authResult.account?.id,
        accountName: authResult.account?.name,
        method: authResult.method,
        permissions: authResult.account?.permissions,
        ip,
        userAgent,
        path,
        duration: Date.now() - startTime
      });
    }

    // Create authenticated request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.serviceAccount = authResult.account;
    authenticatedRequest.authMethod = authResult.method;

    return { request: authenticatedRequest, authResult };
  };
}

/**
 * Wrapper for API routes that require authentication
 */
export function withAuth(
  handler: (request: AuthenticatedRequest, authResult: AuthResult) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  const middleware = createAuthMiddleware(options);
  
  return async function authenticatedHandler(request: NextRequest): Promise<NextResponse> {
    const result = await middleware(request);
    
    // If result is a NextResponse, it's an error response
    if (result instanceof NextResponse) {
      return result;
    }
    
    // Otherwise, call the handler with authenticated request
    return handler(result.request, result.authResult);
  };
}

/**
 * Quick auth check for simple endpoints
 */
export async function requireAuth(
  request: NextRequest,
  permissions: string[] = []
): Promise<{ success: true; account: AuthResult['account'] } | { success: false; response: NextResponse }> {
  const middleware = createAuthMiddleware({ 
    requiredPermissions: permissions,
    logAccess: false 
  });
  
  const result = await middleware(request);
  
  if (result instanceof NextResponse) {
    return { success: false, response: result };
  }
  
  return { success: true, account: result.authResult.account };
}

/**
 * Development-only auth bypass
 */
export function isDevelopmentBypass(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  
  const bypassHeader = request.headers.get('x-dev-bypass');
  return bypassHeader === 'true';
}

/**
 * Get client IP for rate limiting
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Security headers for admin endpoints
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}