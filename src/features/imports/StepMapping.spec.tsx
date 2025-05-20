import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StepMapping from '@/features/imports/StepMapping'
import { useImportFieldSchema } from '@/features/imports/hooks/useImportFieldSchema'

// Mock the useImportFieldSchema hook
vi.mock('./hooks/useImportFieldSchema', () => ({
  useImportFieldSchema: vi.fn()
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('StepMapping', () => {
  // Create a new QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })

  const mockOnMappingComplete = vi.fn()
  const mockSourceHeaders = ['Product Name', 'Product SKU', 'Description', 'GTIN']

  // Mock schema data
  const mockSchema = [
    { id: 'sku', label: 'SKU', required: true, type: 'string' },
    { id: 'name', label: 'Name', required: false, type: 'string' },
    { id: 'description', label: 'Description', required: false, type: 'text' },
    { id: 'gtin', label: 'GTIN', required: false, type: 'string' },
    { id: 'category', label: 'Category', required: false, type: 'breadcrumb' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should show loading state when fetching schema', () => {
    // Mock loading state
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: undefined,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: true,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping sourceHeaders={mockSourceHeaders} onMappingComplete={mockOnMappingComplete} />
      </QueryClientProvider>
    )

    // Should show skeletons during loading
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('should show error state when schema fetch fails', async () => {
    // Mock error state
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: undefined,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: true
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping sourceHeaders={mockSourceHeaders} onMappingComplete={mockOnMappingComplete} />
      </QueryClientProvider>
    )

    // Should show error message
    expect(screen.getByText('Error Loading Schema')).toBeInTheDocument()
    expect(screen.getByText('Failed to load the field schema. Please try again later or contact support.')).toBeInTheDocument()
  })

  it('should render all source headers and schema fields', async () => {
    // Mock successful schema load
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping sourceHeaders={mockSourceHeaders} onMappingComplete={mockOnMappingComplete} />
      </QueryClientProvider>
    )

    // Should render the source headers
    expect(screen.getByText('Product Name')).toBeInTheDocument()
    expect(screen.getByText('Product SKU')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('GTIN')).toBeInTheDocument()

    // Should render required badge for SKU (only required field)
    const requiredBadges = screen.getAllByText(/\s\*$/)
    expect(requiredBadges.length).toBe(1)
    expect(requiredBadges[0].textContent).toContain('SKU')
  })

  it('should auto-map fields with similar names', async () => {
    // Mock successful schema load
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping sourceHeaders={mockSourceHeaders} onMappingComplete={mockOnMappingComplete} />
      </QueryClientProvider>
    )

    // Auto-mapping should map fields with similar names
    // For example, "Product SKU" should be mapped to "sku"
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBe(mockSourceHeaders.length)

    // Ensure the SKU field got mapped
    const skuSelect = selects[1] // "Product SKU" is at index 1
    expect(skuSelect).toHaveTextContent('SKU')
  })

  it('should show warning if name is not mapped', async () => {
    // Mock successful schema load
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping 
          sourceHeaders={['Product Code', 'Price']} // No name or similar field
          onMappingComplete={mockOnMappingComplete} 
        />
      </QueryClientProvider>
    )

    // Should show warning about name field
    expect(screen.getByText('We recommend mapping the "Name" field for better product identification.')).toBeInTheDocument()
  })

  it('should not allow completion if required fields are not mapped', async () => {
    // Mock successful schema load
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping 
          sourceHeaders={['Price', 'Description']} // No SKU field
          onMappingComplete={mockOnMappingComplete} 
        />
      </QueryClientProvider>
    )

    // Next button should be disabled
    const nextButton = screen.getByText('Next')
    expect(nextButton).toBeDisabled()
  })

  it('should call onMappingComplete with correct mapping when complete', async () => {
    // Mock successful schema load
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping 
          sourceHeaders={['Product SKU', 'Product Name']}
          onMappingComplete={mockOnMappingComplete} 
        />
      </QueryClientProvider>
    )

    // Simulate manual mapping
    const selects = screen.getAllByRole('combobox')
    
    // Set the SKU mapping
    fireEvent.click(selects[0])
    fireEvent.click(screen.getByText('SKU *'))
    
    // Set the name mapping
    fireEvent.click(selects[1])
    fireEvent.click(screen.getByText('Name'))

    // Click next button
    const nextButton = screen.getByText('Next')
    expect(nextButton).not.toBeDisabled()
    fireEvent.click(nextButton)

    // Check the mapping was passed correctly
    expect(mockOnMappingComplete).toHaveBeenCalledWith({
      'Product SKU': 'sku',
      'Product Name': 'name'
    })
  })

  it('shows attribute column indicators for matching headers', () => {
    const sourceHeaders = ['SKU', 'Name', 'attr_color', 'attr_size', 'Price']
    const onMappingComplete = vi.fn()

    // Mock attribute header pattern
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: "attr_.*", 
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping
          sourceHeaders={sourceHeaders}
          onMappingComplete={onMappingComplete}
        />
      </QueryClientProvider>
    )

    // Check that attribute badges are rendered
    const attributeBadges = screen.getAllByText(/Attribute/)
    expect(attributeBadges.length).toBe(2)
  })

  it('shows family field warning when attribute columns present but family not mapped', async () => {
    const sourceHeaders = ['SKU', 'Name', 'attr_color', 'attr_size', 'Price']
    const onMappingComplete = vi.fn()

    // Mock attribute header pattern
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: "attr_.*", 
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping
          sourceHeaders={sourceHeaders}
          onMappingComplete={onMappingComplete}
        />
      </QueryClientProvider>
    )

    // Check that the family warning is shown
    expect(screen.getByText('Family field not mapped')).toBeInTheDocument()
    expect(screen.getByText(/Attribute columns will be ignored without a family/)).toBeInTheDocument()
  })

  it('shows special styling for the family_code field in available fields', () => {
    const sourceHeaders = ['SKU', 'Name', 'Price']
    const onMappingComplete = vi.fn()

    // Add family_code to the schema
    const schemaWithFamily = [
      ...mockSchema,
      { id: 'family_code', label: 'Family', required: false, type: 'string' }
    ]

    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: schemaWithFamily,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping
          sourceHeaders={sourceHeaders}
          onMappingComplete={onMappingComplete}
        />
      </QueryClientProvider>
    )

    // Find the family badge in available fields
    const familyBadge = screen.getByText('Family')
    expect(familyBadge).toBeInTheDocument()
  })

  it('correctly handles mapping completion when required fields are mapped', async () => {
    const sourceHeaders = ['SKU', 'Name', 'Price']
    const onMappingComplete = vi.fn()

    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: null,
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StepMapping
          sourceHeaders={sourceHeaders}
          onMappingComplete={onMappingComplete}
          previewData={[{ SKU: '123', Name: 'Test', Price: '10.00' }]}
        />
      </QueryClientProvider>
    )

    // Check that the required fields are shown with asterisks
    expect(screen.getByText('SKU *')).toBeInTheDocument()

    // Simulate SKU mapping
    const selects = screen.getAllByRole('combobox')
    fireEvent.click(selects[0]) // SKU select
    fireEvent.click(screen.getByText('SKU *'))

    // Complete the mapping
    fireEvent.click(screen.getByText('Next'))

    // Expect the onMappingComplete callback to be called
    expect(onMappingComplete).toHaveBeenCalled()
  })
}) 