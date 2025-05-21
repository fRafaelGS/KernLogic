import { useQuery } from '@tanstack/react-query'
import { toast } from '@/domains/core/components/ui/use-toast'
import axiosInstance from '@/domains/core/lib/axiosInstance'
import { ReportFiltersState } from '@/domains/reports/components/filters/ReportFilters'
import { useAuth } from '@/domains/app/providers/AuthContext'
import { API_ENDPOINTS } from '@/config/config'

export interface FamilyCompleteness {
  familyName: string
  percentage: number
}

/**
 * Fetches family completeness data from the API
 * @param filters Optional filters to apply to the query
 * @returns Promise with family completeness data
 */
const fetchFamilyCompleteness = async (filters?: ReportFiltersState): Promise<FamilyCompleteness[]> => {
  // Build query parameters from filters
  const params: Record<string, string> = {}
  
  if (filters) {
    if (filters.locale) params.locale = filters.locale
    if (filters.category) params.category = filters.category
    if (filters.channel) params.channel = filters.channel
    if (filters.family) params.family = filters.family
    if (filters.from) params.from_date = new Date(filters.from).toISOString()
    if (filters.to) params.to_date = new Date(filters.to).toISOString()
  }
  
  const { data } = await axiosInstance.get<FamilyCompleteness[]>(API_ENDPOINTS.dashboard + '/family-completeness', { params })
  return data
}

/**
 * Hook for fetching family completeness data with React Query
 * @param filters Optional filters to apply to the data
 */
export function useFamilyCompleteness(filters?: ReportFiltersState) {
  const { user } = useAuth()
  
  return useQuery<FamilyCompleteness[], Error>({
    queryKey: ['dashboard', 'family-completeness', user?.organization_id, filters],
    queryFn: () => fetchFamilyCompleteness(filters),
    staleTime: 60_000,
    retry: false
  })
} 