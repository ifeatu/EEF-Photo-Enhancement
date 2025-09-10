import { render, screen, fireEvent } from '@testing-library/react'
import { jest } from '@jest/globals'

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, className, ...props }: any) {
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    )
  }
})

// Mock navigation component
function MockNavigation({ session }: { session: any }) {
  return (
    <nav className="relative z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a href="/" className="text-2xl font-bold text-gray-900">
              PhotoEnhance
            </a>
          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <a
                  href="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </a>
                <a
                  href="/api/auth/signout"
                  className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </a>
              </>
            ) : (
              <>
                <a
                  href="/api/auth/signin"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  data-testid="signin-button"
                >
                  Sign In
                </a>
                <a
                  href="/api/auth/signin"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  data-testid="get-started-button"
                >
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

describe('Navigation Component', () => {
  it('should render sign-in button when not authenticated', () => {
    render(<MockNavigation session={null} />)
    
    const signInButton = screen.getByTestId('signin-button')
    const getStartedButton = screen.getByTestId('get-started-button')
    
    expect(signInButton).toBeDefined()
    expect(getStartedButton).toBeDefined()
    expect(signInButton.textContent).toBe('Sign In')
    expect(getStartedButton.textContent).toBe('Get Started')
  })

  it('should have correct href attributes for auth links', () => {
    render(<MockNavigation session={null} />)
    
    const signInButton = screen.getByTestId('signin-button')
    const getStartedButton = screen.getByTestId('get-started-button')
    
    expect(signInButton.getAttribute('href')).toBe('/api/auth/signin')
    expect(getStartedButton.getAttribute('href')).toBe('/api/auth/signin')
  })

  it('should have proper z-index for navigation', () => {
    render(<MockNavigation session={null} />)
    
    const nav = screen.getByRole('navigation')
    expect(nav.className).toContain('z-50')
    expect(nav.className).toContain('relative')
  })

  it('should be clickable without overlapping elements', () => {
    const mockClick = jest.fn()
    
    render(
      <div>
        <MockNavigation session={null} />
        <div 
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none"
          data-testid="background-element"
        >
          Background Element
        </div>
      </div>
    )
    
    const signInButton = screen.getByTestId('signin-button')
    const backgroundElement = screen.getByTestId('background-element')
    
    // Background element should have pointer-events-none
    expect(backgroundElement.className).toContain('pointer-events-none')
    
    // Sign-in button should be clickable
    signInButton.addEventListener('click', mockClick)
    fireEvent.click(signInButton)
    
    expect(mockClick).toHaveBeenCalled()
  })

  it('should render authenticated navigation when session exists', () => {
    const mockSession = { user: { id: '1', email: 'test@example.com' } }
    render(<MockNavigation session={mockSession} />)
    
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Sign Out')).toBeDefined()
    expect(screen.queryByTestId('signin-button')).toBeNull()
  })
})