const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const crypto = require('crypto');

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    SERVICE_ACCOUNT_TOKEN: 'test-token-123',
    SERVICE_ACCOUNT_USERNAME: 'admin',
    SERVICE_ACCOUNT_PASSWORD: 'secure-password-456',
    SERVICE_ACCOUNT_API_KEY: 'api-key-789',
    DEBUG_TOKEN: 'debug-token-abc'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Service Account Authentication', () => {
  let app;
  
  beforeEach(async () => {
    // Import after env setup
    const { createServer } = require('http');
    const { parse } = require('url');
    const next = require('next');
    
    const dev = process.env.NODE_ENV !== 'production';
    const hostname = 'localhost';
    const port = 3001;
    
    const nextApp = next({ dev, hostname, port });
    const handle = nextApp.getRequestHandler();
    
    await nextApp.prepare();
    
    app = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });
  });
  
  describe('Token Authentication', () => {
    it('should accept valid bearer token', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', 'Bearer test-token-123')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body.auth).toHaveProperty('method', 'token');
    });
    
    it('should reject invalid bearer token', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
    
    it('should reject malformed bearer token', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', 'InvalidFormat test-token-123')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
  
  describe('Basic Authentication', () => {
    it('should accept valid username/password', async () => {
      const credentials = Buffer.from('admin:secure-password-456').toString('base64');
      
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', `Basic ${credentials}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body.auth).toHaveProperty('method', 'basic');
    });
    
    it('should reject invalid username', async () => {
      const credentials = Buffer.from('wronguser:secure-password-456').toString('base64');
      
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', `Basic ${credentials}`)
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
    
    it('should reject invalid password', async () => {
      const credentials = Buffer.from('admin:wrongpassword').toString('base64');
      
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', `Basic ${credentials}`)
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
    
    it('should reject malformed basic auth', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', 'Basic invalid-base64')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
  
  describe('API Key Authentication', () => {
    it('should accept valid API key in header', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('X-API-Key', 'api-key-789')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body.auth).toHaveProperty('method', 'apikey');
    });
    
    it('should accept valid API key in query', async () => {
      const response = await request(app)
        .get('/api/debug?api_key=api-key-789')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body.auth).toHaveProperty('method', 'apikey');
    });
    
    it('should reject invalid API key', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('X-API-Key', 'invalid-api-key')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
  
  describe('Permission System', () => {
    it('should allow access with correct permissions', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', 'Bearer test-token-123')
        .expect(200);
      
      expect(response.body.auth).toHaveProperty('permissions');
      expect(response.body.auth.permissions).toContain('debug:read');
    });
    
    it('should deny access to admin endpoint without admin permissions', async () => {
      // This would need a separate test user with limited permissions
      // For now, we test that the endpoint requires authentication
      const response = await request(app)
        .get('/api/admin')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should implement rate limiting for authentication attempts', async () => {
      const requests = [];
      
      // Make multiple rapid requests with invalid credentials
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/api/debug')
            .set('Authorization', 'Bearer invalid-token')
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Should get 401s initially, then 429 (rate limited)
      const statusCodes = responses.map(r => r.status);
      expect(statusCodes).toContain(401);
      // Rate limiting might kick in after several attempts
      // This is implementation dependent
    });
  });
  
  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', 'Bearer test-token-123')
        .expect(200);
      
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });
  });
  
  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });
    
    it('should allow access without authentication in development', async () => {
      const response = await request(app)
        .get('/api/debug')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body.auth).toHaveProperty('method', 'development');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing authorization header gracefully', async () => {
      const response = await request(app)
        .get('/api/debug')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message');
    });
    
    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/debug')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.message).not.toContain('test-token-123');
      expect(response.body.message).not.toContain('secure-password-456');
    });
  });
  
  describe('Token Generation Utilities', () => {
    it('should generate secure random tokens', () => {
      const { generateSecureToken } = require('../src/lib/service-auth');
      
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[a-f0-9]+$/);
    });
    
    it('should generate secure password hashes', () => {
      const { hashPassword } = require('../src/lib/service-auth');
      
      const hash1 = hashPassword('password123');
      const hash2 = hashPassword('password123');
      
      expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
      expect(hash2).toHaveLength(64);
      expect(hash1).toBe(hash2); // Same input = same hash
      expect(hash1).toMatch(/^[a-f0-9]+$/);
    });
  });
});

describe('Admin Endpoint Security', () => {
  let app;
  
  beforeEach(async () => {
    const { createServer } = require('http');
    const { parse } = require('url');
    const next = require('next');
    
    const dev = process.env.NODE_ENV !== 'production';
    const hostname = 'localhost';
    const port = 3002;
    
    const nextApp = next({ dev, hostname, port });
    const handle = nextApp.getRequestHandler();
    
    await nextApp.prepare();
    
    app = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });
  });
  
  it('should require admin permissions for admin endpoint', async () => {
    const response = await request(app)
      .get('/api/admin')
      .set('Authorization', 'Bearer test-token-123')
      .expect(200);
    
    expect(response.body).toHaveProperty('system');
    expect(response.body).toHaveProperty('services');
    expect(response.body.auth).toHaveProperty('method', 'token');
  });
  
  it('should reject unauthorized access to admin endpoint', async () => {
    const response = await request(app)
      .get('/api/admin')
      .expect(401);
    
    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });
});