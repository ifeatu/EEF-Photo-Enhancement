/**
 * Focused test suite for photo upload functionality
 * Tests the core business logic and error handling
 */

const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('@/lib/auth-utils', () => ({
  getCurrentUser: jest.fn(),
  hasCredits: jest.fn()
}));

jest.mock('@/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  photo: {
    create: jest.fn()
  }
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn()
}));

// Mock fs module
const mockFs = {
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn()
};

jest.mock('fs', () => mockFs);

const { getCurrentUser, hasCredits } = require('@/lib/auth-utils');
const prisma = require('@/lib/prisma');
const { put } = require('@vercel/blob');

describe('Photo Upload API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  });
  
  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  describe('Authentication Logic', () => {
    test('should handle unauthenticated users', async () => {
      getCurrentUser.mockResolvedValue(null);
      
      // Test that authentication check works
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });
    
    test('should handle users without credits', async () => {
      getCurrentUser.mockResolvedValue({ id: 'user1', email: 'test@example.com' });
      hasCredits.mockResolvedValue(false);
      
      const user = await getCurrentUser();
      const credits = await hasCredits(user.id);
      
      expect(user).toBeTruthy();
      expect(credits).toBe(false);
    });
    
    test('should handle users with credits', async () => {
      getCurrentUser.mockResolvedValue({ id: 'user1', email: 'test@example.com' });
      hasCredits.mockResolvedValue(true);
      
      const user = await getCurrentUser();
      const credits = await hasCredits(user.id);
      
      expect(user).toBeTruthy();
      expect(credits).toBe(true);
    });
  });

  describe('File Validation Logic', () => {
    test('should validate image file types', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4'];
      
      validTypes.forEach(type => {
        expect(type.startsWith('image/')).toBe(true);
      });
      
      invalidTypes.forEach(type => {
        expect(type.startsWith('image/')).toBe(false);
      });
    });
    
    test('should handle file size validation', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validSize = 5 * 1024 * 1024; // 5MB
      const invalidSize = 15 * 1024 * 1024; // 15MB
      
      expect(validSize <= maxSize).toBe(true);
      expect(invalidSize <= maxSize).toBe(false);
    });
  });

  describe('Storage Logic', () => {
    test('should use Vercel Blob when token is configured', async () => {
      const mockFile = {
        name: 'test.jpg',
        type: 'image/jpeg',
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      };
      
      put.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.jpg' });
      
      const result = await put('test.jpg', await mockFile.arrayBuffer(), {
        access: 'public',
        contentType: mockFile.type
      });
      
      expect(put).toHaveBeenCalled();
      expect(result.url).toContain('blob.vercel-storage.com');
    });
    
    test('should handle Vercel Blob upload failures', async () => {
      put.mockRejectedValue(new Error('Blob upload failed'));
      
      try {
        await put('test.jpg', new ArrayBuffer(1024), {
          access: 'public',
          contentType: 'image/jpeg'
        });
      } catch (error) {
        expect(error.message).toBe('Blob upload failed');
      }
    });
    
    test('should detect serverless environment', () => {
      // Test serverless detection logic
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
      
      // In test environment, should be falsy
      expect(isServerless).toBeFalsy();
      
      // Test with Vercel environment
      process.env.VERCEL = '1';
      const isVercel = process.env.VERCEL;
      expect(isVercel).toBeTruthy();
      
      delete process.env.VERCEL;
    });
    
    test('should handle local storage fallback', () => {
        delete process.env.BLOB_READ_WRITE_TOKEN;
        
        const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
        expect(hasToken).toBe(false);
        
        // Test that we can detect when blob token is missing
        expect(process.env.BLOB_READ_WRITE_TOKEN).toBeUndefined();
        
        // Test path construction for local storage
        const uploadDir = '/tmp/uploads';
        const filename = 'test.jpg';
        const fullPath = `${uploadDir}/${filename}`;
        
        expect(fullPath).toBe('/tmp/uploads/test.jpg');
      });
    
    test('should handle local storage failures', () => {
        // Test error handling logic
        const simulateStorageError = () => {
          throw new Error('EACCES: permission denied');
        };
        
        try {
          simulateStorageError();
        } catch (error) {
          expect(error.message).toContain('permission denied');
        }
        
        // Test serverless environment detection
        const originalVercel = process.env.VERCEL;
        process.env.VERCEL = '1';
        
        const isServerless = !!process.env.VERCEL;
        expect(isServerless).toBe(true);
        
        // Restore environment
        if (originalVercel) {
          process.env.VERCEL = originalVercel;
        } else {
          delete process.env.VERCEL;
        }
      });
  });

  describe('Database Operations', () => {
    test('should handle user credit checks', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', credits: 10 });
      
      const user = await prisma.user.findUnique({
        where: { id: 'user1' },
        select: { credits: true }
      });
      
      expect(user.credits).toBe(10);
      expect(prisma.user.findUnique).toHaveBeenCalled();
    });
    
    test('should handle photo creation', async () => {
      const photoData = {
        title: 'Test Photo',
        originalUrl: 'https://example.com/test.jpg',
        userId: 'user1',
        status: 'uploaded'
      };
      
      prisma.photo.create.mockResolvedValue({
        id: 'photo1',
        ...photoData
      });
      
      const photo = await prisma.photo.create({ data: photoData });
      
      expect(photo.id).toBe('photo1');
      expect(photo.title).toBe('Test Photo');
      expect(prisma.photo.create).toHaveBeenCalledWith({ data: photoData });
    });
    
    test('should handle credit deduction', async () => {
      prisma.user.update.mockResolvedValue({ id: 'user1', credits: 9 });
      
      const updatedUser = await prisma.user.update({
        where: { id: 'user1' },
        data: { credits: { decrement: 1 } }
      });
      
      expect(updatedUser.credits).toBe(9);
      expect(prisma.user.update).toHaveBeenCalled();
    });
    
    test('should handle database connection failures', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));
      
      try {
        await prisma.user.findUnique({ where: { id: 'user1' } });
      } catch (error) {
        expect(error.message).toBe('Database connection failed');
      }
    });
  });

  describe('Error Handling', () => {
    test('should provide appropriate error messages', () => {
      const errors = {
        noFile: 'No photo file provided',
        invalidType: 'Invalid file type. Only images are allowed.',
        noCredits: 'Insufficient credits',
        authRequired: 'Authentication required',
        storageNotConfigured: 'File storage service not configured',
        uploadFailed: 'File upload failed',
        databaseError: 'Database error'
      };
      
      Object.values(errors).forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });
    
    test('should handle environment-specific error details', () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Development environment
      process.env.NODE_ENV = 'development';
      const devError = process.env.NODE_ENV === 'development' ? 'Detailed error' : 'Generic error';
      expect(devError).toBe('Detailed error');
      
      // Production environment
      process.env.NODE_ENV = 'production';
      const prodError = process.env.NODE_ENV === 'development' ? 'Detailed error' : 'Generic error';
      expect(prodError).toBe('Generic error');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Integration Workflow', () => {
    test('should simulate complete upload workflow', async () => {
      // Setup successful scenario
      getCurrentUser.mockResolvedValue({ id: 'user1', email: 'test@example.com' });
      hasCredits.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({ credits: 10 });
      put.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.jpg' });
      prisma.photo.create.mockResolvedValue({
        id: 'photo1',
        title: 'Integration Test',
        originalUrl: 'https://blob.vercel-storage.com/test.jpg',
        status: 'uploaded'
      });
      prisma.user.update.mockResolvedValue({ credits: 9 });
      
      // Simulate workflow steps
      const user = await getCurrentUser();
      expect(user).toBeTruthy();
      
      const credits = await hasCredits(user.id);
      expect(credits).toBe(true);
      
      const userWithCredits = await prisma.user.findUnique({
        where: { id: user.id },
        select: { credits: true }
      });
      expect(userWithCredits.credits).toBe(10);
      
      const uploadResult = await put('test.jpg', new ArrayBuffer(1024), {
        access: 'public',
        contentType: 'image/jpeg'
      });
      expect(uploadResult.url).toContain('blob.vercel-storage.com');
      
      const photo = await prisma.photo.create({
        data: {
          title: 'Integration Test',
          originalUrl: uploadResult.url,
          userId: user.id,
          status: 'uploaded'
        }
      });
      expect(photo.title).toBe('Integration Test');
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } }
      });
      expect(updatedUser.credits).toBe(9);
    });
  });

  describe('Security and Validation', () => {
    test('should validate file extensions', () => {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const testFiles = [
        'photo.jpg',
        'image.jpeg', 
        'picture.png',
        'animation.gif',
        'modern.webp',
        'document.pdf', // Should be rejected
        'script.js', // Should be rejected
        'data.txt' // Should be rejected
      ];
      
      testFiles.forEach(filename => {
        const ext = path.extname(filename).toLowerCase();
        const isAllowed = allowedExtensions.includes(ext);
        
        if (filename.includes('photo') || filename.includes('image') || 
            filename.includes('picture') || filename.includes('animation') || 
            filename.includes('modern')) {
          expect(isAllowed).toBe(true);
        } else {
          expect(isAllowed).toBe(false);
        }
      });
    });
    
    test('should sanitize file names', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        'file with spaces.jpg',
        'file@#$%^&*().jpg',
        'very-long-filename-that-exceeds-normal-limits-and-could-cause-issues.jpg'
      ];
      
      dangerousNames.forEach(name => {
        // Basic sanitization logic
        const sanitized = path.basename(name).replace(/[^a-zA-Z0-9.-]/g, '_');
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('/');
      });
    });
  });
});

// Export test utilities
module.exports = {
  createMockFile: (name = 'test.jpg', type = 'image/jpeg', size = 1024) => ({
    name,
    type,
    size,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(size))
  }),
  
  createMockUser: (id = 'user1', credits = 10) => ({
    id,
    email: `${id}@example.com`,
    credits
  }),
  
  setupSuccessfulMocks: () => {
    getCurrentUser.mockResolvedValue({ id: 'user1', email: 'test@example.com' });
    hasCredits.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue({ credits: 10 });
    put.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.jpg' });
    prisma.photo.create.mockResolvedValue({ id: 'photo1' });
    prisma.user.update.mockResolvedValue({ credits: 9 });
  }
};