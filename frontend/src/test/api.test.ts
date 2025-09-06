import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authAPI, photosAPI, creditPackagesAPI, purchasesAPI } from '../services/api'
import type { User, Photo, CreditPackage, Purchase } from '../services/api'

// Mock axios
const mockAxiosInstance = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
})

describe('API Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('authAPI', () => {
    describe('register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        }
        
        const mockResponse = {
          data: {
            jwt: 'mock-jwt-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com' }
          }
        }
        
        mockAxiosInstance.post.mockResolvedValue(mockResponse)
        
        const result = await authAPI.register(userData)
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/local/register', userData)
        expect(result).toEqual(mockResponse.data)
      })

      it('should handle registration errors', async () => {
        const userData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        }
        
        const mockError = new Error('Registration failed')
        mockAxiosInstance.post.mockRejectedValue(mockError)
        
        await expect(authAPI.register(userData)).rejects.toThrow('Registration failed')
      })
    })

    describe('login', () => {
      it('should login user successfully', async () => {
        const credentials = {
          identifier: 'testuser',
          password: 'password123'
        }
        
        const mockResponse = {
          data: {
            jwt: 'mock-jwt-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com' }
          }
        }
        
        mockAxiosInstance.post.mockResolvedValue(mockResponse)
        
        const result = await authAPI.login(credentials)
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/local', credentials)
        expect(result).toEqual(mockResponse.data)
      })

      it('should handle login errors', async () => {
        const credentials = {
          identifier: 'testuser',
          password: 'wrongpassword'
        }
        
        const mockError = new Error('Invalid credentials')
        mockAxiosInstance.post.mockRejectedValue(mockError)
        
        await expect(authAPI.login(credentials)).rejects.toThrow('Invalid credentials')
      })
    })

    describe('getMe', () => {
      it('should get current user profile', async () => {
        const mockUser: User = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          confirmed: true,
          blocked: false,
          firstName: 'Test',
          lastName: 'User',
          credits: 10
        }
        
        const mockResponse = { data: mockUser }
        mockAxiosInstance.get.mockResolvedValue(mockResponse)
        
        const result = await authAPI.getMe()
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/me?populate=*')
        expect(result).toEqual(mockUser)
      })
    })

    describe('updateProfile', () => {
      it('should update user profile', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name'
        }
        
        const mockResponse = {
          data: {
            id: 1,
            username: 'testuser',
            firstName: 'Updated',
            lastName: 'Name'
          }
        }
        
        mockAxiosInstance.put.mockResolvedValue(mockResponse)
        
        const result = await authAPI.updateProfile(updateData)
        
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/users/me', updateData)
        expect(result).toEqual(mockResponse.data)
      })
    })
  })

  describe('photosAPI', () => {
    describe('getPhotos', () => {
      it('should get all photos', async () => {
        const mockPhotos: Photo[] = [
          {
            id: 1,
            originalImage: {
              id: 1,
              url: '/uploads/original.jpg',
              name: 'original.jpg',
              mime: 'image/jpeg',
              size: 1024
            },
            status: 'completed',
            enhancementType: 'enhance',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ]
        
        const mockResponse = { data: mockPhotos }
        mockAxiosInstance.get.mockResolvedValue(mockResponse)
        
        const result = await photosAPI.getPhotos()
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/photos?populate=*')
        expect(result).toEqual(mockPhotos)
      })
    })

    describe('getPhoto', () => {
      it('should get a specific photo by ID', async () => {
        const photoId = 1
        const mockPhoto: Photo = {
          id: photoId,
          originalImage: {
            id: 1,
            url: '/uploads/original.jpg',
            name: 'original.jpg',
            mime: 'image/jpeg',
            size: 1024
          },
          status: 'completed',
          enhancementType: 'enhance',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
        
        const mockResponse = { data: mockPhoto }
        mockAxiosInstance.get.mockResolvedValue(mockResponse)
        
        const result = await photosAPI.getPhoto(photoId)
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/photos/${photoId}?populate=*`)
        expect(result).toEqual(mockPhoto)
      })
    })

    describe('uploadPhoto', () => {
      it('should upload a photo', async () => {
        const formData = new FormData()
        formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
        
        const mockResponse = {
          data: {
            id: 1,
            status: 'pending'
          }
        }
        
        mockAxiosInstance.post.mockResolvedValue(mockResponse)
        
        const result = await photosAPI.uploadPhoto(formData)
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/photos', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('enhancePhoto', () => {
      it('should enhance a photo', async () => {
        const photoId = 1
        const mockResponse = {
          data: {
            id: photoId,
            status: 'processing'
          }
        }
        
        mockAxiosInstance.post.mockResolvedValue(mockResponse)
        
        const result = await photosAPI.enhancePhoto(photoId)
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/photos/${photoId}/enhance`)
        expect(result).toEqual(mockResponse.data)
      })
    })
  })

  describe('creditPackagesAPI', () => {
    describe('getCreditPackages', () => {
      it('should get all credit packages', async () => {
        const mockPackages: CreditPackage[] = [
          {
            id: 1,
            name: 'Basic Package',
            credits: 10,
            price: 9.99,
            features: ['Feature 1', 'Feature 2'],
            stripePriceId: 'price_123',
            active: true,
            sortOrder: 1
          }
        ]
        
        const mockResponse = { data: mockPackages }
        mockAxiosInstance.get.mockResolvedValue(mockResponse)
        
        const result = await creditPackagesAPI.getCreditPackages()
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/credit-packages')
        expect(result).toEqual(mockPackages)
      })
    })

    describe('getCreditPackage', () => {
      it('should get a specific credit package by ID', async () => {
        const packageId = 1
        const mockPackage: CreditPackage = {
          id: packageId,
          name: 'Basic Package',
          credits: 10,
          price: 9.99,
          features: ['Feature 1', 'Feature 2'],
          stripePriceId: 'price_123',
          active: true,
          sortOrder: 1
        }
        
        const mockResponse = { data: mockPackage }
        mockAxiosInstance.get.mockResolvedValue(mockResponse)
        
        const result = await creditPackagesAPI.getCreditPackage(packageId)
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/credit-packages/${packageId}`)
        expect(result).toEqual(mockPackage)
      })
    })
  })

  describe('purchasesAPI', () => {
    describe('purchaseCredits', () => {
      it('should purchase credits with payment method', async () => {
        const creditPackageId = 1
        const paymentMethodId = 'pm_123'
        
        const mockResponse = {
          data: {
            id: 1,
            status: 'completed',
            credits: 10
          }
        }
        
        mockAxiosInstance.post.mockResolvedValue(mockResponse)
        
        const result = await purchasesAPI.purchaseCredits(creditPackageId, paymentMethodId)
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/purchase-credits', {
          creditPackageId,
          paymentMethodId
        })
        expect(result).toEqual(mockResponse.data)
      })

      it('should purchase credits without payment method', async () => {
        const creditPackageId = 1
        
        const mockResponse = {
          data: {
            id: 1,
            status: 'pending',
            credits: 10
          }
        }
        
        mockAxiosInstance.post.mockResolvedValue(mockResponse)
        
        const result = await purchasesAPI.purchaseCredits(creditPackageId)
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/purchase-credits', {
          creditPackageId,
          paymentMethodId: undefined
        })
        expect(result).toEqual(mockResponse.data)
      })
    })
  })
})