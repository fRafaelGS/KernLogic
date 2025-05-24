import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ProductsTable } from '@/components/products/ProductsTable'
import { AuthProvider } from '@/contexts/AuthContext'
import type { Product } from '@/services/productService'

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

// Mock axios instance - This replaces MSW
jest.mock('@/lib/axiosInstance')

// Import the mocked axios instance  
import mockAxiosInstance from '@/lib/axiosInstance'
const mockAxios = mockAxiosInstance as jest.Mocked<typeof mockAxiosInstance>

// Mock react-router-dom with a spy for useNavigate
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
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
  useDebounce: (value: any) => value
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
        accessorKey: 'price',
        header: 'Price',
        cell: ({ getValue }: any) => getValue(),
        enableSorting: true
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
  useUniqueTags: (products: any[]) => ['electronics', 'furniture', 'books'],
  useUniqueCategories: (products: any[]) => [
    { id: 1, name: 'Electronics' },
    { id: 2, name: 'Furniture' },
    { id: 3, name: 'Books' }
  ]
}))

// Mock data for testing - Page 1
const mockProductsPage1: Product[] = [
  {
    id: 1,
    name: 'Laptop Pro 15"',
    description: 'High-performance laptop for professionals',
    sku: 'LAPTOP-001',
    price: 1299.99,
    category: { id: 1, name: 'Electronics' },
    is_active: true,
    tags: ['electronics', 'computers'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    brand: 'TechCorp',
    barcode: '123456789001'
  },
  {
    id: 2,
    name: 'Ergonomic Office Chair',
    description: 'Comfortable seating for long work hours',
    sku: 'CHAIR-001',
    price: 399.99,
    category: { id: 2, name: 'Furniture' },
    is_active: true,
    tags: ['furniture', 'office'],
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    brand: 'ComfortSeating',
    barcode: '123456789002'
  },
  {
    id: 3,
    name: 'JavaScript: The Good Parts',
    description: 'Essential reading for web developers',
    sku: 'BOOK-001',
    price: 29.99,
    category: { id: 3, name: 'Books' },
    is_active: true,
    tags: ['books', 'programming'],
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
    brand: 'TechBooks',
    barcode: '123456789003'
  }
]

// Mock data for testing - Page 2
const mockProductsPage2: Product[] = [
  {
    id: 4,
    name: 'Wireless Mouse',
    description: 'Precision wireless mouse for productivity',
    sku: 'MOUSE-001',
    price: 79.99,
    category: { id: 1, name: 'Electronics' },
    is_active: true,
    tags: ['electronics', 'accessories'],
    created_at: '2023-01-04T00:00:00Z',
    updated_at: '2023-01-04T00:00:00Z',
    brand: 'TechCorp',
    barcode: '123456789004'
  },
  {
    id: 5,
    name: 'Standing Desk',
    description: 'Height-adjustable standing desk',
    sku: 'DESK-001',
    price: 599.99,
    category: { id: 2, name: 'Furniture' },
    is_active: true,
    tags: ['furniture', 'office'],
    created_at: '2023-01-05T00:00:00Z',
    updated_at: '2023-01-05T00:00:00Z',
    brand: 'OfficePro',
    barcode: '123456789005'
  },
  {
    id: 6,
    name: 'React Patterns Guide',
    description: 'Advanced patterns for React development',
    sku: 'BOOK-002',
    price: 39.99,
    category: { id: 3, name: 'Books' },
    is_active: true,
    tags: ['books', 'react'],
    created_at: '2023-01-06T00:00:00Z',
    updated_at: '2023-01-06T00:00:00Z',
    brand: 'DevPress',
    barcode: '123456789006'
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

describe('ProductsTable Integration Tests', () => {
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
        const page = urlObj.searchParams.get('page')
        const ordering = urlObj.searchParams.get('ordering')
        
        let products = page === '2' ? mockProductsPage2 : mockProductsPage1
        const totalCount = 6 // Total across both pages
        
        // Handle sorting by price
        if (ordering === 'price') {
          products = [...products].sort((a, b) => (a.price || 0) - (b.price || 0))
        } else if (ordering === '-price') {
          products = [...products].sort((a, b) => (b.price || 0) - (a.price || 0))
        }

        return Promise.resolve({
          data: {
            count: totalCount,
            next: page === '1' ? 'http://localhost:8000/api/products/?page=2' : null,
            previous: page === '2' ? 'http://localhost:8000/api/products/?page=1' : null,
            results: products
          }
        })
      }

      if (url.includes('/api/categories/')) {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Electronics' },
            { id: 2, name: 'Furniture' },
            { id: 3, name: 'Books' }
          ]
        })
      }

      if (url.includes('/api/families/')) {
        return Promise.resolve({
          data: []
        })
      }

      if (url.includes('/api/attributes/')) {
        return Promise.resolve({
          data: []
        })
      }

      return Promise.reject(new Error(`Unknown endpoint: ${url}`))
    })
  })

  describe('Loading State', () => {
    test('should show loading indicator before data arrives', async () => {
      // Add delay to the API response to test loading state
      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/api/products/')) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                data: {
                  count: 3,
                  next: null,
                  previous: null,
                  results: mockProductsPage1
                }
              })
            }, 1000)
          })
        }
        return Promise.resolve({ data: [] })
      })

      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Check for loading indicator
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Wait for data to load and loading to disappear
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify first product is displayed
      expect(screen.getByText('Laptop Pro 15"')).toBeInTheDocument()
    })
  })

  describe('Data Rendering', () => {
    test('should render all product rows with correct names and SKUs', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for products to load
      await waitFor(() => {
        expect(screen.getByText('Laptop Pro 15"')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify all page 1 products are displayed with names
      expect(screen.getByText('Laptop Pro 15"')).toBeInTheDocument()
      expect(screen.getByText('Ergonomic Office Chair')).toBeInTheDocument()
      expect(screen.getByText('JavaScript: The Good Parts')).toBeInTheDocument()

      // Verify SKUs are displayed
      expect(screen.getByText('LAPTOP-001')).toBeInTheDocument()
      expect(screen.getByText('CHAIR-001')).toBeInTheDocument()
      expect(screen.getByText('BOOK-001')).toBeInTheDocument()

      // Verify prices are displayed (component displays raw numbers, not formatted)
      expect(screen.getByText('1299.99')).toBeInTheDocument()
      expect(screen.getByText('399.99')).toBeInTheDocument()
      expect(screen.getByText('29.99')).toBeInTheDocument()
    })
  })

  /*
  describe('Sorting', () => {
    test('should sort products by price when clicking price column header', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText('Laptop Pro 15"')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Find and click the Price column header (it's a th element with role="button")
      const priceHeader = screen.getByRole('button', { name: 'Price' })
      expect(priceHeader).toBeInTheDocument()

      // Click to sort ascending
      await user.click(priceHeader)

      // Wait for sorted data (by price ascending: $29.99, $399.99, $1299.99)
      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        // Find the data rows (skip header row)
        const dataRows = rows.filter(row => !row.querySelector('th'))
        expect(dataRows[0]).toHaveTextContent('JavaScript: The Good Parts') // $29.99
        expect(dataRows[1]).toHaveTextContent('Ergonomic Office Chair') // $399.99
        expect(dataRows[2]).toHaveTextContent('Laptop Pro 15"') // $1299.99
      }, { timeout: 5000 })

      // Click again to sort descending
      await user.click(priceHeader)

      // Wait for reverse sorted data (by price descending: $1299.99, $399.99, $29.99)
      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        const dataRows = rows.filter(row => !row.querySelector('th'))
        expect(dataRows[0]).toHaveTextContent('Laptop Pro 15"') // $1299.99
        expect(dataRows[1]).toHaveTextContent('Ergonomic Office Chair') // $399.99
        expect(dataRows[2]).toHaveTextContent('JavaScript: The Good Parts') // $29.99
      }, { timeout: 5000 })
    })
  })

  describe('Pagination', () => {
    test('should display second page products when clicking Next button', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for page 1 data to load
      await waitFor(() => {
        expect(screen.getByText('Laptop Pro 15"')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify page 1 products are visible
      expect(screen.getByText('Laptop Pro 15"')).toBeInTheDocument()
      expect(screen.getByText('Ergonomic Office Chair')).toBeInTheDocument()

      // Find and click the Next button
      const nextButton = screen.getByRole('button', { name: 'Go to next page' })
      expect(nextButton).toBeInTheDocument()
      
      await user.click(nextButton)

      // Wait for page 2 data to load
      await waitFor(() => {
        expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify page 2 products are displayed
      expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()
      expect(screen.getByText('Standing Desk')).toBeInTheDocument()
      expect(screen.getByText('React Patterns Guide')).toBeInTheDocument()

      // Verify page 2 SKUs are displayed
      expect(screen.getByText('MOUSE-001')).toBeInTheDocument()
      expect(screen.getByText('DESK-001')).toBeInTheDocument()
      expect(screen.getByText('BOOK-002')).toBeInTheDocument()

      // Verify page 1 products are no longer visible
      expect(screen.queryByText('Laptop Pro 15"')).not.toBeInTheDocument()
      expect(screen.queryByText('LAPTOP-001')).not.toBeInTheDocument()
    })
  })
  */

  describe('Row Navigation', () => {
    test('should navigate to product detail when clicking on a row', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Laptop Pro 15"')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Find the first product row and click it
      const firstProductRow = screen.getByText('Laptop Pro 15"').closest('tr')
      expect(firstProductRow).toBeInTheDocument()

      if (firstProductRow) {
        await user.click(firstProductRow)

        // Verify navigation was called with the correct product ID
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith('/app/products/1')
        }, { timeout: 3000 })
      }
    })

    test('should navigate to correct product when clicking different rows', async () => {
      render(
        <TestWrapper>
          <ProductsTable />
        </TestWrapper>
      )

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Ergonomic Office Chair')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Click on the second product (Ergonomic Office Chair with ID 2)
      const secondProductRow = screen.getByText('Ergonomic Office Chair').closest('tr')
      expect(secondProductRow).toBeInTheDocument()

      if (secondProductRow) {
        await user.click(secondProductRow)

        // Verify navigation was called with the correct product ID
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith('/app/products/2')
        }, { timeout: 3000 })
      }
    })
  })
}) 