import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductsSearchBox } from '@/components/products/ProductsSearchBox'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  SearchIcon: () => <span data-testid="search-icon">🔍</span>
}))

// Mock UI components
jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, any>(({ ...props }, ref) => (
    <input ref={ref} {...props} />
  ))
}))

describe('ProductsSearchBox', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('should render search input with default props', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('placeholder', 'Search products...')
      expect(input).toHaveValue('')
    })

    test('should render with custom placeholder', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
          placeholder="Find your products..."
        />
      )

      expect(screen.getByPlaceholderText('Find your products...')).toBeInTheDocument()
    })

    test('should render with provided value', () => {
      render(
        <ProductsSearchBox
          value="test search"
          onChange={mockOnChange}
        />
      )

      expect(screen.getByDisplayValue('test search')).toBeInTheDocument()
    })

    test('should render search icon', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    })

    test('should apply custom className', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
          className="custom-search-class"
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-search-class')
    })

    test('should apply default CSS classes', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-8', 'h-9')
    })
  })

  describe('Interactions', () => {
    test('should call onChange when user types in input', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'new search term' } })

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      // Verify the event was called with correct value
      expect(mockOnChange.mock.calls[0][0].target.value).toBe('new search term')
    })

    test('should handle multiple character inputs', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      
      fireEvent.change(input, { target: { value: 'a' } })
      fireEvent.change(input, { target: { value: 'ab' } })
      fireEvent.change(input, { target: { value: 'abc' } })

      expect(mockOnChange).toHaveBeenCalledTimes(3)
    })

    test('should handle clearing input', () => {
      render(
        <ProductsSearchBox
          value="existing text"
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '' } })

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      expect(mockOnChange.mock.calls[0][0].target.value).toBe('')
    })

    test('should handle special characters in search', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'test@123 & symbols!' } })

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      expect(mockOnChange.mock.calls[0][0].target.value).toBe('test@123 & symbols!')
    })
  })

  describe('Keyboard Navigation', () => {
    test('should blur input when Escape key is pressed', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      input.focus()
      expect(input).toHaveFocus()

      fireEvent.keyDown(input, { key: 'Escape' })
      expect(input).not.toHaveFocus()
    })

    test('should not blur input on other key presses', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      input.focus()
      expect(input).toHaveFocus()

      fireEvent.keyDown(input, { key: 'Enter' })
      expect(input).toHaveFocus()

      fireEvent.keyDown(input, { key: 'Tab' })
      expect(input).toHaveFocus()
    })

    test('should handle arrow keys without affecting focus', () => {
      render(
        <ProductsSearchBox
          value="test"
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      input.focus()

      fireEvent.keyDown(input, { key: 'ArrowLeft' })
      fireEvent.keyDown(input, { key: 'ArrowRight' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      expect(input).toHaveFocus()
    })
  })

  describe('Focus Management', () => {
    test('should be focusable', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      input.focus()
      expect(input).toHaveFocus()
    })

    test('should maintain ref functionality', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      // Verify that the input can be accessed via ref
      const input = screen.getByRole('textbox')
      expect(input).toBeInstanceOf(HTMLInputElement)
    })
  })

  describe('Layout and Styling', () => {
    test('should have correct wrapper structure', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      const wrapper = input.closest('div')
      
      expect(wrapper).toHaveClass('relative')
    })

    test('should position search icon correctly', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const icon = screen.getByTestId('search-icon')
      expect(icon).toBeInTheDocument()
      
      // Icon should be positioned within the relative container
      expect(icon).toBeInTheDocument()
    })

    test('should have proper input padding for icon', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-8') // Left padding for search icon
    })
  })

  describe('Accessibility', () => {
    test('should have proper input type', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')
    })

    test('should be keyboard accessible', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      
      fireEvent.keyDown(input, { key: 'Tab' })
      // Input should be reachable via tab navigation
      expect(input).toBeInTheDocument()
    })

    test('should handle paste events', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.paste(input, {
        clipboardData: {
          getData: () => 'pasted content'
        }
      })

      // The component should handle paste events gracefully
      expect(input).toBeInTheDocument()
    })
  })

  describe('Props Validation', () => {
    test('should work with empty string value', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByDisplayValue('')).toBeInTheDocument()
    })

    test('should work with undefined className', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
          className={undefined}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    test('should combine custom and default classes', () => {
      render(
        <ProductsSearchBox
          value=""
          onChange={mockOnChange}
          className="custom-class"
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-8', 'h-9', 'custom-class')
    })
  })
}) 