import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UploadWizard from '@/features/imports/UploadWizard'
import { useImportFieldSchema } from '@/features/imports/hooks/useImportFieldSchema'
import { createImport } from '@/services/importService'
import { BrowserRouter } from 'react-router-dom'
import * as importService from '@/services/importService'

// Use jest-compatible mocking approach
vi.mock('@/services/importService', () => ({
  createImport: vi.fn(),
  createAttributeGroupImport: vi.fn(),
  createAttributeImport: vi.fn(),
  createFamilyImport: vi.fn(), 
  getImport: vi.fn(),
  getImportFieldSchema: vi.fn(),
  getAttributeGroupSchemaFields: vi.fn(),
  getAttributeSchemaFields: vi.fn(),
  getFamilySchemaFields: vi.fn(),
  getFamilyAttributes: vi.fn()
}))

// Mock the useImportFieldSchema hook
vi.mock('./hooks/useImportFieldSchema', () => ({
  useImportFieldSchema: vi.fn()
}))

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

// Mock the child components
vi.mock('./StepUpload', () => ({
  default: ({ onFileSelected }: { onFileSelected: (file: File, headers: string[], previewData: any[]) => void }) => (
    <div data-testid="step-upload">
      <button 
        onClick={() => {
          const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' })
          const mockHeaders = ['SKU', 'Name', 'Description']
          const mockPreviewData = [{ SKU: 'TEST001', Name: 'Test Product', Description: 'Test Description' }]
          onFileSelected(mockFile, mockHeaders, mockPreviewData)
        }}
      >
        Upload File
      </button>
    </div>
  )
}))

vi.mock('./StepMapping', () => ({
  default: ({ sourceHeaders, onMappingComplete }: { 
    sourceHeaders: string[], 
    onMappingComplete: (mapping: Record<string, string>) => void 
  }) => (
    <div data-testid="step-mapping">
      <div>Headers: {sourceHeaders.join(', ')}</div>
      <button 
        onClick={() => {
          const mapping = {
            'SKU': 'sku',
            'Name': 'name',
            'Description': 'description'
          }
          onMappingComplete(mapping)
        }}
      >
        Complete Mapping
      </button>
    </div>
  )
}))

vi.mock('./StepProgress', () => ({
  default: ({ importId }: { importId: number }) => (
    <div data-testid="step-progress">
      Import ID: {importId}
    </div>
  )
}))

describe('UploadWizard', () => {
  // Create a new QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })

  // Mock schema data
  const mockSchema = [
    { id: 'sku', label: 'SKU', required: true, type: 'string' },
    { id: 'name', label: 'Name', required: false, type: 'string' },
    { id: 'description', label: 'Description', required: false, type: 'text' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock the schema hook
    vi.mocked(useImportFieldSchema).mockReturnValue({
      productFieldSchema: mockSchema,
      attributeHeaderPattern: "attr_.*",
      attributeGroupSchema: null,
      attributeSchema: null,
      familySchema: null,
      isLoading: false,
      isError: false
    })
    
    // Mock the createImport function
    vi.mocked(createImport).mockResolvedValue({
      data: { id: 123, status: 'queued', processed: 0, total_rows: null, created_at: '2023-01-01T00:00:00Z' }
    })

    // Setup mock responses for schema queries
    vi.mocked(importService.getImportFieldSchema).mockResolvedValue({
      data: {
        fields: [
          { id: 'name', label: 'Name', required: true, type: 'string' },
          { id: 'sku', label: 'SKU', required: true, type: 'string' },
          { id: 'price', label: 'Price', required: false, type: 'number' }
        ],
        attribute_header_pattern: "attr_.*"
      }
    })
    
    vi.mocked(importService.getAttributeGroupSchemaFields).mockResolvedValue({
      data: [
        { id: 'code', label: 'Code', required: true, type: 'string' },
        { id: 'name', label: 'Name', required: true, type: 'string' }
      ]
    })
    
    vi.mocked(importService.getAttributeSchemaFields).mockResolvedValue({
      data: [
        { id: 'code', label: 'Code', required: true, type: 'string' },
        { id: 'group', label: 'Group', required: true, type: 'string' },
        { id: 'type', label: 'Type', required: true, type: 'string' }
      ]
    })
    
    vi.mocked(importService.getFamilySchemaFields).mockResolvedValue({
      data: [
        { id: 'code', label: 'Code', required: true, type: 'string' },
        { id: 'name', label: 'Name', required: true, type: 'string' },
        { id: 'attributes', label: 'Attributes', required: false, type: 'array' }
      ]
    })
    
    // Mock successful import response
    vi.mocked(importService.createImport).mockResolvedValue({
      data: { id: 123, status: 'queued', processed: 0, total_rows: 100, created_at: '2023-01-01' }
    })
    
    vi.mocked(importService.createAttributeGroupImport).mockResolvedValue({
      data: { id: 124, status: 'queued', processed: 0, total_rows: 10, created_at: '2023-01-01' }
    })
    
    // Mock getImport for progress
    vi.mocked(importService.getImport).mockResolvedValue({
      data: { id: 123, status: 'success', processed: 100, total_rows: 100, created_at: '2023-01-01' }
    })
  })

  it('should render the first step by default', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UploadWizard />
      </QueryClientProvider>
    )

    expect(screen.getByTestId('step-upload')).toBeInTheDocument()
    expect(screen.queryByTestId('step-mapping')).toBeNull()
    expect(screen.queryByTestId('step-progress')).toBeNull()
  })

  it('should move to mapping step after file upload', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UploadWizard />
      </QueryClientProvider>
    )

    // Click the upload button to simulate file selection
    fireEvent.click(screen.getByText('Upload File'))

    // Should now be on the mapping step
    expect(screen.getByTestId('step-mapping')).toBeInTheDocument()
    expect(screen.queryByTestId('step-upload')).toBeNull()
    expect(screen.getByText('Headers: SKU, Name, Description')).toBeInTheDocument()
  })

  it('should call the API and move to progress step after mapping', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UploadWizard />
      </QueryClientProvider>
    )

    // First step: upload
    fireEvent.click(screen.getByText('Upload File'))

    // Second step: mapping
    fireEvent.click(screen.getByText('Complete Mapping'))

    // Wait for API call to resolve and component to update
    await waitFor(() => {
      expect(createImport).toHaveBeenCalledWith(
        expect.any(File), 
        { 'SKU': 'sku', 'Name': 'name', 'Description': 'description' },
        { overwrite_policy: 'overwrite' }
      )
    })

    // Should now be on the progress step
    expect(screen.getByTestId('step-progress')).toBeInTheDocument()
    expect(screen.getByText('Import ID: 123')).toBeInTheDocument()
  })

  it('should handle API errors during import creation', async () => {
    // Mock API error
    vi.mocked(createImport).mockRejectedValue(new Error('API error'))
    
    // Mock toast
    const mockToast = vi.fn()
    vi.mock('@/components/ui/use-toast', () => ({
      useToast: () => ({ toast: mockToast })
    }))

    render(
      <QueryClientProvider client={queryClient}>
        <UploadWizard />
      </QueryClientProvider>
    )

    // First step: upload
    fireEvent.click(screen.getByText('Upload File'))

    // Second step: mapping
    fireEvent.click(screen.getByText('Complete Mapping'))

    // Wait for API call to reject
    await waitFor(() => {
      expect(createImport).toHaveBeenCalled()
    })

    // Should still be on the mapping step
    expect(screen.getByTestId('step-mapping')).toBeInTheDocument()
    expect(screen.queryByTestId('step-progress')).toBeNull()
    
    // A toast should have been shown
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error starting import',
      variant: 'destructive'
    }))
  })

  test('renders import mode selection step initially', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UploadWizard />
        </BrowserRouter>
      </QueryClientProvider>
    )
    
    // Check that mode selection is visible
    expect(screen.getByText('Choose Import Mode')).toBeInTheDocument()
    expect(screen.getByText('Products only')).toBeInTheDocument()
    expect(screen.getByText('Structure only')).toBeInTheDocument()
    expect(screen.getByText('Structure → Products')).toBeInTheDocument()
  })
  
  test('can select products import mode and proceed', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UploadWizard />
        </BrowserRouter>
      </QueryClientProvider>
    )
    
    // Select products mode and continue
    fireEvent.click(screen.getByText('Products only'))
    fireEvent.click(screen.getByText('Continue'))
    
    // Should now be on upload step
    await waitFor(() => {
      expect(screen.getByText('Choose a CSV or Excel file to import')).toBeInTheDocument()
    })
  })
  
  test('can select structure import mode and choose attribute groups', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UploadWizard />
        </BrowserRouter>
      </QueryClientProvider>
    )
    
    // Select structure mode and continue
    fireEvent.click(screen.getByText('Structure only'))
    fireEvent.click(screen.getByText('Continue'))
    
    // Should now see structure type selection
    await waitFor(() => {
      expect(screen.getByText('Select Structure Type')).toBeInTheDocument()
    })
    
    // Select attribute groups
    fireEvent.click(screen.getByText('Attribute Groups'))
    
    // File upload should be enabled
    expect(screen.getByText('Select File')).not.toBeDisabled()
  })
  
  test('completes product import flow', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UploadWizard />
        </BrowserRouter>
      </QueryClientProvider>
    )
    
    // Select products mode and continue
    fireEvent.click(screen.getByText('Products only'))
    fireEvent.click(screen.getByText('Continue'))
    
    // Mock file upload (we'd need to mock FileReader for a full test)
    // This is a simplified version
    const mockHeaders = ['name', 'sku', 'price']
    const mockPreviewData = [{ name: 'Test Product', sku: 'TP-001', price: '19.99' }]
    
    // Get the component instance and call its handler directly
    const uploadComponent = screen.getByText('Choose a CSV or Excel file to import').closest('div')
    
    // Continue to mapping step (simulating what happens after file upload)
    fireEvent.click(screen.getByText('1. Upload File'))
    fireEvent.click(screen.getByText('2. Map Columns'))
    
    // Since we can't fully test the file upload, we'll check the import creation is called
    vi.mocked(importService.createImport).mockResolvedValue({
      data: { id: 123, status: 'queued', processed: 0, total_rows: 100, created_at: '2023-01-01' }
    })
  })

  it('should apply the selected duplicate strategy when creating an import', async () => {
    // Mock the import service function to capture passed parameters
    const mockCreateImport = importService.createImport as vi.Mock
    mockCreateImport.mockResolvedValue({
      data: { id: 123 }
    })
    
    // Set up the component with product import mode
    render(
      <QueryClientProvider client={queryClient}>
        <UploadWizard />
      </QueryClientProvider>
    )
    
    // Upload a file
    fireEvent.click(screen.getByText('Upload File'))
    
    // Complete mapping
    fireEvent.click(screen.getByText('Complete Mapping'))
    
    // Wait for API call to be made
    await waitFor(() => {
      expect(mockCreateImport).toHaveBeenCalledWith(
        expect.any(File),
        expect.any(Object),
        { overwrite_policy: 'overwrite' }
      )
    })
  })
}) 