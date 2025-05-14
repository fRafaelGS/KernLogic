import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

// Define types
export interface AttributeGroup {
  id: number
  name: string
  description?: string
  organization: number
  created_by: number
  created_at: string
  updated_at: string
}

// Query keys
export const attributeGroupKeys = {
  all: ['attributeGroups'] as const,
  lists: () => [...attributeGroupKeys.all, 'list'] as const,
  list: (filters: any) => [...attributeGroupKeys.lists(), { filters }] as const,
  details: () => [...attributeGroupKeys.all, 'detail'] as const,
  detail: (id: number) => [...attributeGroupKeys.details(), id] as const
}

// API functions
export const getAttributeGroups = async (): Promise<AttributeGroup[]> => {
  const { data } = await axios.get('/api/attribute-groups/')
  return data
}

export const getAttributeGroup = async (id: number): Promise<AttributeGroup> => {
  const { data } = await axios.get(`/api/attribute-groups/${id}/`)
  return data
}

// React Query hooks
export const useAttributeGroups = () => {
  return useQuery({
    queryKey: attributeGroupKeys.lists(),
    queryFn: getAttributeGroups,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

export const useAttributeGroup = (id: number) => {
  return useQuery({
    queryKey: attributeGroupKeys.detail(id),
    queryFn: () => getAttributeGroup(id),
    enabled: !!id
  })
} 