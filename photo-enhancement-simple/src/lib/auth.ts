import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Adapter } from "next-auth/adapters";

// Dynamic provider configuration to avoid build-time Google service initialization
function getProviders() {
  const providers: any[] = [];
  
  // Skip provider loading during build phase
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL && !process.env.GOOGLE_CLIENT_ID) {
    return providers;
  }
  
  try {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const GoogleProvider = require("next-auth/providers/google").default;
      providers.push(
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID?.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
        })
      );
    }
  } catch (error) {
    // Silent failure during build
  }
  
  return providers;
}

export const authOptions: any = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: getProviders(),
  session: {
    strategy: "jwt",
  },
  // Ensure environment variables are properly trimmed
  secret: process.env.NEXTAUTH_SECRET?.trim(),
  // Explicitly set the base URL to force custom domain usage
  url: process.env.NEXTAUTH_URL?.trim(),
  callbacks: {
    session: async ({ session, token }: any) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
        
        // Fetch user role from database
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true }
        });
        
        if (user) {
          session.user.role = user.role;
        }
      }
      return session;
    },
    jwt: async ({ user, token }: any) => {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
    redirect: async ({ url, baseUrl }: any) => {
      // Force redirect to use custom domain instead of Vercel auto-generated URL
      const customDomain = process.env.NEXTAUTH_URL || baseUrl;
      
      // If url is relative, prepend custom domain
      if (url.startsWith('/')) {
        return `${customDomain}${url}`;
      }
      
      // If url is on the same origin as custom domain, allow it
      if (new URL(url).origin === new URL(customDomain).origin) {
        return url;
      }
      
      // Default to custom domain for all other cases
      return customDomain;
    },
  },
  // Using default NextAuth signin page
  // pages: {
  //   signIn: "/auth/signin",
  // },
};