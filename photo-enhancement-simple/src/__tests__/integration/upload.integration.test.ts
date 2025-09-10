/**
 * Integration tests for file upload functionality
 * These tests verify the upload API endpoint behavior
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/photos/upload/route';

// Mock the dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

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

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

describe('Upload Integration Tests', () => {
  const { getServerSession } = require('next-auth/next');
  const { prisma } = require('@/lib/prisma');
  const { writeFile, mkdir } = require('fs/promises');

  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment for local storage
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_YOUR_TOKEN_HERE';
  });

  it('should complete full upload flow successfully', async () => {
    // Mock authenticated user with credits
    getServerSession.mockResolvedValue({
      user: { id: 'user123' },
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 'user123',
      credits: 5,
    });

    prisma.photo.create.mockResolvedValue({
      id: 'photo123',
      userId: 'user123',
      originalUrl: '/uploads/test-image.jpg',
      status: 'PENDING',
      title: 'Test Image',
    });

    prisma.user.update.mockResolvedValue({});
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);

    // Create test file
    const formData = new FormData();
    const testFile = new File(['test image content'], 'test-image.jpg', {
      type: 'image/jpeg',
    });
    formData.append('photo', testFile);
    formData.append('title', 'Test Image');

    const request = new NextRequest('http://localhost:3000/api/photos/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.photoId).toBe('photo123');
    expect(data.message).toBe('Photo uploaded successfully and queued for enhancement');

    // Verify database operations
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user123' },
      select: { credits: true },
    });

    expect(prisma.photo.create).toHaveBeenCalledWith({
      data: {
        userId: 'user123',
        originalUrl: expect.stringContaining('/uploads/'),
        status: 'PENDING',
        title: 'Test Image',
        description: null,
      },
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: { credits: { decrement: 1 } },
    });

    // Verify file system operations
    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalled();
  });

  it('should handle authentication failure', async () => {
    getServerSession.mockResolvedValue(null);

    const formData = new FormData();
    const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('photo', testFile);

    const request = new NextRequest('http://localhost:3000/api/photos/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should handle insufficient credits', async () => {
    getServerSession.mockResolvedValue({
      user: { id: 'user123' },
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 'user123',
      credits: 0,
    });

    const formData = new FormData();
    const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('photo', testFile);

    const request = new NextRequest('http://localhost:3000/api/photos/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Insufficient credits');
    expect(prisma.photo.create).not.toHaveBeenCalled();
  });

  it('should handle file system errors', async () => {
    getServerSession.mockResolvedValue({
      user: { id: 'user123' },
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 'user123',
      credits: 5,
    });

    mkdir.mockRejectedValue(new Error('Permission denied'));

    const formData = new FormData();
    const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('photo', testFile);

    const request = new NextRequest('http://localhost:3000/api/photos/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Upload failed');
  });
});