import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { isAxiosError } from 'axios'

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

// Error handling helper
const handleApiError = (error: unknown) => {
  if (isAxiosError(error)) {
    const axiosError = error
    if (axiosError.response?.status === 403) {
      throw new Error('You do not have permission to perform this action')
    }
    if (axiosError.response?.data) {
      if (axiosError.response.data.detail) {
        throw new Error(axiosError.response.data.detail)
      }
      throw new Error(JSON.stringify(axiosError.response.data))
    }
  }
  throw error
}

// API functions
export const getAttributeGroups = async (): Promise<AttributeGroup[]> => {
  try {
    const { data } = await axiosInstance.get('/api/attribute-groups/')
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

export const getAttributeGroup = async (id: number): Promise<AttributeGroup> => {
  try {
    const { data } = await axiosInstance.get(`/api/attribute-groups/${id}/`)
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

// React Query hooks
export const useAttributeGroups = () => {
  return useQuery({
    queryKey: attributeGroupKeys.lists(),
    queryFn: getAttributeGroups,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('permission')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export const useAttributeGroup = (id: number) => {
  return useQuery({
    queryKey: attributeGroupKeys.detail(id),
    queryFn: () => getAttributeGroup(id),
    enabled: !!id,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('permission')) {
        return false
      }
      return failureCount < 3
    }
  })
} 