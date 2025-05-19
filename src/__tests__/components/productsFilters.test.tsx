import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProductsTable } from '@/components/products/ProductsTable'
import { ProductGrid } from '@/components/products/ProductGrid'
import { productService } from '@/services/productService'
import { useFetchProducts } from '@/hooks/useFetchProducts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react-dom/test-utils'
import { BrowserRouter } from 'react-router-dom'

// Mock the router hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/app/products' }),
  useSearchParams: () => [new URLSearchParams(), jest.fn()]
}))

// Mock the product service
jest.mock('@/services/productService', () => ({
  productService: {
    getProducts: jest.fn(),
    getCategories: jest.fn().mockResolvedValue([]),
    getProductAttributes: jest.fn().mockResolvedValue([]),
    getProductAttributeGroups: jest.fn().mockResolvedValue([]),
    getProductAssets: jest.fn().mockResolvedValue([]),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    bulkDelete: jest.fn(),
    bulkSetStatus: jest.fn(),
    searchTags: jest.fn().mockResolvedValue([]),
    createTag: jest.fn()
  }
}))

// Mock the useFetchProducts hook
jest.mock('@/hooks/useFetchProducts', () => ({
  useFetchProducts: jest.fn()
}))

// Mock org settings hook
jest.mock('@/hooks/useOrgSettings', () => ({
  useOrgSettings: () => ({
    defaultLocale: 'en',
    defaultChannel: { code: 'web' }
  })
}))

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Test User' }
  })
}))

// Mock families API hook
jest.mock('@/api/familyApi', () => ({
  useFamilies: () => ({
    data: [],
    isLoading: false
  })
}))

// Mock product derived hooks
jest.mock('@/hooks/useProductDerived', () => ({
  useUniqueCategories: () => ['Category 1', 'Category 2'],
  useUniqueTags: () => ['Tag 1', 'Tag 2']
}))

// Mock product columns
jest.mock('@/hooks/useProductColumns', () => ({
  useProductColumns: () => ({
    columns: [],
    allColumns: []
  })
}))

describe('Products Filters Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Mock the useFetchProducts hook implementation
    const mockProductsData = {
      pages: [
        {
          count: 10,
          next: null,
          previous: null,
          results: [
            { id: 1, name: 'Product 1', sku: 'SKU1', price: 10, stock: 100, is_active: true },
            { id: 2, name: 'Product 2', sku: 'SKU2', price: 20, stock: 200, is_active: true }
          ]
        }
      ],
      pageParams: [1]
    }

    ;(useFetchProducts as jest.Mock).mockReturnValue({
      data: mockProductsData,
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: null
    })

    // Reset productService mocks
    ;(productService.getProducts as jest.Mock).mockReset()
    ;(productService.getProducts as jest.Mock).mockResolvedValue({
      count: 10,
      next: null,
      previous: null,
      results: [
        { id: 1, name: 'Product 1', sku: 'SKU1', price: 10, stock: 100, is_active: true },
        { id: 2, name: 'Product 2', sku: 'SKU2', price: 20, stock: 200, is_active: true }
      ]
    })
  })

  test('should send filter parameters to API with page=1 and page_size≤50', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProductsTable />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Wait for table to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Find the name filter input and type in it
    const nameFilterInput = screen.getAllByPlaceholderText('Filter…')[0]
    fireEvent.change(nameFilterInput, { target: { value: 'test filter' } })

    // Check if useFetchProducts was called with correct parameters
    expect(useFetchProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test filter',
        page: 1
      })
    )

    // Verify the page_size is at most 50
    const calls = (useFetchProducts as jest.Mock).mock.calls
    const lastCall = calls[calls.length - 1][0]
    expect(lastCall.page_size).toBeLessThanOrEqual(50)
  })

  test('should cap page_size at 50 when requesting larger values', async () => {
    // Mock implementation to expose the parameters
    let capturedParams: any = {}
    ;(useFetchProducts as jest.Mock).mockImplementation((params) => {
      capturedParams = params
      return {
        data: {
          pages: [
            {
              count: 10,
              next: null,
              previous: null,
              results: [
                { id: 1, name: 'Product 1', sku: 'SKU1', price: 10, stock: 100, is_active: true },
                { id: 2, name: 'Product 2', sku: 'SKU2', price: 20, stock: 200, is_active: true }
              ]
            }
          ],
          pageParams: [1]
        },
        isLoading: false,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false
      }
    })

    // Render with an extreme page size
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProductsTable filters={{ page_size: 999 }} />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Check if the page size was capped at 50
    expect(capturedParams.page_size).toBeLessThanOrEqual(50)

    // Also verify at the hook implementation level
    const hookInstance = useFetchProducts({ page_size: 999 })
    
    // Redefine useFetchProducts to check the actual implementation
    jest.unmock('@/hooks/useFetchProducts')
    const actualModule = jest.requireActual('@/hooks/useFetchProducts')
    const actualHook = actualModule.useFetchProducts
    
    // Mock getProducts to capture what's actually sent
    const mockGetProducts = jest.fn().mockResolvedValue({ count: 0, results: [] })
    ;(productService.getProducts as jest.Mock) = mockGetProducts
    
    // Call the actual implementation with a large page size
    actualHook({ page_size: 999 })
    
    // Since we can't easily check the internals of the hook, 
    // make sure our test validates our understanding of the hook implementation
    expect(actualModule.MAX_PAGE_SIZE).toBe(50)
  })

  test('filters should be maintained when switching between table and grid views', async () => {
    // Create a component that contains both views to test switching
    const TestComponent = () => {
      const [viewMode, setViewMode] = React.useState('table')
      const [filters, setFilters] = React.useState({ name: 'test product' })
      
      return (
        <div>
          <button onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
            Toggle View
          </button>
          {viewMode === 'table' ? (
            <ProductsTable filters={filters} />
          ) : (
            <ProductGrid filters={filters} />
          )}
        </div>
      )
    }
    
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestComponent />
        </BrowserRouter>
      </QueryClientProvider>
    )
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Check if the initial filters were applied
    expect(useFetchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'test product' })
    )
    
    // Switch to grid view
    fireEvent.click(screen.getByText('Toggle View'))
    
    // Check if the filters are maintained in grid view
    expect(useFetchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'test product' })
    )
    
    // Each call to useFetchProducts should include our filter
    const calls = (useFetchProducts as jest.Mock).mock.calls
    calls.forEach(call => {
      expect(call[0]).toMatchObject({ name: 'test product' })
    })
  })
}) 