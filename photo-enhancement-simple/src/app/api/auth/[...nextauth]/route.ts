import NextAuth from "next-auth/next"
import { authOptions } from "@/lib/auth"

// NextAuth v4 handler for Next.js 13+ App Router
const handler = NextAuth(authOptions)

// Export the handler for both GET and POST requests
export { handler as GET, handler as POST }