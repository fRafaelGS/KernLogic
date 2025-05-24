import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { API_ENDPOINTS } from '@/config/config'

// Global attributes cache - called once and shared across all components
export function useGlobalAttributes() {
  return useQuery({
    queryKey: ['globalAttributes'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/api/attributes/')
      
      // Create a lookup map for fast access
      const attrMap = Array.isArray(data)
        ? data.reduce<Record<number, { label: string; code: string; type?: string }>>(
            (acc, a: any) => {
              acc[a.id] = { 
                label: a.label || a.name || '', 
                code: a.code || '',
                type: a.type || a.attribute_type || ''
              }
              return acc
            },
            {}
          )
        : {}
      
      return {
        attributes: data || [],
        attributeMap: attrMap
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - attributes don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })
} 