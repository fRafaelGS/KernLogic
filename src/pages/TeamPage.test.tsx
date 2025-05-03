import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as AuthContext from '@/contexts/AuthContext';
import { TeamPage } from './TeamPage';
import * as teamService from '@/services/teamService';

// Mock dependencies
jest.mock('@/services/api');
jest.mock('@/contexts/AuthContext');
jest.mock('@/services/teamService');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('TeamPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Setup auth context mock with all required properties
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { 
        id: '1', 
        organization_id: 'org-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        is_staff: false,
        avatar_url: '',
        rolePermissions: ['team.view', 'team.invite', 'team.change_role', 'team.remove']
      },
      loading: false,
      error: null,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      notifications: [],
      unreadCount: 0,
      addNotification: jest.fn(),
      markAllAsRead: jest.fn(),
      updateUserContext: jest.fn(),
      checkPermission: () => true,
      checkPendingInvitation: jest.fn()
    });
  });

  it('renders loading state when auth is loading', async () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      loading: true,
      error: null,
      isAuthenticated: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      notifications: [],
      unreadCount: 0,
      addNotification: jest.fn(),
      markAllAsRead: jest.fn(),
      updateUserContext: jest.fn(),
      checkPermission: () => false,
      checkPendingInvitation: jest.fn()
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={createTestQueryClient()}>
          <TeamPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(document.querySelector('.skeleton')).toBeInTheDocument();
  });

  it('renders error state when no organization ID is available', async () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { 
        id: '1', 
        organization_id: '', // Empty org ID
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: '',
        role: 'admin',
        is_staff: false,
        rolePermissions: []
      },
      loading: false,
      error: null,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      notifications: [],
      unreadCount: 0,
      addNotification: jest.fn(),
      markAllAsRead: jest.fn(),
      updateUserContext: jest.fn(),
      checkPermission: () => true,
      checkPendingInvitation: jest.fn()
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={createTestQueryClient()}>
          <TeamPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Organization Error')).toBeInTheDocument();
      expect(screen.getByText('Error: No organization ID available')).toBeInTheDocument();
    });
  });

  it('renders team members when data is loaded successfully', async () => {
    // Mock the team service responses
    jest.mocked(teamService.fetchRoles).mockResolvedValue([
      { id: 1, name: 'Admin', description: 'Administrator', permissions: ['team.view', 'team.invite'] }
    ]);

    const queryClient = createTestQueryClient();
    
    // Prefetch query data
    queryClient.setQueryData(['teamMembers', '', 'all', 'all', 'org-123', 1, 10], {
      results: [
        {
          id: 'mem-1',
          user: { id: '1', name: 'John Doe', email: 'john@example.com' },
          user_email: 'john@example.com',
          user_name: 'John Doe',
          role: { id: 1, name: 'Admin' },
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          orgid: 'org-123'
        }
      ],
      count: 1
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <TeamPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Management')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('renders empty state when no team members found', async () => {
    // Mock the team service responses
    jest.mocked(teamService.fetchRoles).mockResolvedValue([
      { id: 1, name: 'Admin', description: 'Administrator', permissions: ['team.view', 'team.invite'] }
    ]);

    const queryClient = createTestQueryClient();
    
    // Prefetch query data with empty results
    queryClient.setQueryData(['teamMembers', '', 'all', 'all', 'org-123', 1, 10], {
      results: [],
      count: 0
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <TeamPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No team members found')).toBeInTheDocument();
      expect(screen.getByText('Try changing your search or filter criteria, or invite someone new.')).toBeInTheDocument();
    });
  });
}); 