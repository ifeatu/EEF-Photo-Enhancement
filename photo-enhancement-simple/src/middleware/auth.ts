import { NextRequest, NextResponse } from 'next/server';
import { ServiceAccountAuth } from '@/lib/service-auth';
import { logger } from '@/lib/logger';

/**
 * Authentication middleware for protecting admin and debug endpoints
 */
export class AuthMiddleware {
  /**
   * Middleware function to protect routes requiring authentication
   */
  static async protect(request: NextRequest): Promise<NextResponse | null> {
    const pathname = request.nextUrl.pathname;
    
    // Skip authentication for non-protected routes
    if (!AuthMiddleware.isProtectedRoute(pathname)) {
      return null; // Continue to next middleware/handler
    }
    
    // Skip authentication in development mode for convenience
    if (process.env.NODE_ENV === 'development') {
      logger.info('Bypassing authentication in development mode', {
        path: pathname,
        ip: AuthMiddleware.getClientIP(request)
      });
      return null;
    }
    
    // Authenticate the request
    const authResult = ServiceAccountAuth.authenticate(request);
    
    if (!authResult.success) {
      logger.warn('Authentication failed for protected route', {
        path: pathname,
        ip: AuthMiddleware.getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        error: authResult.error
      });
      
      return new NextResponse(
        JSON.stringify({
          error: 'Authentication required',
          message: 'This endpoint requires valid service account credentials',
          timestamp: new Date().toISOString()
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Basic realm="Service Account", charset="UTF-8"'
          }
        }
      );
    }
    
    // Check permissions for the specific route
    const requiredPermission = AuthMiddleware.getRequiredPermission(pathname);
    if (requiredPermission && !AuthMiddleware.hasPermission(authResult.account!, requiredPermission)) {
      logger.warn('Insufficient permissions for protected route', {
        path: pathname,
        accountId: authResult.account?.id,
        requiredPermission,
        accountPermissions: authResult.account?.permissions,
        ip: AuthMiddleware.getClientIP(request)
      });
      
      return new NextResponse(
        JSON.stringify({
          error: 'Insufficient permissions',
          message: `This endpoint requires '${requiredPermission}' permission`,
          timestamp: new Date().toISOString()
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Log successful authentication
    logger.info('Authenticated access to protected route', {
      path: pathname,
      accountId: authResult.account?.id,
      accountName: authResult.account?.name,
      method: authResult.method,
      ip: AuthMiddleware.getClientIP(request)
    });
    
    // Add authentication info to request headers for downstream handlers
    const response = NextResponse.next();
    response.headers.set('x-auth-account-id', authResult.account?.id || '');
    response.headers.set('x-auth-account-name', authResult.account?.name || '');
    response.headers.set('x-auth-method', authResult.method || '');
    
    return null; // Continue to next middleware/handler
  }
  
  /**
   * Check if a route requires authentication
   */
  private static isProtectedRoute(pathname: string): boolean {
    const protectedPaths = [
      '/api/admin',
      '/api/debug',
      '/api/auth-debug', // Only in production
      '/api/health/detailed',
      '/api/metrics',
      '/api/alerts'
    ];
    
    // auth-debug is only protected in production
    if (pathname === '/api/auth-debug' && process.env.NODE_ENV === 'development') {
      return false;
    }
    
    return protectedPaths.some(path => pathname.startsWith(path));
  }
  
  /**
   * Get required permission for a specific route
   */
  private static getRequiredPermission(pathname: string): string | null {
    const permissionMap: Record<string, string> = {
      '/api/admin': 'admin:read',
      '/api/debug': 'debug:read',
      '/api/auth-debug': 'debug:read',
      '/api/health/detailed': 'health:read',
      '/api/metrics': 'metrics:read',
      '/api/alerts': 'alerts:read'
    };
    
    // Check for exact matches first
    if (permissionMap[pathname]) {
      return permissionMap[pathname];
    }
    
    // Check for prefix matches
    for (const [path, permission] of Object.entries(permissionMap)) {
      if (pathname.startsWith(path)) {
        return permission;
      }
    }
    
    return null;
  }
  
  /**
   * Check if an account has the required permission
   */
  private static hasPermission(account: any, requiredPermission: string): boolean {
    if (!account || !account.permissions) {
      return false;
    }
    
    // Check for wildcard permission
    if (account.permissions.includes('*')) {
      return true;
    }
    
    // Check for exact permission match
    if (account.permissions.includes(requiredPermission)) {
      return true;
    }
    
    // Check for wildcard category permissions (e.g., 'admin:*' for 'admin:read')
    const [category] = requiredPermission.split(':');
    if (account.permissions.includes(`${category}:*`)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get client IP address from request
   */
  private static getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }
    
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    
    // Fallback when no IP headers are available
    return 'unknown';
  }
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuth(handler: (request: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    // Check authentication
    const authResponse = await AuthMiddleware.protect(request);
    if (authResponse) {
      return authResponse; // Return auth error response
    }
    
    // Continue to the original handler
    return handler(request, context);
  };
}

/**
 * Utility function to get authenticated account info from request headers
 */
export function getAuthenticatedAccount(request: NextRequest) {
  return {
    id: request.headers.get('x-auth-account-id') || null,
    name: request.headers.get('x-auth-account-name') || null,
    method: request.headers.get('x-auth-method') || null
  };
}