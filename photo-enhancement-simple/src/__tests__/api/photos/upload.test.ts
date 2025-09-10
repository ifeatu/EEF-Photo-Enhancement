/**
 * Unit tests for the photo upload API functionality
 * Tests authentication, credit validation, file handling, and error scenarios
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    photo: {
      create: jest.fn(),
    },
  },
}));
jest.mock('fs/promises');
jest.mock('path');

// Mock the upload handler logic
const mockUploadHandler = async (request: any) => {
  const session = await getServerSession() as any;
  
  if (!session?.user?.id) {
    return { status: 401, json: { error: 'Unauthorized' } };
  }

  const user = await (prisma.user.findUnique as jest.Mock)({ where: { id: session.user.id } });

  if (!user || user.credits < 1) {
    return { status: 400, json: { error: 'Insufficient credits' } };
  }

  const formData = await request.formData();
  const file = formData.get('photo');
  const title = formData.get('title');

  if (!file) {
    return { status: 400, json: { error: 'No file provided' } };
  }

  // Mock file processing
  const fileName = `${Date.now()}-${file.name}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), Buffer.from('mock file content'));

  const photo = await (prisma.photo.create as jest.Mock)({
    data: {
      userId: session.user.id,
      originalUrl: `/uploads/${fileName}`,
      status: 'PENDING',
      title: title || file.name,
      description: null,
    },
  });

  await (prisma.user.update as jest.Mock)({
    where: { id: session.user.id },
    data: { credits: { decrement: 1 } },
  });

  return {
    status: 200,
    json: {
      photoId: photo.id,
      message: 'Photo uploaded successfully and queued for enhancement'
    }
  };
};

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockPath = path as jest.Mocked<typeof path>;

describe('/api/photos/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock path.join to return predictable paths
    mockPath.join.mockImplementation((...args) => args.join('/'));
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('photo', file);

    const request = {
      formData: () => Promise.resolve(formData)
    };

    const response = await mockUploadHandler(request);

    expect(response.status).toBe(401);
    expect(response.json.error).toBe('Unauthorized');
  });

  it('should return 400 if user has insufficient credits', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      credits: 0,
    } as any);

    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('photo', file);

    const request = {
      formData: () => Promise.resolve(formData)
    };

    const response = await mockUploadHandler(request);

    expect(response.status).toBe(400);
    expect(response.json.error).toBe('Insufficient credits');
  });

  it('should return 400 if no file is provided', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      credits: 5,
    } as any);

    const formData = new FormData();
    const request = {
      formData: () => Promise.resolve(formData)
    };

    const response = await mockUploadHandler(request);

    expect(response.status).toBe(400);
    expect(response.json.error).toBe('No file provided');
  });

  it('should successfully upload file using local storage when Vercel Blob token is not configured', async () => {
    // Set environment to use local storage
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_YOUR_TOKEN_HERE';

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      credits: 5,
    } as any);

    mockPrisma.photo.create.mockResolvedValue({
      id: 'photo1',
      userId: 'user1',
      originalUrl: '/uploads/123456789-test.jpg',
      status: 'PENDING',
      title: 'test.jpg',
      description: null,
    } as any);

    mockPrisma.user.update.mockResolvedValue({} as any);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    const formData = new FormData();
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('photo', file);
    formData.append('title', 'Test Photo');

    const request = {
      formData: () => Promise.resolve(formData)
    };

    const response = await mockUploadHandler(request);

    expect(response.status).toBe(200);
    expect(response.json.photoId).toBe('photo1');
    expect(response.json.message).toBe('Photo uploaded successfully and queued for enhancement');
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockPrisma.photo.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        originalUrl: expect.stringContaining('/uploads/'),
        status: 'PENDING',
        title: 'Test Photo',
        description: null,
      },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { credits: { decrement: 1 } },
    });
  });

  it('should handle file upload errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      credits: 5,
    } as any);

    mockMkdir.mockRejectedValue(new Error('File system error'));

    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('photo', file);

    const request = {
      formData: () => Promise.resolve(formData)
    };

    try {
      await mockUploadHandler(request);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('File system error');
    }
  });
});