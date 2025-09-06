import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5992/api'

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Check cache for GET requests
  if (config.method === 'get') {
    const cacheKey = `${config.baseURL}${config.url}`
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Return cached response
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {}
      })
    }
  }
  
  return config
})

// Handle auth errors and cache responses
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = `${response.config.baseURL}${response.config.url}`
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
        ttl: CACHE_TTL
      })
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface User {
  id: number
  username: string
  email: string
  confirmed: boolean
  blocked: boolean
  firstName?: string
  lastName?: string
  credits?: number
  freePhotosUsed?: number
  role?: {
    id: number
    name: string
    type: string
  }
}

export interface Photo {
  id: number
  originalImage: {
    id: number
    url: string
    name: string
    mime: string
    size: number
  }
  enhancedImage?: {
    id: number
    url: string
    name: string
    mime: string
    size: number
  }
  status: 'pending' | 'processing' | 'completed' | 'failed'
  enhancementType: 'restore' | 'enhance' | 'colorize'
  createdAt: string
  updatedAt: string
  processingStartedAt?: string
  processingCompletedAt?: string
  errorMessage?: string
}

export interface CreditPackage {
  id: number
  name: string
  credits: number
  price: number
  description?: string
  features: string[]
  stripePriceId: string
  active: boolean
  sortOrder: number
}

export interface Purchase {
  id: number
  amount: number
  credits: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  paymentDate?: string
  stripePaymentIntentId: string
  creditPackage: CreditPackage
}

// Auth API
export const authAPI = {
  async register(userData: {
    username: string
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) {
    const response = await api.post('/auth/local/register', userData)
    return response.data
  },

  async login(credentials: { identifier: string; password: string }) {
    const response = await api.post('/auth/local', credentials)
    return response.data
  },

  async getMe() {
    const response = await api.get('/users/me?populate=*')
    return response.data
  },

  async updateProfile(userData: Partial<User>) {
    const response = await api.put('/users/me', userData)
    return response.data
  },
}

// Photos API
export const photosAPI = {
  async getPhotos() {
    const response = await api.get('/photos?populate=*')
    return response.data
  },

  async getPhoto(id: number) {
    const response = await api.get(`/photos/${id}?populate=*`)
    return response.data
  },

  async uploadPhoto(formData: FormData) {
    const response = await api.post('/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async enhancePhoto(photoId: number) {
    const response = await api.post(`/photos/${photoId}/enhance`)
    return response.data
  },
}

// Credit Packages API
export const creditPackagesAPI = {
  async getCreditPackages() {
    const response = await api.get('/credit-packages')
    return response.data
  },

  async getCreditPackage(id: number) {
    const response = await api.get(`/credit-packages/${id}`)
    return response.data
  },
}

// Purchases API
export const purchasesAPI = {
  async purchaseCredits(creditPackageId: number, paymentMethodId?: string) {
    const response = await api.post('/purchase-credits', {
      creditPackageId,
      paymentMethodId,
    })
    return response.data
  },
}

export default api