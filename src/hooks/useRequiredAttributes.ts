import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { toast } from '@/components/ui/use-toast'
import { API_ENDPOINTS } from '@/config/config'

export interface RequiredAttribute {
  name: string
  missingCount: number
  completePercent: number  // 0-100
  lastUpdated: string      // ISO date
  priority: 'High' | 'Medium' | 'Low'
  impactScore: number      // 0-10
}

const fetchRequiredAttributes = async (): Promise<RequiredAttribute[]> => {
  const { data } = await axiosInstance.get<RequiredAttribute[]>(API_ENDPOINTS.dashboard + '/required-attributes')
  return data
}

export function useRequiredAttributes() {
  return useQuery<RequiredAttribute[], Error>({
    queryKey: ['dashboard', 'required-attributes'],
    queryFn: fetchRequiredAttributes,
    staleTime: 60_000,
    retry: 1
  })
}

export const startAutoEnrich = async (): Promise<{ message: string }> => {
  const { data } = await axiosInstance.post<{ message: string }>(API_ENDPOINTS.dashboard + '/auto-enrich')
  return data
}

export const startAttributeEnrich = async (attributeName: string): Promise<{ message: string }> => {
  const { data } = await axiosInstance.post<{ message: string }>(`/api/dashboard/enrich/${attributeName}`)
  return data
} 