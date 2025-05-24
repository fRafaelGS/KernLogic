import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFetchProducts } from '@/hooks/useFetchProducts';
import { productService } from '@/services/productService';

// Mock the product service
jest.mock('@/services/productService', () => ({
  productService: {
    getProducts: jest.fn()
  }
}));

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true
  })
}));

const mockProductService = productService as jest.Mocked<typeof productService>;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0
      }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock response data
const mockPaginatedResponse = {
  count: 100,
  next: 'http://api.example.com/products?page=2',
  previous: null,
  results: [
    {
      id: 1,
      name: 'Product 1',
      sku: 'SKU001',
      description: 'Test product 1',
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      status: 'active',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      category: { id: 1, name: 'Electronics' },
      tags: ['tech']
    },
    {
      id: 2,
      name: 'Product 2',
      sku: 'SKU002',
      description: 'Test product 2',
      is_active: true,
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      status: 'active',
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      category: { id: 2, name: 'Books' },
      tags: ['education']
    }
  ]
};

describe('useFetchProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have initial loading state', () => {
    mockProductService.getProducts.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useFetchProducts(), {
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  test('should return data on successful fetch', async () => {
    mockProductService.getProducts.mockResolvedValue(mockPaginatedResponse);

    const { result } = renderHook(() => useFetchProducts(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]).toEqual(mockPaginatedResponse);
    expect(result.current.error).toBeNull();
  });

  test('should handle error state', async () => {
    const mockError = new Error('API Error');
    mockProductService.getProducts.mockRejectedValue(mockError);

    const { result } = renderHook(() => useFetchProducts(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBeUndefined();
  });

  test('should pass filter parameters to API', async () => {
    mockProductService.getProducts.mockResolvedValue(mockPaginatedResponse);

    const filters = {
      category: 'electronics',
      page_size: 25,
      search: 'test product'
    };

    renderHook(() => useFetchProducts(filters), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(mockProductService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'electronics',
          page_size: 25,
          search: 'test product',
          page: 1
        }),
        false,
        false
      );
    });
  });

  test('should handle pagination with fetchNextPage', async () => {
    mockProductService.getProducts.mockResolvedValue(mockPaginatedResponse);

    const { result } = renderHook(() => useFetchProducts(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(true);
    expect(typeof result.current.fetchNextPage).toBe('function');
  });

  test('should handle no more pages', async () => {
    const responseWithoutNext = {
      ...mockPaginatedResponse,
      next: null
    };
    
    mockProductService.getProducts.mockResolvedValue(responseWithoutNext);

    const { result } = renderHook(() => useFetchProducts(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(false);
  });

  test('should filter out null values from filters', async () => {
    mockProductService.getProducts.mockResolvedValue(mockPaginatedResponse);

    const filtersWithNulls = {
      category: 'electronics',
      brand: null,
      tags: [],
      page_size: 10
    };

    renderHook(() => useFetchProducts(filtersWithNulls), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(mockProductService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'electronics',
          page_size: 10,
          page: 1
        }),
        false,
        false
      );
    });

    // Should not include null or empty array values
    expect(mockProductService.getProducts).toHaveBeenCalledWith(
      expect.not.objectContaining({
        brand: expect.anything(),
        tags: expect.anything()
      }),
      false,
      false
    );
  });

  test('should handle default page size limit', async () => {
    mockProductService.getProducts.mockResolvedValue(mockPaginatedResponse);

    const filtersWithLargePageSize = {
      page_size: 1000 // Exceeds max
    };

    renderHook(() => useFetchProducts(filtersWithLargePageSize), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(mockProductService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          page_size: 50, // Should be capped at max
          page: 1
        }),
        false,
        false
      );
    });
  });
}); 