import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { ReportFiltersState } from '@/features/reports/components/filters/ReportFilters'
import { qkLocalizationCoverage } from '@/lib/queryKeys'
import { getLocalizationCoverage, LocalizationCoverageData } from '@/services/localizationService'
import logger from '@/lib/logger'

/**
 * Response interface from the useLocalizationCoverage hook
 */
export interface UseLocalizationCoverageResult {
  data: LocalizationCoverageData | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<UseQueryResult>
}

/**
 * Hook for fetching localization coverage data with React Query
 * 
 * @param filters - Filter criteria for the localization data
 * @returns The query result with localization coverage data
 */
export function useLocalizationCoverage(filters: ReportFiltersState = {}): UseLocalizationCoverageResult {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qkLocalizationCoverage(filters),
    queryFn: async () => {
      try {
        return await getLocalizationCoverage(filters)
      } catch (error) {
        logger.error('Error fetching localization coverage data in hook:', error)
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

export default useLocalizationCoverage 