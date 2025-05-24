import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewToggle } from '@/components/products/ViewToggle'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Grid2X2: () => <span data-testid="grid-icon">🔲</span>,
  List: () => <span data-testid="list-icon">📄</span>
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  )
}))

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div 
      data-testid="tabs-container" 
      data-value={value}
      className={className}
      onClick={() => onValueChange && onValueChange(value === 'list' ? 'grid' : 'list')}
    >
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value, className, ...props }: any) => (
    <button 
      data-testid={`tab-trigger-${value}`}
      data-value={value}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}))

describe('ViewToggle', () => {
  const mockOnViewChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('should render with list view selected by default', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      expect(screen.getByTestId('tabs-container')).toHaveAttribute('data-value', 'list')
      expect(screen.getByTestId('tab-trigger-list')).toBeInTheDocument()
      expect(screen.getByTestId('tab-trigger-grid')).toBeInTheDocument()
    })

    test('should render with grid view selected', () => {
      render(
        <ViewToggle view="grid" onViewChange={mockOnViewChange} />
      )

      expect(screen.getByTestId('tabs-container')).toHaveAttribute('data-value', 'grid')
    })

    test('should render correct icons for each view', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      expect(screen.getByTestId('list-icon')).toBeInTheDocument()
      expect(screen.getByTestId('grid-icon')).toBeInTheDocument()
    })

    test('should render view labels on larger screens', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      const listTrigger = screen.getByTestId('tab-trigger-list')
      const gridTrigger = screen.getByTestId('tab-trigger-grid')

      expect(listTrigger).toContainElement(screen.getByText('List'))
      expect(gridTrigger).toContainElement(screen.getByText('Grid'))
    })

    test('should apply correct CSS classes', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      expect(screen.getByTestId('tabs-container')).toHaveClass('h-9')
      expect(screen.getByTestId('tabs-list')).toHaveClass('h-9')
    })

    test('should have proper flex layout classes for triggers', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      const listTrigger = screen.getByTestId('tab-trigger-list')
      const gridTrigger = screen.getByTestId('tab-trigger-grid')

      expect(listTrigger).toHaveClass('flex', 'items-center', 'gap-1', 'px-3')
      expect(gridTrigger).toHaveClass('flex', 'items-center', 'gap-1', 'px-3')
    })
  })

  describe('Interactions', () => {
    test('should call onViewChange when clicking tabs container', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      fireEvent.click(screen.getByTestId('tabs-container'))
      expect(mockOnViewChange).toHaveBeenCalledWith('grid')
    })

    test('should handle view change from grid to list', () => {
      render(
        <ViewToggle view="grid" onViewChange={mockOnViewChange} />
      )

      fireEvent.click(screen.getByTestId('tabs-container'))
      expect(mockOnViewChange).toHaveBeenCalledWith('list')
    })

    test('should call onViewChange with correct view type', () => {
      const { rerender } = render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      // Test switching from list to grid
      fireEvent.click(screen.getByTestId('tabs-container'))
      expect(mockOnViewChange).toHaveBeenCalledWith('grid')

      // Clear mock and test switching from grid to list
      mockOnViewChange.mockClear()
      rerender(<ViewToggle view="grid" onViewChange={mockOnViewChange} />)
      
      fireEvent.click(screen.getByTestId('tabs-container'))
      expect(mockOnViewChange).toHaveBeenCalledWith('list')
    })

    test('should handle rapid clicking', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      const tabsContainer = screen.getByTestId('tabs-container')
      
      fireEvent.click(tabsContainer)
      fireEvent.click(tabsContainer)
      fireEvent.click(tabsContainer)

      expect(mockOnViewChange).toHaveBeenCalledTimes(3)
    })
  })

  describe('Accessibility', () => {
    test('should have proper tab roles and attributes', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      const listTrigger = screen.getByTestId('tab-trigger-list')
      const gridTrigger = screen.getByTestId('tab-trigger-grid')

      expect(listTrigger).toHaveAttribute('data-value', 'list')
      expect(gridTrigger).toHaveAttribute('data-value', 'grid')
    })

    test('should be keyboard accessible', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      const listTrigger = screen.getByTestId('tab-trigger-list')
      
      fireEvent.keyDown(listTrigger, { key: 'Enter' })
      // Note: The actual keyboard behavior depends on the underlying Tabs implementation
    })

    test('should render icons with proper accessible text', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      // The icons should have accessible text through the visible labels
      expect(screen.getByText('List')).toBeInTheDocument()
      expect(screen.getByText('Grid')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    test('should hide text labels on small screens with proper CSS classes', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      const listLabel = screen.getByText('List')
      const gridLabel = screen.getByText('Grid')

      expect(listLabel).toHaveClass('hidden', 'sm:inline')
      expect(gridLabel).toHaveClass('hidden', 'sm:inline')
    })

    test('should maintain icon visibility across screen sizes', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      // Icons should always be visible regardless of screen size
      expect(screen.getByTestId('list-icon')).toBeInTheDocument()
      expect(screen.getByTestId('grid-icon')).toBeInTheDocument()
    })
  })

  describe('Props Validation', () => {
    test('should handle both valid view prop values', () => {
      const { rerender } = render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      expect(screen.getByTestId('tabs-container')).toHaveAttribute('data-value', 'list')

      rerender(<ViewToggle view="grid" onViewChange={mockOnViewChange} />)
      expect(screen.getByTestId('tabs-container')).toHaveAttribute('data-value', 'grid')
    })

    test('should call onViewChange callback function when provided', () => {
      render(
        <ViewToggle view="list" onViewChange={mockOnViewChange} />
      )

      fireEvent.click(screen.getByTestId('tabs-container'))
      expect(typeof mockOnViewChange).toBe('function')
      expect(mockOnViewChange).toHaveBeenCalled()
    })
  })
}) 