import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'

export function useFamilyAttributeGroups(familyId?: number) {
  return useQuery({
    queryKey: ['familyAttributeGroups', familyId],
    queryFn: async () => {
      // Since the attribute-groups endpoint only supports POST, not GET,
      // we need to use the main family endpoint to get family data
      // and then extract the attribute groups from there
      const response = await axiosInstance.get(`/api/families/${familyId}/`)
      // Return the attribute_groups property from the family data or an empty array
      return response.data.attribute_groups || []
    },
    enabled: !!familyId,
    staleTime: 5 * 60_000,
  })
} 