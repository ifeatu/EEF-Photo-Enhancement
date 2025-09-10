import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Protect admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (req.nextauth.token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }
    
    // Protect API admin routes (except set-user for bootstrap)
    if (req.nextUrl.pathname.startsWith("/api/admin")) {
      // Allow set-user endpoint for bootstrap scenario (handled by the endpoint itself)
      if (req.nextUrl.pathname === "/api/admin/set-user") {
        return NextResponse.next()
      }
      
      if (req.nextauth.token?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Unauthorized - Admin access required" },
          { status: 403 }
        )
      }
    }
    
    // API routes now handle their own authentication with withAuth wrapper
    // This ensures proper JSON error responses instead of redirects
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        if (req.nextUrl.pathname.startsWith("/api/auth")) {
          return true
        }
        
        // Allow access to public API routes
        if (req.nextUrl.pathname === "/api/health" || 
            req.nextUrl.pathname === "/api/status") {
          return true
        }
        
        // Allow set-user endpoint for bootstrap scenario
        if (req.nextUrl.pathname === "/api/admin/set-user") {
          return true
        }
        
        // For protected routes, require a valid token
        if (req.nextUrl.pathname.startsWith("/admin") ||
            req.nextUrl.pathname.startsWith("/api/admin") ||
            req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token
        }
        
        // Allow all other routes
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*"
    // Note: Removed /api/photos/* and /api/user/* from matcher
    // These routes handle their own authentication with withAuth wrapper
    // This prevents middleware redirects that break API JSON responses
  ]
}