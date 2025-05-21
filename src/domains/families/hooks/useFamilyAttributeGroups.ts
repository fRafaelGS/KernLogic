import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { useEffect } from 'react'

export function useFamilyAttributeGroups(familyId?: number, locale?: string, channel?: string) {
  const queryClient = useQueryClient()
  
  // This effect ensures the hook refetches when familyId changes
  useEffect(() => {
    if (familyId) {
      // Refetch whenever the family ID changes
      queryClient.invalidateQueries({ 
        queryKey: ['familyAttributeGroups', familyId, String(locale || 'all'), String(channel || 'all')]
      })
    }
  }, [familyId, queryClient, locale, channel])
  
  return useQuery({
    queryKey: ['familyAttributeGroups', familyId, String(locale || 'all'), String(channel || 'all')],
    queryFn: async () => {
      // Use the attribute-groups endpoint which now supports GET
      try {
        const params: Record<string, string> = {}
        if (locale) {
          params.locale = locale.replace('-', '_')
        }
        if (channel) params.channel = channel
        
        const response = await axiosInstance.get(`/api/families/${familyId}/attribute-groups/`, { params })
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