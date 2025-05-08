import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import '@testing-library/jest-dom';

// Mock AuthContext's value
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com', role: 'admin' },
    logout: jest.fn(),
    checkPermission: () => true
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock document.cookie for testing
const mockCookies: Record<string, string> = {};

Object.defineProperty(document, 'cookie', {
  get: jest.fn(() => {
    return Object.entries(mockCookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }),
  set: jest.fn((cookie: string) => {
    const [cookieKeyValue] = cookie.split(';');
    const [key, value] = cookieKeyValue.split('=');
    mockCookies[key] = value;
    return '';
  })
});

describe('Sidebar', () => {
  beforeEach(() => {
    // Clear mock cookies before each test
    Object.keys(mockCookies).forEach(key => delete mockCookies[key]);
  });

  it('should cycle through pin states correctly', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    // Get the pin button
    const pinButton = screen.getByRole('button', { name: /sidebar mode/i });
    
    // Initial state should be "open"
    expect(mockCookies['sidebar:pin']).toBeUndefined();
    expect(pinButton.getAttribute('aria-label')).toContain('open');
    
    // First click should set to "closed"
    fireEvent.click(pinButton);
    expect(decodeURIComponent(mockCookies['sidebar:pin'])).toBe('closed');
    expect(pinButton.getAttribute('aria-label')).toContain('closed');
    
    // Second click should set to "unpinned"
    fireEvent.click(pinButton);
    expect(decodeURIComponent(mockCookies['sidebar:pin'])).toBe('unpinned');
    expect(pinButton.getAttribute('aria-label')).toContain('unpinned');
    
    // Third click should set back to "open"
    fireEvent.click(pinButton);
    expect(decodeURIComponent(mockCookies['sidebar:pin'])).toBe('open');
    expect(pinButton.getAttribute('aria-label')).toContain('open');
  });

  it('should initialize from cookie correctly', () => {
    // Set cookie before rendering
    document.cookie = 'sidebar:pin=unpinned; max-age=604800; path=/';
    
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    
    // Check that the component initialized with the saved state
    const pinButton = screen.getByRole('button', { name: /sidebar mode/i });
    expect(pinButton.getAttribute('aria-label')).toContain('unpinned');
  });
}); 