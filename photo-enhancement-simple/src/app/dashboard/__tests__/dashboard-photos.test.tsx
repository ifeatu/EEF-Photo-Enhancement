import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSession } from 'next-auth/react';
import Dashboard from '../page';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Dashboard Photos API Integration', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER'
        }
      },
      status: 'authenticated'
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle photos API response correctly', async () => {
    // Mock successful photos API response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photos: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          credits: 10,
          role: 'USER'
        })
      } as Response);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Photos Enhanced')).toBeInTheDocument();
    });

    // Should show 0 enhanced photos when photos array is empty
    const photosEnhancedSection = screen.getByText('Photos Enhanced').closest('div');
    expect(photosEnhancedSection).toHaveTextContent('0');
  });

  it('should handle malformed API response gracefully', async () => {
    // Mock API response without photos property
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          credits: 10,
          role: 'USER'
        })
      } as Response);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Photos Enhanced')).toBeInTheDocument();
    });

    // Should show 0 enhanced photos when photos is undefined
    const photosEnhancedSection = screen.getByText('Photos Enhanced').closest('div');
    expect(photosEnhancedSection).toHaveTextContent('0');
  });

  it('should not crash when photos.filter is called', async () => {
    // Mock API response with photos
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          photos: [
            { id: '1', status: 'completed', title: 'Photo 1' },
            { id: '2', status: 'processing', title: 'Photo 2' },
            { id: '3', status: 'completed', title: 'Photo 3' }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          credits: 10,
          role: 'USER'
        })
      } as Response);

    // The main test is that this doesn't throw an error
    expect(() => {
      render(<Dashboard />);
    }).not.toThrow();

    // Verify the component renders without crashing
    await waitFor(() => {
      expect(screen.getByText('Photos Enhanced')).toBeInTheDocument();
    });
  });
});