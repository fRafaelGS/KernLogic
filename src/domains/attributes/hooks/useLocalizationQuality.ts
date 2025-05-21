import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { ReportFiltersState } from '@/domains/reports/components/filters/ReportFilters'
import { qkLocalizationQuality } from '@/domains/core/lib/query/queryKeys'
import { getLocalizationQuality, LocalizationCoverageResponse } from '@/domains/organization/services/localizationService'
import logger from '@/domains/core/lib/logger'

/**
 * Response interface from the useLocalizationQuality hook
 */
export interface UseLocalizationQualityResult {
  data: LocalizationCoverageResponse | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<UseQueryResult>
}

/**
 * Hook for fetching localization quality data with React Query
 * 
 * @param filters - Filter criteria for the localization quality data
 * @returns The query result with localization quality data
 */
export function useLocalizationQuality(filters: ReportFiltersState = {}): UseLocalizationQualityResult {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qkLocalizationQuality(filters),
    queryFn: async () => {
      try {
        return await getLocalizationQuality(filters)
      } catch (error) {
        logger.error('Error fetching localization quality data in hook:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: attempt => Math.min(attempt * 1000, 10000), // Exponential backoff capped at 10s
    gcTime: 15 * 60 * 1000, // 15 minutes
  })

  return {
    data,
    isLoading,
    isError,
    error,
    refetch
  }
}

export default useLocalizationQuality 