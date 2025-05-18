import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UploadWizard from './UploadWizard'
import { useImportFieldSchema } from './hooks/useImportFieldSchema'
import { createImport } from '@/services/importService'

// Mock the API calls
vi.mock('@/services/importService', () => ({
  createImport: vi.fn(),
  getImportFieldSchema: vi.fn()
}))

// Mock the useImportFieldSchema hook
vi.mock('./hooks/useImportFieldSchema', () => ({
  useImportFieldSchema: vi.fn()
}))

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
      data: mockSchema,
      isLoading: false,
      isError: false
    } as any)
    
    // Mock the createImport function
    vi.mocked(createImport).mockResolvedValue({
      data: { id: 123, status: 'queued', processed: 0, total_rows: null, created_at: '2023-01-01T00:00:00Z' }
    } as any)
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
        { 'SKU': 'sku', 'Name': 'name', 'Description': 'description' }
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
}) 