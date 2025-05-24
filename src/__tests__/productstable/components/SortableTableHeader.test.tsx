import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SortableTableHeader } from '@/components/products/productstable/SortableTableHeader'
import type { Header } from '@tanstack/react-table'
import type { Product } from '@/services/productService'

// Mock the config module
jest.mock('@/config/config', () => ({
  config: {
    productsTable: {
      display: {
        tableView: {
          sortAscending: 'Sort ascending',
          sortDescending: 'Sort descending'
        }
      }
    }
  }
}))

// Mock components
jest.mock('@/components/ui/table', () => ({
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>
}))

// Mock tanstack table render function
jest.mock('@tanstack/react-table', () => ({
  flexRender: jest.fn((content) => content)
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowUp: () => <span data-testid="arrow-up">↑</span>,
  ArrowDown: () => <span data-testid="arrow-down">↓</span>
}))

describe('SortableTableHeader', () => {
  const mockGetToggleSortingHandler = jest.fn()

  const createMockHeader = (overrides = {}): Header<Product, unknown> => ({
    id: 'test-header',
    isPlaceholder: false,
    column: {
      id: 'name',
      getIsSorted: jest.fn(() => false),
      getCanSort: jest.fn(() => true),
      getToggleSortingHandler: mockGetToggleSortingHandler,
      columnDef: {
        header: 'Product Name'
      },
      getSize: jest.fn(() => 200)
    },
    getContext: jest.fn(() => ({})),
    getSize: jest.fn(() => 200),
    ...overrides
  } as any)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('should render basic header with content', () => {
      const mockHeader = createMockHeader()

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="name" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Product Name')).toBeInTheDocument()
    })

    test('should render select column without sort controls', () => {
      const mockHeader = createMockHeader({
        id: 'select-header',
        column: {
          ...createMockHeader().column,
          id: 'select'
        }
      })

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="select" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      const header = screen.getByRole('columnheader')
      expect(header).toHaveClass('w-10', 'bg-gray-100', 'font-semibold')
      expect(header).not.toHaveAttribute('role', 'button')
    })

    test('should hide mobile columns with correct CSS classes', () => {
      const mockHeader = createMockHeader()

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="brand" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      expect(screen.getByRole('button')).toHaveClass('hidden', 'md:table-cell')
    })
  })

  describe('Sorting States', () => {
    test('should display ascending arrow when sorted ascending', () => {
      const mockHeader = createMockHeader({
        column: {
          ...createMockHeader().column,
          getIsSorted: jest.fn(() => 'asc')
        }
      })

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="name" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      expect(screen.getByTestId('arrow-up')).toBeInTheDocument()
      expect(screen.getByText('Sort ascending')).toBeInTheDocument()
    })

    test('should display descending arrow when sorted descending', () => {
      const mockHeader = createMockHeader({
        column: {
          ...createMockHeader().column,
          getIsSorted: jest.fn(() => 'desc')
        }
      })

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="name" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      expect(screen.getByTestId('arrow-down')).toBeInTheDocument()
      expect(screen.getByText('Sort descending')).toBeInTheDocument()
    })

    test('should not display sort arrow when not sorted', () => {
      const mockHeader = createMockHeader()

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="name" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      expect(screen.queryByTestId('arrow-up')).not.toBeInTheDocument()
      expect(screen.queryByTestId('arrow-down')).not.toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    test('should call toggle sorting handler when sortable header is clicked', () => {
      const mockHandler = jest.fn()
      const mockHeader = createMockHeader({
        column: {
          ...createMockHeader().column,
          getToggleSortingHandler: jest.fn(() => mockHandler)
        }
      })

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="name" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockHandler).toHaveBeenCalled()
    })

    test('should not be clickable when column cannot be sorted', () => {
      const mockHeader = createMockHeader({
        column: {
          ...createMockHeader().column,
          getCanSort: jest.fn(() => false)
        }
      })

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="name" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      const header = screen.getByRole('columnheader')
      expect(header).not.toHaveAttribute('role', 'button')
      expect(header).not.toHaveAttribute('tabIndex')
    })

    test('should have proper accessibility attributes when sortable', () => {
      const mockHeader = createMockHeader()

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="name" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      const header = screen.getByRole('button')
      expect(header).toHaveAttribute('role', 'button')
      expect(header).toHaveAttribute('tabIndex', '0')
      expect(header).toHaveAttribute('aria-label', 'Sort ascending')
    })
  })

  describe('Placeholder Content', () => {
    test('should not render content when header is placeholder', () => {
      const mockHeader = createMockHeader({
        isPlaceholder: true
      })

      render(
        <table>
          <thead>
            <tr>
              <SortableTableHeader id="name" header={mockHeader} />
            </tr>
          </thead>
        </table>
      )

      expect(screen.queryByText('Product Name')).not.toBeInTheDocument()
    })
  })
}) 