import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'

export function useFamilyAttributeGroups(familyId?: number) {
  return useQuery({
    queryKey: ['familyAttributeGroups', familyId],
    queryFn: async () => {
      // Use the attribute-groups endpoint which now supports GET
      try {
        const response = await axiosInstance.get(`/api/families/${familyId}/attribute-groups/`)
        // The API now returns attribute groups directly
        return response.data || []
      } catch (error) {
        console.error('Failed to fetch family attribute groups:', error)
        return []
      }
    },
    enabled: !!familyId,
    staleTime: 5 * 60_000,
  })
} 