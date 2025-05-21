import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { ReportFiltersState } from '@/domains/reports/components/filters/ReportFilters'
import { qkMissingAttributesHeatmap } from '@/domains/core/lib/query/queryKeys'
import { getMissingAttributesHeatmap, HeatmapData } from '@/services/localizationService'
import logger from '@/domains/core/lib/logger'

/**
 * Response interface from the useMissingAttributesHeatmap hook
 */
export interface UseMissingAttributesHeatmapResult {
  data: HeatmapData[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<UseQueryResult>
}

/**
 * Hook for fetching missing attributes heatmap data with React Query
 * 
 * @param filters - Filter criteria for the heatmap data
 * @returns The query result with heatmap data
 */
export function useMissingAttributesHeatmap(filters: ReportFiltersState = {}): UseMissingAttributesHeatmapResult {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qkMissingAttributesHeatmap(filters),
    queryFn: async () => {
      try {
        return await getMissingAttributesHeatmap(filters)
      } catch (error) {
        logger.error('Error fetching missing attributes heatmap data in hook:', error)
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

export default useMissingAttributesHeatmap 