import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportsPage from './ReportsPage';

// Mock the axios instance
jest.mock('@/lib/axiosInstance', () => ({
  get: jest.fn().mockImplementation(() => 
    Promise.resolve({
      data: [
        { slug: 'completeness', name: 'Data Completeness', description: 'Test description 1' },
        { slug: 'readiness', name: 'Readiness', description: 'Test description 2' },
      ]
    })
  )
}));

describe('ReportsPage', () => {
  it('renders report tabs correctly', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsPage />
      </QueryClientProvider>
    );

    // Check for the main headings
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
    
    // Wait for tabs to render (they'll be available immediately due to placeholderData)
    expect(screen.getByText('Data Completeness')).toBeInTheDocument();
    expect(screen.getByText('Marketplace Readiness')).toBeInTheDocument();
  });
}); 