import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('OAuth Flow Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('Google OAuth Provider Configuration', () => {
    it('should have Google provider configured', () => {
      const googleProvider = authOptions.providers.find(
        (provider: any) => provider.id === 'google'
      );
      
      expect(googleProvider).toBeDefined();
      expect(googleProvider?.type).toBe('oauth');
      expect(googleProvider?.options?.clientId).toBeDefined();
      expect(googleProvider?.options?.clientSecret).toBeDefined();
    });

    it('should have correct authorization URL', () => {
      const googleProvider = authOptions.providers.find(
        (provider: any) => provider.id === 'google'
      );
      
      expect(googleProvider?.wellKnown).toContain('accounts.google.com');
    });
  });

  describe('OAuth Callback Configuration', () => {
    it('should have correct callback URL configuration', () => {
      const expectedCallbackUrl = 'http://localhost:3001/api/auth/callback/google';
      const baseUrl = process.env.NEXTAUTH_URL;
      const callbackUrl = `${baseUrl}/api/auth/callback/google`;
      
      expect(callbackUrl).toBe(expectedCallbackUrl);
    });

    it('should have proper OAuth scopes configured', () => {
      const googleProvider = authOptions.providers.find(
        (provider: any) => provider.id === 'google'
      );
      
      expect(googleProvider?.authorization?.params?.scope).toContain('openid');
      expect(googleProvider?.authorization?.params?.scope).toContain('email');
      expect(googleProvider?.authorization?.params?.scope).toContain('profile');
    });
  });

  describe('Database Integration', () => {
    it('should have Prisma adapter configured', () => {
      expect(authOptions.adapter).toBeDefined();
    });

    it('should connect to database successfully', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });

    it('should have User and Account models available', async () => {
      // Test that we can query the models without errors
      await expect(prisma.user.findMany()).resolves.toBeDefined();
      await expect(prisma.account.findMany()).resolves.toBeDefined();
    });
  });

  describe('Session Configuration', () => {
    it('should have JWT strategy configured', () => {
      expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('should have session strategy configured', () => {
      expect(authOptions.session?.strategy).toBeDefined();
      expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('should have JWT strategy enabled', () => {
      expect(authOptions.session?.strategy).toBe('jwt');
      expect(authOptions.callbacks?.jwt).toBeDefined();
    });
  });

  describe('Callbacks Configuration', () => {
    it('should have JWT callback configured', () => {
      expect(authOptions.callbacks?.jwt).toBeDefined();
      expect(typeof authOptions.callbacks?.jwt).toBe('function');
    });

    it('should have session callback configured', () => {
      expect(authOptions.callbacks?.session).toBeDefined();
      expect(typeof authOptions.callbacks?.session).toBe('function');
    });

    it('should have session callback configured', () => {
      expect(authOptions.callbacks?.session).toBeDefined();
      expect(typeof authOptions.callbacks?.session).toBe('function');
    });
  });

  describe('Environment Variables', () => {
    it('should have required environment variables', () => {
      expect(process.env.GOOGLE_CLIENT_ID).toBeDefined();
      expect(process.env.GOOGLE_CLIENT_SECRET).toBeDefined();
      expect(process.env.NEXTAUTH_SECRET).toBeDefined();
      expect(process.env.NEXTAUTH_URL).toBeDefined();
    });

    it('should have database connection string', () => {
      expect(process.env.POSTGRES_PRISMA_URL).toBeDefined();
      expect(process.env.POSTGRES_PRISMA_URL).not.toBe('');
    });
  });
});