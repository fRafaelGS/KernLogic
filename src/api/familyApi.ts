import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { isAxiosError } from 'axios'
import { Family, FamilyInput, FamilyOverride } from '../types/family'
import { Attribute } from '../types/attribute'
import { AttributeGroup } from '../types/attributeGroup'
import { API_ENDPOINTS } from '@/config/config'

// Query keys
export const familyKeys = {
  all: ['families'] as const,
  lists: () => [...familyKeys.all, 'list'] as const,
  list: (filters: any) => [...familyKeys.lists(), { filters }] as const,
  details: () => [...familyKeys.all, 'detail'] as const,
  detail: (id: number) => [...familyKeys.details(), id] as const
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
export const getFamilies = async (): Promise<Family[]> => {
  try {
    const { data } = await axiosInstance.get(API_ENDPOINTS.families.list)
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

export const getFamily = async (id: number): Promise<Family> => {
  try {
    const { data } = await axiosInstance.get(API_ENDPOINTS.families.update(id))
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

export const createFamily = async (familyData: Partial<FamilyInput>): Promise<Family> => {
  try {
    const { data } = await axiosInstance.post(API_ENDPOINTS.families.create, familyData)
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

export const updateFamily = async (id: number, familyData: Partial<FamilyInput>): Promise<Family> => {
  try {
    const { data } = await axiosInstance.patch(API_ENDPOINTS.families.update(id), familyData)
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

export const deleteFamily = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(API_ENDPOINTS.families.delete(id))
  } catch (error) {
    return handleApiError(error)
  }
}

export const addAttributeGroupToFamily = async (
  familyId: number, 
  payload: { 
    attribute_group: number
    required: boolean
    order: number
  }
): Promise<any> => {
  try {
    const { data } = await axiosInstance.post(
      `/api/families/${familyId}/attribute-groups/`, 
      payload
    )
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

export const removeAttributeGroupFromFamily = async (
  familyId: number,
  attributeGroupId: number
): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/families/${familyId}/attribute-groups/${attributeGroupId}/`)
  } catch (error) {
    return handleApiError(error)
  }
}

// Override hooks
interface OverrideAttributeGroupParams {
  groupId: number
  removed: boolean
}

export interface FamilyOverridePayload {
  attribute_group: number
  removed: boolean
}

export const overrideAttributeGroup = async (
  productId: number,
  params: OverrideAttributeGroupParams
): Promise<any> => {
  try {
    const { data } = await axiosInstance.post(
      `/api/products/${productId}/override-group/`,
      params
    )
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

export interface AttributeOverridePayload {
  attribute: number
  removed: boolean
}

export const overrideFamilyGroups = async (
  productId: number,
  overrides: FamilyOverridePayload[]
): Promise<any> => {
  try {
    const { data } = await axiosInstance.post(
      `/api/products/${productId}/family-overrides/`,
      overrides
    )
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

export const overrideAttributes = async (
  productId: number,
  overrides: AttributeOverridePayload[]
): Promise<any> => {
  try {
    const { data } = await axiosInstance.post(
      `/api/products/${productId}/attribute-overrides/`,
      overrides
    )
    return data
  } catch (error) {
    return handleApiError(error)
  }
}

// React Query hooks
export const useFamilies = () => {
  return useQuery({
    queryKey: familyKeys.lists(),
    queryFn: getFamilies,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('permission')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export const useFamily = (id: number) => {
  return useQuery({
    queryKey: familyKeys.detail(id),
    queryFn: () => getFamily(id),
    enabled: !!id,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('permission')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export const useCreateFamily = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.lists() })
    },
    onError: (error: Error) => {
      console.error('Failed to create family:', error.message)
      return error
    }
  })
}

export const useUpdateFamily = (id: number) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<FamilyInput>) => updateFamily(id, data),
    onSuccess: (updatedFamily) => {
      queryClient.invalidateQueries({ queryKey: familyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: familyKeys.detail(id) })
      return updatedFamily
    },
    onError: (error: Error) => {
      console.error(`Failed to update family ${id}:`, error.message)
      return error
    }
  })
}

export const useDeleteFamily = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.lists() })
    },
    onError: (error: Error) => {
      console.error('Failed to delete family:', error.message)
      return error
    }
  })
}

export const useAddAttributeGroupToFamily = (familyId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { attribute_group: number, required: boolean, order: number }) =>
      addAttributeGroupToFamily(familyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.detail(familyId) })
    },
    onError: (error: Error) => {
      console.error('Failed to add attribute group:', error.message)
      return error
    }
  })
}

export const useRemoveAttributeGroupFromFamily = (familyId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attributeGroupId: number) =>
      removeAttributeGroupFromFamily(familyId, attributeGroupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.detail(familyId) })
    },
    onError: (error: Error) => {
      console.error('Failed to remove attribute group:', error.message)
      return error
    }
  })
}

export const useOverrideFamilyGroups = (productId: number) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (overrides: FamilyOverridePayload[]) => 
      overrideFamilyGroups(productId, overrides),
    onSuccess: () => {
      // Invalidate both the specific product and the product list
      queryClient.invalidateQueries({ queryKey: ['products', productId] })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => {
      console.error('Failed to override family groups:', error.message)
      return error
    }
  })
}

export const useOverrideAttributeGroup = (productId: number) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: { groupId: number, removed: boolean }) => 
      overrideAttributeGroup(productId, params),
    onSuccess: () => {
      // Invalidate both the specific product and the product list
      queryClient.invalidateQueries({ queryKey: ['products', productId] })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => {
      console.error('Failed to override attribute group:', error.message)
      return error
    }
  })
}

export const useOverrideAttributes = (productId: number) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (overrides: AttributeOverridePayload[]) => 
      overrideAttributes(productId, overrides),
    onSuccess: () => {
      // Invalidate both the specific product and the product list
      queryClient.invalidateQueries({ queryKey: ['products', productId] })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => {
      console.error('Failed to override attributes:', error.message)
      return error
    }
  })
} 