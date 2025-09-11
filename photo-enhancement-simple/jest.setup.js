require('@testing-library/jest-dom')

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock next-auth/next
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock next-auth completely
jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'

// Global test utilities
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

global.fetch = jest.fn()

// Mock Next.js Request and Response objects
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.body = init.body || null
    }
    
    async formData() {
      const formData = new FormData()
      if (this.body) {
        // Mock form data parsing
        formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
        formData.append('title', 'Test Photo')
      }
      return formData
    }
    
    async json() {
      return this.body ? JSON.parse(this.body) : {}
    }
  }
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new Map(Object.entries(init.headers || {}))
    }
    
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers
        }
      })
    }
    
    async json() {
      return JSON.parse(this.body)
    }
  }
}

// Mock File and Blob for file upload tests
global.File = class MockFile {
  constructor(bits, name, options = {}) {
    this.bits = bits
    this.name = name
    this.type = options.type || ''
    this.size = bits.reduce((acc, bit) => acc + bit.length, 0)
  }
  
  async arrayBuffer() {
    const buffer = new ArrayBuffer(this.size)
    const view = new Uint8Array(buffer)
    let offset = 0
    for (const bit of this.bits) {
      const bitArray = typeof bit === 'string' ? new TextEncoder().encode(bit) : new Uint8Array(bit)
      view.set(bitArray, offset)
      offset += bitArray.length
    }
    return buffer
  }
}

global.Blob = class MockBlob {
  constructor(bits, options = {}) {
    this.bits = bits
    this.type = options.type || ''
    this.size = bits.reduce((acc, bit) => acc + bit.length, 0)
  }
  
  async arrayBuffer() {
    const buffer = new ArrayBuffer(this.size)
    const view = new Uint8Array(buffer)
    let offset = 0
    for (const bit of this.bits) {
      const bitArray = typeof bit === 'string' ? new TextEncoder().encode(bit) : new Uint8Array(bit)
      view.set(bitArray, offset)
      offset += bitArray.length
    }
    return buffer
  }
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})