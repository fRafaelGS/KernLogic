import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TeamHistoryPage } from './TeamHistoryPage';
import * as teamService from '@/services/teamService';
import { AuditLogEntry } from '@/services/teamService';
import { AuthProvider } from '@/contexts/AuthContext';
import userEvent from '@testing-library/user-event';

// Mock the team service
jest.mock('@/services/teamService');
const mockedTeamService = teamService as jest.Mocked<typeof teamService>;

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { 
      id: 'user-1', 
      organization_id: 'org-123',
      name: 'Test User',
      email: 'test@example.com'
    },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Sample audit logs data
const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 1,
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User'
    },
    org_id: 'org-123',
    action: 'invite',
    target_type: 'membership',
    target_id: 'member-1',
    timestamp: '2023-04-01T10:30:00Z',
    details: {
      email: 'newuser@example.com',
      role: 'Editor'
    }
  },
  {
    id: 2,
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User'
    },
    org_id: 'org-123',
    action: 'role_change',
    target_type: 'membership',
    target_id: 'member-2',
    timestamp: '2023-04-02T14:15:00Z',
    details: {
      email: 'existinguser@example.com',
      from: 'Viewer',
      to: 'Admin'
    }
  },
  {
    id: 3,
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User'
    },
    org_id: 'org-123',
    action: 'remove',
    target_type: 'membership',
    target_id: 'member-3',
    timestamp: '2023-04-03T09:45:00Z',
    details: {
      email: 'formeruser@example.com',
      role: 'Viewer'
    }
  }
];

const renderWithProviders = (
  ui: React.ReactElement,
  { route = '/app/team/history', orgId = 'org-123' } = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/app/team/history" element={ui} />
            <Route path="/app/team/history/:orgId" element={ui} />
            <Route path="/app/team" element={<div>Team Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('TeamHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTeamService.fetchAuditLogs.mockResolvedValue(mockAuditLogs);
  });

  test('renders the page title correctly', async () => {
    renderWithProviders(<TeamHistoryPage />);
    
    expect(screen.getByText('Team History')).toBeInTheDocument();
    expect(screen.getByText('Audit log of all team management activities')).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    renderWithProviders(<TeamHistoryPage />);
    
    const skeletons = document.querySelectorAll('.bg-white.rounded-lg.shadow');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('displays audit logs after loading', async () => {
    renderWithProviders(<TeamHistoryPage />);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(mockedTeamService.fetchAuditLogs).toHaveBeenCalledWith('org-123');
    });
    
    // Check if all logs are displayed
    await waitFor(() => {
      expect(screen.getByText('invited newuser@example.com as Editor')).toBeInTheDocument();
      expect(screen.getByText('changed role for existinguser@example.com from Viewer to Admin')).toBeInTheDocument();
      expect(screen.getByText('removed formeruser@example.com (Viewer)')).toBeInTheDocument();
    });
  });

  test('filters logs by action type', async () => {
    renderWithProviders(<TeamHistoryPage />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(screen.getByText('invited newuser@example.com as Editor')).toBeInTheDocument();
    });
    
    // Open filter sheet
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);
    
    // Select 'Invite' action filter
    const actionSelect = screen.getByText('All actions');
    fireEvent.click(actionSelect);
    
    // Click on 'Invite' option
    const inviteOption = screen.getByText('Invite');
    fireEvent.click(inviteOption);
    
    // Apply filters
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);
    
    // Only the invite log should be visible
    await waitFor(() => {
      expect(screen.getByText('invited newuser@example.com as Editor')).toBeInTheDocument();
      expect(screen.queryByText('changed role for existinguser@example.com from Viewer to Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('removed formeruser@example.com (Viewer)')).not.toBeInTheDocument();
    });
  });

  test('searches logs by keyword', async () => {
    renderWithProviders(<TeamHistoryPage />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(screen.getByText('invited newuser@example.com as Editor')).toBeInTheDocument();
    });
    
    // Type in the search input
    const searchInput = screen.getByPlaceholderText('Search logs...');
    userEvent.type(searchInput, 'former');
    
    // Only the remove log with 'formeruser' should be visible
    await waitFor(() => {
      expect(screen.queryByText('invited newuser@example.com as Editor')).not.toBeInTheDocument();
      expect(screen.queryByText('changed role for existinguser@example.com from Viewer to Admin')).not.toBeInTheDocument();
      expect(screen.getByText('removed formeruser@example.com (Viewer)')).toBeInTheDocument();
    });
  });

  test('shows empty state when no logs match filters', async () => {
    renderWithProviders(<TeamHistoryPage />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(screen.getByText('invited newuser@example.com as Editor')).toBeInTheDocument();
    });
    
    // Type in the search input with a term that won't match any logs
    const searchInput = screen.getByPlaceholderText('Search logs...');
    userEvent.type(searchInput, 'nonexistent');
    
    // Empty state should be shown
    await waitFor(() => {
      expect(screen.getByText('No audit records found')).toBeInTheDocument();
    });
  });

  test('sorts logs by different fields', async () => {
    renderWithProviders(<TeamHistoryPage />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(screen.getByText('invited newuser@example.com as Editor')).toBeInTheDocument();
    });
    
    // Click on the Action sort button
    const actionSortButton = screen.getByText('Action');
    fireEvent.click(actionSortButton);
    
    // Logs should be sorted by action alphabetically (invite, remove, role_change)
    const logItems = screen.getAllByText(/invited|changed role|removed/);
    expect(logItems[0].textContent).toContain('invited');
    
    // Click again to reverse sort
    fireEvent.click(actionSortButton);
    
    // Now logs should be in reverse order
    const reversedLogItems = screen.getAllByText(/invited|changed role|removed/);
    expect(reversedLogItems[0].textContent).toContain('removed');
  });

  test('shows error state when API fails', async () => {
    // Mock the API to reject
    mockedTeamService.fetchAuditLogs.mockRejectedValue(new Error('Failed to fetch'));
    
    renderWithProviders(<TeamHistoryPage />);
    
    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText('Unable to load audit logs')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
    
    // Try again button should be present
    const tryAgainButton = screen.getByText('Try Again');
    expect(tryAgainButton).toBeInTheDocument();
    
    // Clicking try again should call the fetch function again
    mockedTeamService.fetchAuditLogs.mockResolvedValue(mockAuditLogs);
    fireEvent.click(tryAgainButton);
    
    await waitFor(() => {
      expect(mockedTeamService.fetchAuditLogs).toHaveBeenCalledTimes(2);
    });
  });

  test('navigates back to team page when back button is clicked', async () => {
    renderWithProviders(<TeamHistoryPage />);
    
    const backButton = screen.getByText('Back to Team');
    fireEvent.click(backButton);
    
    // Should navigate to the team page
    await waitFor(() => {
      expect(screen.getByText('Team Page')).toBeInTheDocument();
    });
  });

  test('exports audit logs when export button is clicked', async () => {
    // Mock document methods
    const mockCreateElement = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    const mockClick = jest.fn();
    
    const originalCreateElement = document.createElement;
    const originalAppendChild = document.body.appendChild;
    const originalRemoveChild = document.body.removeChild;
    
    document.createElement = mockCreateElement.mockReturnValue({
      setAttribute: jest.fn(),
      click: mockClick,
      href: '',
    });
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
    
    global.URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
    
    renderWithProviders(<TeamHistoryPage />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(screen.getByText('invited newuser@example.com as Editor')).toBeInTheDocument();
    });
    
    // Click export button
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    // Restore mocks
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });
}); 