/**
 * Centralized Configuration System
 * Addresses critical dev/prod inconsistencies identified in debugging journey
 */

export const APP_CONFIG = {
  // Port standardization - CRITICAL FIX for port conflicts
  DEV_PORT: 3000,
  
  // URL Configuration - Environment-aware
  PROD_URL: process.env.NEXTAUTH_URL || 'https://your-app.vercel.app',
  DEV_URL: 'http://localhost:3000', // STANDARDIZED from mixed 3000/3001
  
  // Environment Detection
  IS_PRODUCTION: process.env.VERCEL_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PREVIEW: process.env.VERCEL_ENV === 'preview',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
  
  // API Configuration
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // NextAuth Configuration
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  
  // OAuth Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  
  // Serverless Optimization Settings
  SERVERLESS_TIMEOUTS: {
    FUNCTION_MAX: 60000,     // Vercel function limit
    GEMINI_API: 45000,       // Safety margin for Gemini calls  
    IMAGE_DOWNLOAD: 10000,   // Image fetch timeout
    DATABASE_QUERY: 5000     // Database operation timeout
  },
  
  // Memory and Size Limits
  LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
    MAX_MEMORY_USAGE: 900 * 1024 * 1024, // 900MB (safety margin)
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'] as const
  },
  
  // Retry Configuration
  RETRY_CONFIG: {
    MAX_RETRIES: 2,
    BACKOFF_MULTIPLIER: 2,
    BASE_DELAY: 1000
  }
} as const;

/**
 * Get the correct base URL based on environment
 * CRITICAL: Eliminates URL resolution inconsistencies
 */
export function getBaseUrl(): string {
  // Production/Preview: Use NEXTAUTH_URL
  if (APP_CONFIG.IS_PRODUCTION || APP_CONFIG.IS_PREVIEW) {
    return APP_CONFIG.PROD_URL;
  }
  
  // Development: Always localhost:3000 (STANDARDIZED)
  return APP_CONFIG.DEV_URL;
}

/**
 * Environment validation - ensure required vars are present
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required for all environments
  if (!APP_CONFIG.GOOGLE_AI_API_KEY) {
    errors.push('GOOGLE_AI_API_KEY is required');
  }
  
  if (!APP_CONFIG.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  }
  
  // Database requirements
  if (APP_CONFIG.IS_PRODUCTION) {
    if (!APP_CONFIG.POSTGRES_PRISMA_URL) {
      errors.push('POSTGRES_PRISMA_URL is required in production');
    }
    if (!APP_CONFIG.POSTGRES_URL_NON_POOLING) {
      errors.push('POSTGRES_URL_NON_POOLING is required in production');
    }
  }
  
  // Payment requirements (if Stripe configured)
  if (APP_CONFIG.STRIPE_SECRET_KEY && !APP_CONFIG.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is required when Stripe is configured');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get environment-appropriate logging level
 */
export function getLogLevel(): 'error' | 'warn' | 'info' | 'debug' {
  if (APP_CONFIG.IS_PRODUCTION) return 'error';
  if (APP_CONFIG.IS_PREVIEW) return 'warn';
  return 'debug';
}

/**
 * Get Gemini model configuration with environment optimization
 */
export function getGeminiConfig() {
  return {
    model: 'gemini-2.0-flash-exp',
    timeout: APP_CONFIG.SERVERLESS_TIMEOUTS.GEMINI_API,
    maxRetries: APP_CONFIG.RETRY_CONFIG.MAX_RETRIES
  };
}