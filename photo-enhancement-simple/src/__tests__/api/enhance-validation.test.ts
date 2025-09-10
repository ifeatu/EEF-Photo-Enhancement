import { NextRequest } from 'next/server';
import { POST } from '@/app/api/photos/enhance/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    photo: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('Photo Enhancement API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' },
    } as any);
  });

  it('should fail gracefully when photo not found', async () => {
    mockPrisma.photo.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/photos/enhance', {
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

  it('should fail when photo is already enhanced', async () => {
    mockPrisma.photo.findUnique.mockResolvedValue({
      id: 'photo123',
      userId: 'user123',
      status: 'COMPLETED',
      enhancedUrl: 'https://example.com/enhanced.jpg',
      originalUrl: 'https://example.com/original.jpg',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({ photoId: 'photo123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('already been enhanced');
  });

  it('should require authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/photos/enhance', {
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