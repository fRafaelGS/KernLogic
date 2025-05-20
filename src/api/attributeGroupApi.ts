import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { isAxiosError } from 'axios'
import { API_ENDPOINTS } from '@/config/config'

// Define types
export interface AttributeGroup {
  id: number
  name: string
  description?: string
  organization: number
  created_by: number
  created_at: string
  updated_at: string
  order?: number
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
    const { data } = await axiosInstance.get(API_ENDPOINTS.imports.attributeGroups)
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

export const createAttributeGroup = async (data: {
  name: string
  order?: number
}) => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.imports.attributeGroups, {
      name: data.name,
      ...(data.order !== undefined && { order: data.order })
    })
    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}

export const updateAttributeGroup = async (groupId: number, data: { 
  name?: string
  order?: number
}) => {
  try {
    const response = await axiosInstance.patch(`/api/attribute-groups/${groupId}/`, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.order !== undefined && { order: data.order })
    })
    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}

export const deleteAttributeGroup = async (groupId: number) => {
  try {
    const response = await axiosInstance.delete(`/api/attribute-groups/${groupId}/`)
    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}

export const reorderAttributeGroupItems = async (groupId: number, itemIds: number[]) => {
  try {
    const response = await axiosInstance.post(`/api/attribute-groups/${groupId}/reorder_items/`, {
      item_ids: itemIds
    })
    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}

export const addAttributeToGroup = async (groupId: number, attributeId: number) => {
  try {
    const response = await axiosInstance.post(`/api/attribute-groups/${groupId}/add-item/`, {
      attribute: attributeId
    })
    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}

export const removeAttributeFromGroup = async (groupId: number, itemId: number) => {
  try {
    const response = await axiosInstance.delete(`/api/attribute-groups/${groupId}/items/${itemId}/`)
    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}

export const reorderAttributeGroups = async (groupIds: number[]) => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.imports.attributeGroups + 'reorder/', {
      group_ids: groupIds
    })
    return response.data
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

export const useCreateAttributeGroup = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createAttributeGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.lists() })
    },
    onError: (error: Error) => {
      console.error('Failed to create attribute group:', error.message)
      return error
    }
  })
}

export const useUpdateAttributeGroup = (id?: number) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { name?: string, order?: number }) => {
      if (!id) throw new Error('Attribute group ID is required')
      return updateAttributeGroup(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.lists() })
      if (id) {
        queryClient.invalidateQueries({ queryKey: attributeGroupKeys.detail(id) })
      }
    },
    onError: (error: Error) => {
      console.error('Failed to update attribute group:', error.message)
      return error
    }
  })
}

export const useDeleteAttributeGroup = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteAttributeGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.lists() })
    },
    onError: (error: Error) => {
      console.error('Failed to delete attribute group:', error.message)
      return error
    }
  })
}

export const useReorderAttributeGroupItems = (groupId: number) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (itemIds: number[]) => reorderAttributeGroupItems(groupId, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.lists() })
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.detail(groupId) })
    },
    onError: (error: Error) => {
      console.error('Failed to reorder attribute group items:', error.message)
      return error
    }
  })
}

export const useAddAttributeToGroup = (groupId: number) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (attributeId: number) => addAttributeToGroup(groupId, attributeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.lists() })
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.detail(groupId) })
    },
    onError: (error: Error) => {
      console.error('Failed to add attribute to group:', error.message)
      return error
    }
  })
}

export const useRemoveAttributeFromGroup = (groupId: number) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (itemId: number) => removeAttributeFromGroup(groupId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.lists() })
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.detail(groupId) })
    },
    onError: (error: Error) => {
      console.error('Failed to remove attribute from group:', error.message)
      return error
    }
  })
}

export const useReorderAttributeGroups = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: reorderAttributeGroups,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeGroupKeys.lists() })
    },
    onError: (error: Error) => {
      console.error('Failed to reorder attribute groups:', error.message)
      return error
    }
  })
} 