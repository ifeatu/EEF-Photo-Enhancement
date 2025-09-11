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
    // Add credentials provider for email/password authentication
    const CredentialsProvider = require("next-auth/providers/credentials").default;
    providers.push(
      CredentialsProvider({
        id: "credentials",
        name: "Email and Password",
        credentials: {
          email: { 
            label: "Email", 
            type: "email", 
            placeholder: "your@email.com" 
          },
          password: { 
            label: "Password", 
            type: "password" 
          }
        },
        async authorize(credentials: any) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          try {
            const { authenticateWithPassword } = require('@/lib/user-management');
            const result = await authenticateWithPassword(credentials.email, credentials.password);
            
            if (result.success && result.user) {
              // Return user object for NextAuth
              return {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                image: result.user.image,
                role: result.user.role,
                credits: result.user.credits
              };
            }
            
            return null;
          } catch (error) {
            console.error('Credentials authentication error:', error);
            return null;
          }
        }
      })
    );

    // Add Google OAuth provider
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const GoogleProvider = require("next-auth/providers/google").default;
      providers.push(
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID?.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
          allowDangerousEmailAccountLinking: true,
        })
      );
    }
  } catch (error) {
    // Silent failure during build
    console.error('Error loading authentication providers:', error);
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
    signIn: async ({ user, account, profile, email, credentials }: any) => {
      // Allow all sign-ins, including account linking
      // The allowDangerousEmailAccountLinking option handles the linking
      try {
        console.log('SignIn attempt:', {
          provider: account?.provider,
          email: user?.email || email,
          userId: user?.id
        });
        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return true; // Still allow sign-in even if logging fails
      }
    },
    session: async ({ session, token }: any) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
        
        // Fetch user role and credits from database with retry logic
        let retries = 3;
        let user = null;
        
        while (retries > 0 && !user) {
          try {
            user = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { role: true, credits: true, email: true }
            });
            
            if (!user && retries > 1) {
              // Wait before retry to allow database transaction to complete
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            retries--;
          } catch (error) {
            console.error('Error fetching user data (attempt ' + (4 - retries) + '):', error);
            retries--;
            if (retries > 0) {
              // Wait before retry on database error
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
        
        // Set user role and credits
        session.user.role = user?.role || 'USER';
        session.user.credits = user?.credits || 3;
        
        // Ensure admin users have unlimited credits
        if (session.user.role === 'ADMIN' && session.user.credits < 999999) {
          try {
            const { isAdminWithUnlimitedCredits } = require('@/lib/user-management');
            const userObj = { role: session.user.role, credits: session.user.credits } as any;
            
            if (!isAdminWithUnlimitedCredits(userObj)) {
              // Update admin user to have unlimited credits
              await prisma.user.update({
                where: { id: token.sub },
                data: { credits: 999999 }
              });
              session.user.credits = 999999;
            }
          } catch (error) {
            console.error('Error updating admin credits:', error);
          }
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