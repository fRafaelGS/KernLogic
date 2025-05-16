import { useQuery } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'
import axiosInstance from '@/lib/axiosInstance'

export interface FamilyCompleteness {
  familyName: string
  percentage: number
}

const fetchFamilyCompleteness = async (): Promise<FamilyCompleteness[]> => {
  const { data } = await axiosInstance.get<FamilyCompleteness[]>('/api/dashboard/family-completeness')
  return data
}

export function useFamilyCompleteness() {
  return useQuery<FamilyCompleteness[], Error>({
    queryKey: ['dashboard', 'family-completeness'],
    queryFn: fetchFamilyCompleteness,
    staleTime: 60_000,
    retry: false
  })
} 