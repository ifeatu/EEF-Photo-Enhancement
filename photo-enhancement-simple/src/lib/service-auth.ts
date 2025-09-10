import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Service Account Authentication System
 * Provides secure authentication for production troubleshooting and admin access
 */

export interface ServiceAccount {
  id: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
}

export interface AuthResult {
  success: boolean;
  account?: ServiceAccount;
  error?: string;
  method?: 'token' | 'basic' | 'api-key';
}

/**
 * Service account authentication methods
 */
export class ServiceAccountAuth {
  private static readonly HASH_ALGORITHM = 'sha256';
  private static readonly TOKEN_PREFIX = 'sa_';
  
  /**
   * Authenticate using Bearer token
   */
  static authenticateToken(request: NextRequest): AuthResult {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Missing or invalid authorization header' };
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Check for service account token
    if (token.startsWith(this.TOKEN_PREFIX)) {
      return this.validateServiceToken(token);
    }
    
    // Check for debug token (backward compatibility)
    const debugToken = process.env.DEBUG_TOKEN;
    if (debugToken && token === debugToken) {
      return {
        success: true,
        method: 'token',
        account: {
          id: 'debug-legacy',
          name: 'Legacy Debug Token',
          permissions: ['debug:read'],
          createdAt: new Date()
        }
      };
    }
    
    return { success: false, error: 'Invalid token' };
  }
  
  /**
   * Authenticate using Basic authentication (username:password)
   */
  static authenticateBasic(request: NextRequest): AuthResult {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return { success: false, error: 'Missing or invalid basic auth header' };
    }
    
    try {
      const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');
      
      if (!username || !password) {
        return { success: false, error: 'Invalid credentials format' };
      }
      
      return this.validateCredentials(username, password);
    } catch (error) {
      logger.warn('Failed to decode basic auth credentials', { error });
      return { success: false, error: 'Invalid credentials encoding' };
    }
  }
  
  /**
   * Authenticate using API key
   */
  static authenticateApiKey(request: NextRequest): AuthResult {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('x-service-key');
    
    if (!apiKey) {
      return { success: false, error: 'Missing API key' };
    }
    
    return this.validateApiKey(apiKey);
  }
  
  /**
   * Main authentication method - tries all available methods
   */
  static authenticate(request: NextRequest): AuthResult {
    // Log authentication attempt
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    logger.info('Service account authentication attempt', {
      ip,
      userAgent,
      path: request.nextUrl.pathname,
      method: request.method
    });
    
    // Try token authentication first
    const tokenAuth = this.authenticateToken(request);
    if (tokenAuth.success) {
      this.logSuccessfulAuth(tokenAuth, ip, userAgent);
      return tokenAuth;
    }
    
    // Try basic authentication
    const basicAuth = this.authenticateBasic(request);
    if (basicAuth.success) {
      this.logSuccessfulAuth(basicAuth, ip, userAgent);
      return basicAuth;
    }
    
    // Try API key authentication
    const apiKeyAuth = this.authenticateApiKey(request);
    if (apiKeyAuth.success) {
      this.logSuccessfulAuth(apiKeyAuth, ip, userAgent);
      return apiKeyAuth;
    }
    
    // Development mode fallback
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Allowing unauthenticated access in development mode');
      return {
        success: true,
        method: 'token',
        account: {
          id: 'dev-bypass',
          name: 'Development Mode',
          permissions: ['*'],
          createdAt: new Date()
        }
      };
    }
    
    // Log failed authentication
    logger.warn('Service account authentication failed', {
      ip,
      userAgent,
      path: request.nextUrl.pathname,
      errors: [tokenAuth.error, basicAuth.error, apiKeyAuth.error].filter(Boolean)
    });
    
    return { success: false, error: 'Authentication failed' };
  }
  
  /**
   * Check if account has specific permission
   */
  static hasPermission(account: ServiceAccount, permission: string): boolean {
    if (account.permissions.includes('*')) {
      return true;
    }
    
    return account.permissions.some(p => {
      // Support wildcard permissions like "debug:*"
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2);
        return permission.startsWith(prefix + ':');
      }
      return p === permission;
    });
  }
  
  /**
   * Validate service account token
   */
  private static validateServiceToken(token: string): AuthResult {
    const serviceTokens = this.getServiceTokens();
    
    for (const [accountId, config] of Object.entries(serviceTokens)) {
      // Check if token matches the generated token (with sa_ prefix)
      if (this.verifyToken(token, config.secret)) {
        return {
          success: true,
          method: 'token',
          account: {
            id: accountId,
            name: config.name,
            permissions: config.permissions,
            createdAt: new Date(config.createdAt)
          }
        };
      }
      
      // Also check if token matches the raw secret (backward compatibility)
      if (this.timingSafeEqual(token, config.secret)) {
        return {
          success: true,
          method: 'token',
          account: {
            id: accountId,
            name: config.name,
            permissions: config.permissions,
            createdAt: new Date(config.createdAt)
          }
        };
      }
    }
    
    return { success: false, error: 'Invalid service token' };
  }
  
  /**
   * Validate username/password credentials
   */
  private static validateCredentials(username: string, password: string): AuthResult {
    const serviceAccounts = this.getServiceAccounts();
    
    for (const [accountId, config] of Object.entries(serviceAccounts)) {
      if (config.username === username && this.verifyPassword(password, config.passwordHash)) {
        return {
          success: true,
          method: 'basic',
          account: {
            id: accountId,
            name: config.name,
            permissions: config.permissions,
            createdAt: new Date(config.createdAt)
          }
        };
      }
    }
    
    return { success: false, error: 'Invalid credentials' };
  }
  
  /**
   * Validate API key
   */
  private static validateApiKey(apiKey: string): AuthResult {
    const apiKeys = this.getApiKeys();
    
    for (const [accountId, config] of Object.entries(apiKeys)) {
      if (this.verifyApiKey(apiKey, config.keyHash)) {
        return {
          success: true,
          method: 'api-key',
          account: {
            id: accountId,
            name: config.name,
            permissions: config.permissions,
            createdAt: new Date(config.createdAt)
          }
        };
      }
    }
    
    return { success: false, error: 'Invalid API key' };
  }
  
  /**
   * Get service tokens from environment
   */
  private static getServiceTokens(): Record<string, any> {
    const tokens = process.env.SERVICE_TOKENS;
    if (!tokens) return {};
    
    try {
      return JSON.parse(tokens);
    } catch (error) {
      logger.error('Failed to parse SERVICE_TOKENS', { error });
      return {};
    }
  }
  
  /**
   * Get service accounts from environment
   */
  private static getServiceAccounts(): Record<string, any> {
    const accounts = process.env.SERVICE_ACCOUNTS;
    if (!accounts) return {};
    
    try {
      return JSON.parse(accounts);
    } catch (error) {
      logger.error('Failed to parse SERVICE_ACCOUNTS', { error });
      return {};
    }
  }
  
  /**
   * Get API keys from environment
   */
  private static getApiKeys(): Record<string, any> {
    const keys = process.env.SERVICE_API_KEYS;
    if (!keys) return {};
    
    try {
      return JSON.parse(keys);
    } catch (error) {
      logger.error('Failed to parse SERVICE_API_KEYS', { error });
      return {};
    }
  }
  
  /**
   * Verify token against secret
   */
  private static verifyToken(token: string, secret: string): boolean {
    try {
      const expectedToken = this.generateToken(secret);
      return this.timingSafeEqual(token, expectedToken);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Verify password against hash
   */
  private static verifyPassword(password: string, hash: string): boolean {
    try {
      const expectedHash = this.hashPassword(password);
      return this.timingSafeEqual(hash, expectedHash);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Verify API key against hash
   */
  private static verifyApiKey(apiKey: string, hash: string): boolean {
    try {
      const expectedHash = this.hashApiKey(apiKey);
      return this.timingSafeEqual(hash, expectedHash);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Generate token from secret
   */
  private static generateToken(secret: string): string {
    const hash = this.sha256(secret);
    return `${this.TOKEN_PREFIX}${hash}`;
  }
  
  /**
   * Hash password
   */
  private static hashPassword(password: string): string {
    const salt = process.env.SERVICE_AUTH_SALT || 'default-salt-change-in-production';
    return this.sha256(password + salt);
  }
  
  /**
   * Hash API key
   */
  private static hashApiKey(apiKey: string): string {
    return this.sha256(apiKey);
  }
  
  /**
   * SHA256 hash using Web Crypto API
   */
  private static sha256(data: string): string {
    // Simple hash for Edge Runtime compatibility
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  
  /**
   * Timing-safe string comparison
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
  
  /**
   * Log successful authentication
   */
  private static logSuccessfulAuth(authResult: AuthResult, ip: string, userAgent: string): void {
    logger.info('Service account authentication successful', {
      accountId: authResult.account?.id,
      accountName: authResult.account?.name,
      method: authResult.method,
      permissions: authResult.account?.permissions,
      ip,
      userAgent
    });
  }
}

/**
 * Utility functions for service account management
 */
export class ServiceAccountUtils {
  /**
   * Generate a new service token
   */
  static generateServiceToken(secret: string): string {
    const hash = ServiceAccountAuth['sha256'](secret);
    return `sa_${hash}`;
  }
  
  /**
   * Hash a password for storage
   */
  static hashPassword(password: string): string {
    const salt = process.env.SERVICE_AUTH_SALT || 'default-salt-change-in-production';
    return ServiceAccountAuth['sha256'](password + salt);
  }
  
  /**
   * Hash an API key for storage
   */
  static hashApiKey(apiKey: string): string {
    return ServiceAccountAuth['sha256'](apiKey);
  }
  
  /**
   * Generate a secure random API key
   */
  static generateApiKey(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Generate a secure random secret
   */
  static generateSecret(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}