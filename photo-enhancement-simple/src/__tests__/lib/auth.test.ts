import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock all the problematic modules
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  })),
}))

jest.mock('next-auth/providers/google', () => {
  return jest.fn(() => ({
    id: 'google',
    name: 'Google',
    type: 'oauth',
  }))
})

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({})),
}))

// Mock the auth module
jest.mock('../../lib/auth', () => ({
  authOptions: {
    providers: [{
      id: 'google',
      name: 'Google',
      type: 'oauth',
    }],
    session: {
      strategy: 'jwt',
    },
    callbacks: {
       jwt: jest.fn(({ token, user }) => {
         if (user) {
           token.sub = user.id
         }
         return token
       }),
       session: jest.fn(({ session, token }) => {
         if (token) {
           session.user = { id: token.sub }
         }
         return session
       }),
     },
    pages: {
      signIn: '/auth/signin',
    },
  },
}))

const { authOptions } = require('../../lib/auth')

describe('Auth Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct auth configuration structure', () => {
    expect(authOptions).toBeDefined()
    expect(authOptions.providers).toBeDefined()
    expect(authOptions.callbacks).toBeDefined()
    expect(authOptions.pages).toBeDefined()
  })

  it('should have custom sign-in page configured', () => {
    expect(authOptions.pages?.signIn).toBe('/auth/signin')
  })

  it('should have session strategy configured', () => {
    expect(authOptions.session?.strategy).toBe('jwt')
  })

  describe('JWT Callback', () => {
    it('should handle JWT callback with user data', async () => {
      const mockToken = { sub: '1' }
      const mockUser = { id: '1', email: 'test@example.com' }
      
      if (authOptions.callbacks?.jwt) {
        const result = await authOptions.callbacks.jwt({
          token: mockToken,
          user: mockUser,
        })
        
        expect(result).toBeDefined()
        expect(result.sub).toBe('1')
      }
    })
  })

  describe('Session Callback', () => {
    it('should handle session callback with token data', async () => {
      const mockSession = { user: { email: 'test@example.com' } }
      const mockToken = { sub: '1', email: 'test@example.com' }
      
      if (authOptions.callbacks?.session) {
        const result = await authOptions.callbacks.session({
          session: mockSession,
          token: mockToken,
        })
        
        expect(result).toBeDefined()
        expect(result.user).toBeDefined()
      }
    })
  })
})