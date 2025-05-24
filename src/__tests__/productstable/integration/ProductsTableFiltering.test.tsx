import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// Mock SCSS imports
jest.mock('@/styles/editable-cell.scss', () => ({}))

// Mock the config module to avoid import.meta issues
jest.mock('@/config/config', () => ({
  API_BASE_URL: 'http://localhost:8000',
  API_URL: 'http://localhost:8000',
  API_CURRENCIES: '/api/currencies',
  API_PRICE_TYPES: '/api/price-types/',
  API_SALES_CHANNELS: '/api/sales-channels/',
  PRODUCTS_PATH: '/api/products',
  config: {
    api: {
      baseUrl: 'http://localhost:8000',
      timeout: 30000,
      retryAttempts: 3
    },
    productsTable: {
      display: {
        tableView: {
          expandRow: 'Expand row',
          collapseRow: 'Collapse row',
          paginationInfo: 'Showing {{start}}-{{end}} of {{total}}',
          columnVisibility: {
            title: 'Column Visibility',
            toggle: 'Toggle columns'
          }
        },
        buttons: {
          refresh: 'Refresh',
          bulkActions: 'Bulk Actions',
          bulkActivate: 'Activate Selected',
          bulkDeactivate: 'Deactivate Selected',
          bulkTags: 'Manage Tags',
          bulkCategory: 'Assign Category',
          bulkDelete: 'Archive Selected'
        },
        selectors: {
          category: {
            allCategories: 'All Categories',
            uncategorized: 'Uncategorized',
            noCategories: 'No categories available'
          },
          tags: {
            buttonLabel: 'Filter Tags',
            selectedCount: '{{count}} Selected',
            noTags: 'No tags available'
          },
          price: {
            buttonLabel: 'Price Range',
            minLabel: 'Min',
            maxLabel: 'Max'
          },
          status: {
            placeholder: 'Status',
            all: 'All',
            active: 'Active',
            inactive: 'Inactive'
          }
        },
        emptyState: {
          title: 'No products found',
          description: 'Try changing your search or filter criteria, or add a new product.'
        }
      },
      messages: {
        success: {
          delete: 'Product archived successfully',
          bulkDelete: '{{count}} products archived successfully',
          bulkActivate: '{{count}} products activated successfully',
          bulkDeactivate: '{{count}} products deactivated successfully',
          tagCreated: 'Tag "{{name}}" created'
        },
        error: {
          delete: 'Failed to archive product',
          bulkDelete: 'Failed to archive products',
          bulkActivate: 'Failed to activate products',
          bulkDeactivate: 'Failed to deactivate products',
          tagCreation: 'Failed to create tag'
        },
        confirmation: {
          delete: 'Are you sure you want to archive this product?',
          bulkDelete: 'Are you sure you want to archive these {{count}} products?',
          activate: 'Are you sure you want to activate these {{count}} products?',
          deactivate: 'Are you sure you want to deactivate these {{count}} products?'
        }
      }
    }
  },
  API_ENDPOINTS: {
    auth: {
      login: '/token/',
      refresh: '/token/refresh/',
      user: '/api/users/me/',
      register: '/register/',
      logout: '/auth/logout/'
    },
    products: {
      list: '/api/products/',
      create: '/api/products/',
      update: (id: number) => `/api/products/${id}/`,
      delete: (id: number) => `/api/products/${id}/`,
      categories: '/api/categories/',
      stats: '/api/products/stats/',
      assets: (id: number) => `/api/products/${id}/assets/`,
      asset: (productId: number, assetId: number) => `/api/products/${productId}/assets/${assetId}/`,
      history: (id: number) => `/api/products/${id}/history/`,
      checkSku: '/api/products/check-sku/'
    },
    categories: {
      list: '/api/categories/',
      create: '/api/categories/',
      update: (id: number) => `/api/categories/${id}/`,
      delete: (id: number) => `/api/categories/${id}/`,
      tree: '/api/categories/?as_tree=true',
      move: '/api/categories/move/',
      products: (id: number) => `/api/categories/${id}/products/`
    },
    families: {
      list: '/api/families/',
      create: '/api/families/',
      update: (id: number) => `/api/families/${id}/`,
      delete: (id: number) => `/api/families/${id}/`,
      attributeGroups: (id: number) => `/api/families/${id}/attribute-groups/`
    }
  }
}))

// Mock axios instance - This is the key fix!
const mockAxios = {
  defaults: {
    headers: {
      common: {}
    }
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
}

jest.mock('@/lib/axiosInstance', () => ({
  __esModule: true,
  default: mockAxios
}))

// Mock react-router-dom for useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}))

// Mock useToast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock organization settings hook
jest.mock('@/hooks/useOrgSettings', () => ({
  useOrgSettings: () => ({
    defaultLocale: 'en',
    defaultChannel: 'default'
  })
}))

// Mock families hook from API
jest.mock('@/api/familyApi', () => ({
  useFamilies: () => ({
    data: [],
    isLoading: false
  })
}))

// Mock debounce hook to avoid timing issues
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: any) => value // Return value immediately without debouncing
}))

// Mock the product columns hook
jest.mock('@/hooks/useProductColumns', () => ({
  useProductColumns: () => {
    const mockColumns = [
      {
        id: 'select',
        header: 'Select',
        cell: ({ getValue }: any) => getValue()
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }: any) => getValue()
      },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ getValue }: any) => getValue()
      },
      {
        accessorKey: 'category.name',
        header: 'Category',
        cell: ({ getValue }: any) => getValue()
      },
      {
        accessorKey: 'brand',
        header: 'Brand',
        cell: ({ getValue }: any) => getValue()
      }
    ]
    
    const mockActionColumn = {
      id: 'actions',
      header: 'Actions',
      cell: ({ getValue }: any) => getValue()
    }
    
    const allColumns = [...mockColumns, mockActionColumn]
    
    return {
      columns: mockColumns,
      actionColumn: mockActionColumn,
      allColumns: allColumns
    }
  }
}))

// Mock product derived hooks
jest.mock('@/hooks/useProductDerived', () => ({
  useUniqueTags: (products: any[]) => ['paint', 'brushes', 'art', 'acrylic', 'colors'],
  useUniqueCategories: (products: any[]) => [
    { id: 1, name: 'Art Supplies' },
    { id: 2, name: 'Home Improvement' },
    { id: 3, name: 'Electronics' },
    { id: 4, name: 'Furniture' }
  ]
}))

import { ProductsTable } from '@/components/products/ProductsTable'
import { AuthProvider } from '@/contexts/AuthContext'
import type { Product } from '@/services/productService'

// Mock data for testing
const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Premium Paint Brush Set',
    description: 'High-quality brushes for paint application',
    sku: 'PAINT-001',
    category: { id: 1, name: 'Art Supplies' },
    is_active: true,
    tags: ['paint', 'brushes', 'art'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    brand: 'ArtMaster',
    barcode: '123456789001'
  },
  {
    id: 2,
    name: 'Acrylic Paint Set - 24 Colors',
    description: 'Professional acrylic paint collection',
    sku: 'PAINT-002',
    category: { id: 1, name: 'Art Supplies' },
    is_active: true,
    tags: ['paint', 'acrylic', 'colors'],
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    brand: 'ColorMaster',
    barcode: '123456789002'
  },
  {
    id: 3,
    name: 'Wall Paint Roller Kit',
    description: 'Complete roller kit for wall painting',
    sku: 'PAINT-003',
    category: { id: 2, name: 'Home Improvement' },
    is_active: true,
    tags: ['paint', 'roller', 'walls'],
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
    brand: 'HomeTools',
    barcode: '123456789003'
  },
  {
    id: 4,
    name: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless audio experience',
    sku: 'AUDIO-001',
    category: { id: 3, name: 'Electronics' },
    is_active: true,
    tags: ['wireless', 'audio', 'bluetooth'],
    created_at: '2023-01-04T00:00:00Z',
    updated_at: '2023-01-04T00:00:00Z',
    brand: 'SoundTech',
    barcode: '123456789004'
  },
  {
    id: 5,
    name: 'Ergonomic Office Chair',
    description: 'Comfortable office seating solution',
    sku: 'OFFICE-001',
    category: { id: 4, name: 'Furniture' },
    is_active: true,
    tags: ['office', 'furniture', 'ergonomic'],
    created_at: '2023-01-05T00:00:00Z',
    updated_at: '2023-01-05T00:00:00Z',
    brand: 'ComfortSeating',
    barcode: '123456789005'
  }
]

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0
      }
    }
  })

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('ProductsTable Filtering Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    
    // Setup axios mock implementation
    mockAxios.get.mockImplementation((url: string) => {
      // Check if this is a products API call
      if (url.includes('/api/products/')) {
        // Parse query parameters from the URL
        const urlObj = new URL(url, 'http://localhost')
        const searchTerm = urlObj.searchParams.get('search') || urlObj.searchParams.get('searchTerm')
        
        let filteredProducts = mockProducts

        // Apply search filter if provided
        if (searchTerm) {
          filteredProducts = mockProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.tags && product.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
          )
        }

        return Promise.resolve({
          data: {
            count: filteredProducts.length,
            next: null,
            previous: null,
            results: filteredProducts
          }
        })
      }

      if (url.includes('/api/categories/')) {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Art Supplies' },
            { id: 2, name: 'Home Improvement' },
            { id: 3, name: 'Electronics' },
            { id: 4, name: 'Furniture' }
          ]
        })
      }

      if (url.includes('/api/families/')) {
        return Promise.resolve({
          data: []
        })
      }

      return Promise.reject(new Error(`Unknown endpoint: ${url}`))
    })
  })

  describe('Initial Loading and Data Display', () => {
    test('should show loading indicator then display all products', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for products to load and verify all 5 products are displayed
      await waitFor(() => {
        expect(screen.getByText('Premium Paint Brush Set')).toBeInTheDocument()
      }, { timeout: 5000 })

      expect(screen.getByText('Acrylic Paint Set - 24 Colors')).toBeInTheDocument()
      expect(screen.getByText('Wall Paint Roller Kit')).toBeInTheDocument()
      expect(screen.getByText('Wireless Bluetooth Headphones')).toBeInTheDocument()
      expect(screen.getByText('Ergonomic Office Chair')).toBeInTheDocument()

      // Verify axios was called for products
      expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/api/products/'))
    })
  })

  describe('Search Functionality', () => {
    test('should filter products when typing "paint" in search box', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Premium Paint Brush Set')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify all products are initially visible
      expect(screen.getByText('Wireless Bluetooth Headphones')).toBeInTheDocument()
      expect(screen.getByText('Ergonomic Office Chair')).toBeInTheDocument()

      // Find and interact with search input
      const searchInput = screen.getByPlaceholderText(/search products/i)
      expect(searchInput).toBeInTheDocument()

      // Clear previous axios calls
      jest.clearAllMocks()

      // Type "paint" in the search box
      await user.type(searchInput, 'paint')

      // Wait for filtered results
      await waitFor(() => {
        // Paint-related products should still be visible
        expect(screen.getByText('Premium Paint Brush Set')).toBeInTheDocument()
        expect(screen.getByText('Acrylic Paint Set - 24 Colors')).toBeInTheDocument()
        expect(screen.getByText('Wall Paint Roller Kit')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Non-paint products should not be visible
      expect(screen.queryByText('Wireless Bluetooth Headphones')).not.toBeInTheDocument()
      expect(screen.queryByText('Ergonomic Office Chair')).not.toBeInTheDocument()

      // Verify search API call was made
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/products\/.*[?&](search|searchTerm)=paint/)
      )
    })

    test('should show all products when search is cleared', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Premium Paint Brush Set')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByPlaceholderText(/search products/i)

      // First, filter by "paint"
      await user.type(searchInput, 'paint')

      await waitFor(() => {
        expect(screen.queryByText('Wireless Bluetooth Headphones')).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Clear the search input
      await user.clear(searchInput)

      // Wait for all products to return
      await waitFor(() => {
        expect(screen.getByText('Premium Paint Brush Set')).toBeInTheDocument()
        expect(screen.getByText('Acrylic Paint Set - 24 Colors')).toBeInTheDocument()
        expect(screen.getByText('Wall Paint Roller Kit')).toBeInTheDocument()
        expect(screen.getByText('Wireless Bluetooth Headphones')).toBeInTheDocument()
        expect(screen.getByText('Ergonomic Office Chair')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    test('should handle search with no results', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Premium Paint Brush Set')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByPlaceholderText(/search products/i)

      // Search for something that doesn't exist
      await user.type(searchInput, 'nonexistentproduct')

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByText(/No products match your filters/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify all products are gone
      expect(screen.queryByText('Premium Paint Brush Set')).not.toBeInTheDocument()
      expect(screen.queryByText('Wireless Bluetooth Headphones')).not.toBeInTheDocument()
    })
  })

  describe('Network Request Verification', () => {
    test('should make correct API calls for search', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalled()
      }, { timeout: 5000 })

      // Clear previous calls
      jest.clearAllMocks()

      const searchInput = screen.getByPlaceholderText(/search products/i)
      await user.type(searchInput, 'paint')

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/products\/.*[?&](search|searchTerm)=paint/)
        )
      }, { timeout: 5000 })
    })
  })
}) 