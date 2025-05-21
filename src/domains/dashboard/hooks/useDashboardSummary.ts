import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { DashboardSummary } from '@/services/dashboardService'
import { useAuth } from '@/domains/app/providers/AuthContext'
import { ReportFiltersState } from '@/domains/reports/components/filters/ReportFilters'
import { API_ENDPOINTS } from '@/config/config'

/**
 * Fetches dashboard summary data from the API
 * @param filters Optional filters to apply to the dashboard summary
 * @returns Promise with dashboard summary data
 */
const fetchDashboardSummary = async (filters?: ReportFiltersState): Promise<DashboardSummary> => {
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
  
  const { data } = await axiosInstance.get<DashboardSummary>(API_ENDPOINTS.dashboard + '/summary', { params })
  return data
}

/**
 * Hook for fetching dashboard summary data with React Query
 * @param filters Optional filters to apply to the dashboard summary
 */
export function useDashboardSummary(filters?: ReportFiltersState) {
  const { user } = useAuth()
  
  return useQuery<DashboardSummary, Error>({
    queryKey: ['dashboard', 'summary', user?.organization_id, filters],
    queryFn: () => fetchDashboardSummary(filters),
    staleTime: 60_000, // 1 minute
    retry: 2
  })
} 