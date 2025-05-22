import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as router from 'react-router-dom'
import StepProgress from '@/features/imports/StepProgress'
import { getImport, ImportTask } from '@/services/importService'
import axios from 'axios'

// Mock the service functions and dependencies
jest.mock('@/services/importService', () => ({
  getImport: jest.fn()
}))

jest.mock('axios')

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}))

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}))

describe('StepProgress Component', () => {
  const mockNavigate = jest.fn()
  const mockImportTask: ImportTask = {
    id: 123,
    status: 'running',
    processed: 50,
    total_rows: 100,
    created_at: '2023-08-10T12:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(router, 'useNavigate').mockImplementation(() => mockNavigate)
    
    // Default mock implementation of getImport
    jest.mocked(getImport).mockResolvedValue({ data: mockImportTask })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('displays import progress correctly', async () => {
    render(<StepProgress importId={123} />)
    
    // Wait for initial API call to resolve
    await waitFor(() => {
      expect(getImport).toHaveBeenCalledWith(123)
    })
    
    // Check that progress information is displayed
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('50 of 100 rows processed')).toBeInTheDocument()
  })

  it('shows error details when import task has errors', async () => {
    // Mock error response
    const errorTask: ImportTask = {
      ...mockImportTask,
      status: 'partial_success',
      processed: 80,
      error_count: 20,
      error_file_url: 'https://example.com/errors.csv'
    }
    
    jest.mocked(getImport).mockResolvedValue({ data: errorTask })
    
    // Mock axios for error CSV
    jest.mocked(axios.get).mockResolvedValue({
      data: 'row,sku,field,error\n1,ABC123,price,Invalid price format\n2,DEF456,name,Name too long'
    })
    
    render(<StepProgress importId={123} />)
    
    // Wait for API calls to resolve
    await waitFor(() => {
      expect(getImport).toHaveBeenCalledWith(123)
      expect(axios.get).toHaveBeenCalledWith('https://example.com/errors.csv')
    })
    
    // Check error badge and download button
    expect(screen.getByText('20 rows failed')).toBeInTheDocument()
    expect(screen.getByText('Download Errors')).toBeInTheDocument()
    
    // Check error table
    expect(screen.getByText('Invalid price format')).toBeInTheDocument()
    expect(screen.getByText('Name too long')).toBeInTheDocument()
  })

  it('displays success message when import is complete', async () => {
    // Mock success response
    const successTask: ImportTask = {
      ...mockImportTask,
      status: 'success',
      processed: 100
    }
    
    jest.mocked(getImport).mockResolvedValue({ data: successTask })
    
    render(<StepProgress importId={123} />)
    
    // Wait for API call to resolve
    await waitFor(() => {
      expect(getImport).toHaveBeenCalledWith(123)
    })
    
    // Check success message
    expect(screen.getByText('Import completed successfully')).toBeInTheDocument()
    expect(screen.getByText('All 100 rows were imported successfully.')).toBeInTheDocument()
    expect(screen.getByText('View Products')).toBeInTheDocument()
  })

  it('calls onComplete when provided and import succeeds', async () => {
    // Mock success response
    const successTask: ImportTask = {
      ...mockImportTask,
      status: 'success',
      processed: 100
    }
    
    jest.mocked(getImport).mockResolvedValue({ data: successTask })
    
    const onComplete = jest.fn()
    render(<StepProgress importId={123} onComplete={onComplete} />)
    
    // Wait for API call to resolve
    await waitFor(() => {
      expect(getImport).toHaveBeenCalledWith(123)
    })
    
    // Click the continue button
    fireEvent.click(screen.getByText('Continue to Product Import'))
    
    // Check that onComplete was called
    expect(onComplete).toHaveBeenCalled()
  })
}) 