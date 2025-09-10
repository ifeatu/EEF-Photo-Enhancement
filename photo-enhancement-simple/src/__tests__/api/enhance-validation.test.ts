import { NextRequest } from 'next/server';
import { POST } from '@/app/api/photos/enhance/route';
import { requireAuth } from '@/lib/api-auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    photo: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Import after mocking
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

jest.mock('@/lib/api-auth', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

describe('Photo Enhancement API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated session
    mockRequireAuth.mockResolvedValue({
      success: true,
      user: { id: 'user123', email: 'test@example.com', role: 'user', credits: 10 },
    });
  });

  it('should fail gracefully when photo not found', async () => {
    (mockPrisma.photo.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({ photoId: 'nonexistent' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('Photo not found');
  });

  it('should fail when photo is not in enhanceable status', async () => {
    (mockPrisma.photo.findFirst as jest.Mock).mockResolvedValue(null); // No photo found with PENDING/FAILED status

    const request = new NextRequest('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({ photoId: 'photo-123' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('Photo not found');
  });

  it('should require authentication', async () => {
    mockRequireAuth.mockResolvedValue({
      success: false,
      error: 'Authentication required',
      status: 401
    });

    const request = new NextRequest('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({ photoId: 'photo123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('Authentication required');
  });
});