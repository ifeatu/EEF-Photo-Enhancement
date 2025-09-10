// Jest setup for Node.js environment (API tests)

// Polyfill for TextDecoder/TextEncoder if not available
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}

// Mock environment variables
process.env.GOOGLE_AI_API_KEY = 'test-api-key';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3001';
process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};