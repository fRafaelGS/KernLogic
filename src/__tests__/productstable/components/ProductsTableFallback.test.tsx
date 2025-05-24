import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductsTableFallback } from '@/components/products/productstable/ProductsTableFallback'
import type { ColumnDef } from '@tanstack/react-table'
import type { Product } from '@/services/productService'

// Mock React Router
jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}))

// Mock UI components
jest.mock('@/components/ui/table', () => ({
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div className={className} data-testid="skeleton" />
  )
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FilterIcon: () => <span data-testid="filter-icon">🔍</span>,
  RefreshCw: () => <span data-testid="refresh-icon">🔄</span>,
  ShoppingBagIcon: () => <span data-testid="shopping-bag-icon">🛍️</span>,
  PlusIcon: () => <span data-testid="plus-icon">➕</span>,
  XIcon: () => <span data-testid="x-icon">❌</span>
}))

describe('ProductsTableFallback', () => {
  const mockHandleClearFilters = jest.fn()
  const mockHandleRefresh = jest.fn()

  const mockColumns: ColumnDef<Product>[] = [
    { id: 'select', header: 'Select' },
    { id: 'name', header: 'Name' },
    { id: 'sku', header: 'SKU' },
    { id: 'brand', header: 'Brand' },
    { id: 'barcode', header: 'Barcode' },
    { id: 'created_at', header: 'Created' },
    { id: 'tags', header: 'Tags' }
  ]

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    description: 'Test Description',
    sku: 'TEST-001',
    category: { id: 1, name: 'Electronics' },
    is_active: true,
    tags: ['tech'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    test('should render skeleton rows when loading', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={true}
              filteredData={[]}
              filters={{}}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      // Should render 5 skeleton rows
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons).toHaveLength(35) // 5 rows × 7 columns

      // Should have loading announcement
      expect(screen.getByText('Loading product data…')).toBeInTheDocument()
    })

    test('should render correct number of skeleton columns', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={true}
              filteredData={[]}
              filters={{}}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      const rows = screen.getAllByRole('row')
      // 5 skeleton rows + 1 screen reader announcement row
      expect(rows).toHaveLength(6)
    })

    test('should apply mobile-hidden classes to appropriate columns', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={true}
              filteredData={[]}
              filters={{}}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      const cells = screen.getAllByRole('cell')
      // Check that brand, barcode, created_at, and tags columns have hidden class
      const hiddenCells = cells.filter(cell => 
        cell.className.includes('hidden md:table-cell')
      )
      expect(hiddenCells.length).toBeGreaterThan(0)
    })

    test('should apply special width classes for name and select columns', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={true}
              filteredData={[]}
              filters={{}}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      const cells = screen.getAllByRole('cell')
      const selectCells = cells.filter(cell => cell.className.includes('w-10'))
      const nameCells = cells.filter(cell => cell.className.includes('w-1/4'))
      
      expect(selectCells.length).toBe(5) // 5 skeleton rows with select column
      expect(nameCells.length).toBe(5) // 5 skeleton rows with name column
    })
  })

  describe('No Data State - Without Filters', () => {
    test('should render no products message when no data and no filters', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ status: 'all' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByTestId('shopping-bag-icon')).toBeInTheDocument()
      expect(screen.getByText('No products found')).toBeInTheDocument()
      expect(screen.getByText(/There are no products in your inventory yet/)).toBeInTheDocument()
      expect(screen.getByText('Add Product')).toBeInTheDocument()
    })

    test('should render link to add new product', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ status: 'all' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      const addLink = screen.getByRole('link')
      expect(addLink).toHaveAttribute('href', '/app/products/new')
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument()
    })
  })

  describe('No Data State - With Filters', () => {
    test('should render no matches message when filtered data is empty', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ search: 'nonexistent' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByTestId('filter-icon')).toBeInTheDocument()
      expect(screen.getByText('No products match your filters')).toBeInTheDocument()
      expect(screen.getByText(/Try adjusting your search or filter criteria/)).toBeInTheDocument()
    })

    test('should render Clear Filters and Refresh buttons when filtered', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ search: 'test', category: 'electronics' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
      expect(screen.getByText('Refresh')).toBeInTheDocument()
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
    })

    test('should call handleClearFilters when Clear Filters button is clicked', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ search: 'test' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      fireEvent.click(screen.getByText('Clear Filters'))
      expect(mockHandleClearFilters).toHaveBeenCalledTimes(1)
    })

    test('should call handleRefresh when Refresh button is clicked', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ search: 'test' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      fireEvent.click(screen.getByText('Refresh'))
      expect(mockHandleRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('Filter Detection', () => {
    test('should detect filters with search term', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ search: 'test product' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    })

    test('should detect filters with category', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ category: 'electronics' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    })

    test('should detect filters with status not all', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ status: 'active' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    })

    test('should detect filters with price ranges', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ minPrice: '10', maxPrice: '100' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    })

    test('should detect filters with tags', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ tags: ['electronics', 'mobile'] }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    })

    test('should detect filters with searchTerm', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ searchTerm: 'phone' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    })
  })

  describe('Data Present State', () => {
    test('should return null when data is present', () => {
      const { container } = render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[mockProduct]}
              filters={{}}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      // Component should render nothing when data is present
      expect(container.querySelector('tbody')).toBeEmptyDOMElement()
    })
  })

  describe('Column Spanning', () => {
    test('should span all columns for no data states', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ status: 'all' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      const cell = screen.getByRole('cell')
      expect(cell).toHaveAttribute('colSpan', '7') // Number of columns
    })

    test('should handle different numbers of columns', () => {
      const shortColumns = mockColumns.slice(0, 3)
      
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={shortColumns}
              loading={false}
              filteredData={[]}
              filters={{ status: 'all' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      const cell = screen.getByRole('cell')
      expect(cell).toHaveAttribute('colSpan', '3')
    })
  })

  describe('Accessibility', () => {
    test('should provide screen reader announcement for loading state', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={true}
              filteredData={[]}
              filters={{}}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      const announcement = screen.getByText('Loading product data…')
      expect(announcement.closest('tr')).toHaveClass('sr-only')
    })

    test('should have proper button roles and labels', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ search: 'test' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByRole('button', { name: /Clear Filters/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument()
    })

    test('should have proper link role for add product', () => {
      render(
        <table>
          <tbody>
            <ProductsTableFallback
              columns={mockColumns}
              loading={false}
              filteredData={[]}
              filters={{ status: 'all' }}
              handleClearFilters={mockHandleClearFilters}
              handleRefresh={mockHandleRefresh}
            />
          </tbody>
        </table>
      )

      expect(screen.getByRole('link', { name: /Add Product/ })).toBeInTheDocument()
    })
  })
}) 