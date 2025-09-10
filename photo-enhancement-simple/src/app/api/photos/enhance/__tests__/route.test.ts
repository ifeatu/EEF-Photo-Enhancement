import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
// Dynamic import for Google AI to avoid build-time evaluation
import { put } from '@vercel/blob';

// Mock dependencies
jest.mock('next-auth/next');
const mockPrisma = {
  photo: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));
// Mock will be set up dynamically
jest.mock('@vercel/blob');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPut = put as jest.MockedFunction<typeof put>;

// Mock fetch globally
global.fetch = jest.fn();

describe('/api/photos/enhance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_AI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY;
  });

  it('should require authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({ photoId: 'test-photo-id' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should require photoId in request body', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    const request = new NextRequest('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Photo ID is required');
  });

  it('should return 404 if photo not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    (mockPrisma.photo.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({ photoId: 'non-existent-photo' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Photo not found');
  });

  it('should handle Nano Banana enhancement successfully', async () => {
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    // Mock photo data
    const mockPhoto = {
      id: 'photo-1',
      userId: 'user-1',
      originalUrl: 'https://example.com/photo.jpg',
      status: 'uploaded',
    };
    (mockPrisma.photo.findUnique as jest.Mock).mockResolvedValue(mockPhoto as any);

    // Mock user data
    const mockUser = {
      id: 'user-1',
      credits: 10,
    };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);

    // Mock fetch for image download
    const mockImageBuffer = Buffer.from('fake-image-data');
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageBuffer.buffer),
    } as any);

    // Mock Gemini AI response
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                data: 'enhanced-image-base64-data',
                mimeType: 'image/png'
              }
            }]
          }
        }]
      }
    });

    const mockModel = {
      generateContent: mockGenerateContent,
    };

    const mockGenAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModel),
    };

    // Mock will be set up dynamically in each test

    // Mock Vercel Blob upload
    mockPut.mockResolvedValue({
      url: 'https://blob.vercel-storage.com/enhanced_123456789.png',
    } as any);

    // Mock database updates
    (mockPrisma.photo.update as jest.Mock).mockResolvedValue({
      ...mockPhoto,
      enhancedUrl: 'https://blob.vercel-storage.com/enhanced_123456789.png',
      status: 'enhanced',
    } as any);

    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      ...mockUser,
      credits: 9,
    } as any);

    const request = new NextRequest('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({ photoId: 'photo-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.enhancedUrl).toBe('https://blob.vercel-storage.com/enhanced_123456789.png');
    expect(mockGenerateContent).toHaveBeenCalledWith([
      expect.stringContaining('Enhance this photo to professional quality'),
      {
        inlineData: {
          data: expect.any(String),
          mimeType: 'image/jpeg'
        }
      }
    ]);
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringMatching(/enhanced_\d+\.png/),
      expect.any(Buffer),
      {
        access: 'public',
        contentType: 'image/png'
      }
    );
  });

  it('should handle insufficient credits', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    const mockPhoto = {
      id: 'photo-1',
      userId: 'user-1',
      originalUrl: 'https://example.com/photo.jpg',
      status: 'uploaded',
    };
    (mockPrisma.photo.findUnique as jest.Mock).mockResolvedValue(mockPhoto as any);

    const mockUser = {
      id: 'user-1',
      credits: 0, // No credits
    };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);

    const request = new NextRequest('http://localhost:3001/api/photos/enhance', {
      method: 'POST',
      body: JSON.stringify({ photoId: 'photo-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Insufficient credits');
  });
});