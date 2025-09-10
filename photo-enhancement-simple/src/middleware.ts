import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AuthMiddleware } from '@/middleware/auth'

/**
 * Next.js middleware that runs on every request
 * Handles authentication for protected routes
 */
export async function middleware(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResponse = await AuthMiddleware.protect(request);
    
    // If auth middleware returns a response, use it (auth failed)
    if (authResponse) {
      return authResponse;
    }
    
    // Continue to the next middleware or route handler
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Return a generic error response
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An error occurred while processing your request',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}