import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLocalizationQuality } from '@/hooks/useLocalizationQuality'
import * as localizationService from '@/services/localizationService'
import React from 'react'

// Mock the localization service
jest.mock('@/services/localizationService')

// Mock response data
const mockLocalizationData = {
  overall: {
    total_attributes: 1000,
    translated_attributes: 750,
    translated_pct: 75.0
  },
  locale_stats: [
    {
      locale: 'fr_FR',
      total_attributes: 250,
      translated_attributes: 200,
      translated_pct: 80.0
    },
    {
      locale: 'de_DE',
      total_attributes: 250,
      translated_attributes: 150,
      translated_pct: 60.0
    },
    {
      locale: 'es_ES',
      total_attributes: 250,
      translated_attributes: 225,
      translated_pct: 90.0
    },
    {
      locale: 'it_IT',
      total_attributes: 250,
      translated_attributes: 175,
      translated_pct: 70.0
    }
  ]
}

// Create a wrapper with React Query provider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useLocalizationQuality hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('fetches localization quality data with the correct filters', async () => {
    // Mock the service function
    const getLocalizationQualityMock = jest.spyOn(localizationService, 'getLocalizationQuality')
      .mockResolvedValue(mockLocalizationData)
    
    // Prepare test filters
    const testFilters = {
      locale: 'fr_FR',
      category: 'electronics',
      from: '2023-01-01',
      to: '2023-12-31'
    }
    
    // Render the hook with our filters
    const { result } = renderHook(() => useLocalizationQuality(testFilters), {
      wrapper: createWrapper()
    })
    
    // Initial state should be loading
    expect(result.current.isLoading).toBe(true)
    
    // Wait for the data to be loaded
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    // Verify service was called with the correct filters
    expect(getLocalizationQualityMock).toHaveBeenCalledWith(testFilters)
    
    // Verify data matches our mock
    expect(result.current.data).toEqual(mockLocalizationData)
    expect(result.current.isError).toBe(false)
  })
  
  it('handles errors correctly', async () => {
    // Mock the service function to throw an error
    const mockError = new Error('Failed to fetch localization data')
    jest.spyOn(localizationService, 'getLocalizationQuality')
      .mockRejectedValue(mockError)
    
    // Render the hook
    const { result } = renderHook(() => useLocalizationQuality(), {
      wrapper: createWrapper()
    })
    
    // Wait for the error state
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isError).toBe(true)
    })
    
    // Verify error data
    expect(result.current.error).toEqual(mockError)
    expect(result.current.data).toBeUndefined()
  })
  
  it('returns empty data when API returns nothing', async () => {
    // Mock the service function to return empty data
    jest.spyOn(localizationService, 'getLocalizationQuality')
      .mockResolvedValue({
        overall: {
          total_attributes: 0,
          translated_attributes: 0,
          translated_pct: 0
        },
        locale_stats: []
      })
    
    // Render the hook
    const { result } = renderHook(() => useLocalizationQuality(), {
      wrapper: createWrapper()
    })
    
    // Wait for the data to be loaded
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    // Verify empty data is handled properly
    expect(result.current.data).toEqual({
      overall: {
        total_attributes: 0,
        translated_attributes: 0,
        translated_pct: 0
      },
      locale_stats: []
    })
    expect(result.current.isError).toBe(false)
  })
}) 