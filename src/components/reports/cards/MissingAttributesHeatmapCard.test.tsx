import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MissingAttributesHeatmapCard from './MissingAttributesHeatmapCard'
import * as hooks from '@/hooks'
import logger from '@/lib/logger'

// Mock the logger
jest.mock('@/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}))

// Mock the hook
jest.mock('@/hooks', () => ({
  useMissingAttributesHeatmap: jest.fn()
}))

describe('MissingAttributesHeatmapCard', () => {
  let queryClient: QueryClient
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    })
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  const mockHeatmapData = [
    { 
      attribute_group: 'Basic Information', 
      locale: 'fr_FR', 
      translated_pct: 85, 
      total: 100, 
      translated: 85 
    },
    { 
      attribute_group: 'Basic Information', 
      locale: 'de_DE', 
      translated_pct: 70, 
      total: 100, 
      translated: 70 
    },
    { 
      attribute_group: 'Technical Specs', 
      locale: 'fr_FR', 
      translated_pct: 40, 
      total: 50, 
      translated: 20 
    },
    { 
      attribute_group: 'Technical Specs', 
      locale: 'de_DE', 
      translated_pct: 30, 
      total: 50, 
      translated: 15 
    }
  ]
  
  test('renders loading state when isLoading is true', () => {
    jest.spyOn(hooks, 'useMissingAttributesHeatmap').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn().mockResolvedValue({})
    })
    
    const { getAllByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <MissingAttributesHeatmapCard filters={{}} />
      </QueryClientProvider>
    )
    
    // Should show skeletons in loading state
    expect(getAllByTestId('skeleton')).toHaveLength(15)
  })
  
  test('renders error state when isError is true', () => {
    const errorMessage = 'Failed to fetch data'
    jest.spyOn(hooks, 'useMissingAttributesHeatmap').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error(errorMessage),
      refetch: jest.fn().mockResolvedValue({})
    })
    
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <MissingAttributesHeatmapCard filters={{}} />
      </QueryClientProvider>
    )
    
    // Should show error alert
    expect(getByText('Error loading heatmap data')).toBeInTheDocument()
    expect(getByText(errorMessage)).toBeInTheDocument()
    expect(getByText('Retry')).toBeInTheDocument()
  })
  
  test('renders heatmap grid when data is available', async () => {
    jest.spyOn(hooks, 'useMissingAttributesHeatmap').mockReturnValue({
      data: mockHeatmapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn().mockResolvedValue({})
    })
    
    const { getByText, getAllByText } = render(
      <QueryClientProvider client={queryClient}>
        <MissingAttributesHeatmapCard filters={{}} />
      </QueryClientProvider>
    )
    
    // Should show the title
    expect(getByText('Missing Attributes by Group and Locale')).toBeInTheDocument()
    
    // Should show attribute groups
    expect(getByText('Basic Information')).toBeInTheDocument()
    expect(getByText('Technical Specs')).toBeInTheDocument()
    
    // Should show locale names (French and German)
    const frenchElements = getAllByText('French')
    const germanElements = getAllByText('German')
    expect(frenchElements.length).toBeGreaterThan(0)
    expect(germanElements.length).toBeGreaterThan(0)
    
    // Should show percentage values
    expect(getByText('85%')).toBeInTheDocument()
    expect(getByText('70%')).toBeInTheDocument()
    expect(getByText('40%')).toBeInTheDocument()
    expect(getByText('30%')).toBeInTheDocument()
  })
  
  test('renders empty state when no data is available', () => {
    jest.spyOn(hooks, 'useMissingAttributesHeatmap').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn().mockResolvedValue({})
    })
    
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <MissingAttributesHeatmapCard filters={{}} />
      </QueryClientProvider>
    )
    
    // Should show empty state message
    expect(getByText('No heatmap data available. Try adjusting your filters.')).toBeInTheDocument()
  })
  
  test('handles non-array data gracefully', () => {
    // Mock returning an object instead of an array
    jest.spyOn(hooks, 'useMissingAttributesHeatmap').mockReturnValue({
      // @ts-ignore - deliberately testing wrong type
      data: { some: 'invalid data' }, 
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn().mockResolvedValue({})
    })
    
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <MissingAttributesHeatmapCard filters={{}} />
      </QueryClientProvider>
    )
    
    // Should log an error
    expect(logger.error).toHaveBeenCalled()
    
    // Should show empty state message
    expect(getByText('No heatmap data available. Try adjusting your filters.')).toBeInTheDocument()
  })
}) 