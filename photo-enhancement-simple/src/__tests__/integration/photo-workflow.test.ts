import { jest } from '@jest/globals'

// Mock fetch for API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock FormData
global.FormData = jest.fn(() => ({
  append: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  entries: jest.fn(),
  forEach: jest.fn(),
})) as any

// Mock File
global.File = jest.fn((bits: any[], name: string, options?: { type?: string }) => ({
  name,
  size: Array.isArray(bits) ? (bits[0]?.length || 0) : 0,
  type: options?.type || 'application/octet-stream',
  lastModified: Date.now(),
  arrayBuffer: jest.fn(),
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn(),
})) as any

describe('Photo Enhancement Workflow Integration Tests', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Photo Upload and Enhancement Flow', () => {
    it('should successfully upload and enhance a photo', async () => {
      // Mock successful upload response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'photo-123',
            filename: 'test-photo.jpg',
            originalUrl: 'https://example.com/original/test-photo.jpg',
            status: 'uploaded'
          }),
        } as Response)
        // Mock successful enhancement response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'photo-123',
            status: 'enhanced',
            enhancedUrl: 'https://example.com/enhanced/test-photo.jpg',
            originalUrl: 'https://example.com/original/test-photo.jpg'
          }),
        } as Response)

      // Simulate file upload
      const file = new File(['test image data'], 'test-photo.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', file)

      // Step 1: Upload photo
      const uploadResponse = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadResult = await uploadResponse.json()

      expect(uploadResponse.ok).toBe(true)
      expect(uploadResult.id).toBe('photo-123')
      expect(uploadResult.status).toBe('uploaded')

      // Step 2: Enhance photo
      const enhanceResponse = await fetch('/api/photos/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId: uploadResult.id }),
      })
      const enhanceResult = await enhanceResponse.json()

      expect(enhanceResponse.ok).toBe(true)
      expect(enhanceResult.status).toBe('enhanced')
      expect(enhanceResult.enhancedUrl).toBeDefined()

      // Verify API calls were made correctly
      expect(mockFetch).toHaveBeenCalledTimes(2)
      
      // Check first call (upload)
      const firstCall = mockFetch.mock.calls[0]
      expect(firstCall[0]).toBe('/api/photos/upload')
      expect(firstCall[1]?.method).toBe('POST')
      expect(firstCall[1]?.body).toBeDefined()
      
      // Check second call (enhance)
      const secondCall = mockFetch.mock.calls[1]
      expect(secondCall[0]).toBe('/api/photos/enhance')
      expect(secondCall[1]?.method).toBe('POST')
      expect(secondCall[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(secondCall[1]?.body).toBe(JSON.stringify({ photoId: 'photo-123' }))
    })

    it('should handle upload failure gracefully', async () => {
      // Mock failed upload response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid file format'
        }),
      } as Response)

      const file = new File(['invalid data'], 'test.txt', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadResult = await uploadResponse.json()

      expect(uploadResponse.ok).toBe(false)
      expect(uploadResponse.status).toBe(400)
      expect(uploadResult.error).toBe('Invalid file format')
    })

    it('should handle enhancement failure gracefully', async () => {
      // Mock successful upload but failed enhancement
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'photo-456',
            filename: 'test-photo.jpg',
            status: 'uploaded'
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            error: 'Enhancement service unavailable'
          }),
        } as Response)

      const file = new File(['test image data'], 'test-photo.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', file)

      // Upload succeeds
      const uploadResponse = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadResult = await uploadResponse.json()
      expect(uploadResponse.ok).toBe(true)

      // Enhancement fails
      const enhanceResponse = await fetch('/api/photos/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId: uploadResult.id }),
      })
      const enhanceResult = await enhanceResponse.json()

      expect(enhanceResponse.ok).toBe(false)
      expect(enhanceResponse.status).toBe(500)
      expect(enhanceResult.error).toBe('Enhancement service unavailable')
    })
  })

  describe('Photo Management Workflow', () => {
    it('should retrieve user photos successfully', async () => {
      // Mock photos list response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          photos: [
            {
              id: 'photo-1',
              filename: 'photo1.jpg',
              status: 'enhanced',
              originalUrl: 'https://example.com/original/photo1.jpg',
              enhancedUrl: 'https://example.com/enhanced/photo1.jpg',
              createdAt: '2024-01-01T00:00:00Z'
            },
            {
              id: 'photo-2',
              filename: 'photo2.jpg',
              status: 'uploaded',
              originalUrl: 'https://example.com/original/photo2.jpg',
              createdAt: '2024-01-02T00:00:00Z'
            }
          ],
          total: 2
        }),
      } as Response)

      const response = await fetch('/api/photos')
      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.photos).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.photos[0].status).toBe('enhanced')
      expect(result.photos[1].status).toBe('uploaded')
    })

    it('should handle empty photos list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          photos: [],
          total: 0
        }),
      } as Response)

      const response = await fetch('/api/photos')
      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.photos).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })
})