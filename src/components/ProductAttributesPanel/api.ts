import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { toast } from 'sonner'
import type { Attribute, AttributesResponse, UpdateAttributePayload, AttributeGroup } from './types'
import { API_ENDPOINTS } from '@/config/config'

const ATTRIBUTES_QUERY_KEY = (productId: string, locale?: string, channel?: string) => [
  'productAttributes',
  productId,
  locale ?? 'all',
  channel ?? 'all'
]

export const GROUPS_QUERY_KEY = (productId: string) => ['attributeGroups', productId]

export function useAttributes(productId: string, locale?: string, channel?: string) {
  return useQuery<AttributesResponse, Error>({
    queryKey: ATTRIBUTES_QUERY_KEY(productId, locale, channel),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (locale) {
        params.locale = locale.replace('-', '_')
      }
      if (channel) params.channel = channel
      const { data } = await axiosInstance.get(`/api/products/${productId}/attributes/`, { params })
      const normalized: AttributesResponse = Array.isArray(data)
        ? { attributes: data }
        : { attributes: data?.attributes ?? [] }
      return normalized
    },
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
    retry: 1
  })
}

export function useUpdateAttribute(productId: string, locale?: string, channel?: string) {
  const queryClient = useQueryClient()
  return useMutation<Attribute, Error, { id: string; payload: UpdateAttributePayload }, { previous?: AttributesResponse }>({
    mutationFn: async ({ id, payload }) => {
      const params: Record<string,string> = {}
      if (locale) params.locale = locale
      if (channel) params.channel = channel
      const { data } = await axiosInstance.patch<Attribute>(`/api/products/${productId}/attributes/${id}/`, payload, { params })
      return data
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ATTRIBUTES_QUERY_KEY(productId, locale, channel) })

      const previous = queryClient.getQueryData<AttributesResponse>(ATTRIBUTES_QUERY_KEY(productId, locale, channel))

      if (previous) {
        const updated: AttributesResponse = {
          attributes: previous.attributes.map(attr =>
            attr.id === id ? { ...attr, value: payload.value } : attr
          )
        }
        queryClient.setQueryData(ATTRIBUTES_QUERY_KEY(productId, locale, channel), updated)
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      toast.error('Failed to save attribute')
      if (context?.previous) {
        queryClient.setQueryData(ATTRIBUTES_QUERY_KEY(productId, locale, channel), context.previous)
      }
    },
    onSuccess: () => {
      toast.success('Attribute updated')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ATTRIBUTES_QUERY_KEY(productId, locale, channel) })
    }
  })
}

export function useDeleteAttribute(productId: string, locale?: string, channel?: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const params: Record<string,string> = {}
      if (locale) params.locale = locale
      if (channel) params.channel = channel
      await axiosInstance.delete(`/api/products/${productId}/attributes/${id}/`, { params })
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
    onError: () => toast.error('Delete failed')
  })
}

export function useAttributeGroups(productId: string, locale?: string, channel?: string, enabled?: boolean) {
  return useQuery<AttributeGroup[], Error>({
    queryKey: [...GROUPS_QUERY_KEY(productId), String(locale || 'all'), String(channel || 'all')],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (locale) {
        params.locale = locale.replace('-', '_')
      }
      if (channel) params.channel = channel
      const { data } = await axiosInstance.get(`/api/products/${productId}/attribute-groups/`, { params })
      return Array.isArray(data) ? data : []
    },
    enabled: enabled !== false && Boolean(productId),
    staleTime: 5 * 60 * 1000
  })
}

export function useCreateAttribute(productId: string, locale?: string, channel?: string) {
  const queryClient = useQueryClient()
  return useMutation<Attribute, Error, { attributeId: number; value: string; locale?: string; channel?: string }>({
    mutationFn: async ({ attributeId, value, locale: attributeLocale, channel: attributeChannel }) => {
      const params: Record<string,string> = {}
      if (attributeLocale || locale) {
        params.locale = attributeLocale || locale || ''
      }
      if (attributeChannel || channel) {
        params.channel = attributeChannel || channel || ''
      }
      const payload = {
        attribute: attributeId,
        product: Number(productId),
        value,
        locale: attributeLocale || locale,
        channel: attributeChannel || channel
      }
      const { data } = await axiosInstance.post<Attribute>(`/api/products/${productId}/attributes/`, payload, { params })
      return data
    },
    onSuccess: () => {
      toast.success('Attribute added')
      queryClient.invalidateQueries({ queryKey: ATTRIBUTES_QUERY_KEY(productId, locale, channel) })
    },
    onError: () => toast.error('Failed to add attribute')
  })
}

export function useAllAttributes(enabled: boolean = false) {
  return useQuery<Attribute[], Error>({
    queryKey: ['allAttributes'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(API_ENDPOINTS.imports.attributes || '')
      return data
    },
    enabled: enabled, // Only load when explicitly enabled
    staleTime: 10 * 60 * 1000,
  })
}

export function useAllAttributeGroups() {
  return useQuery<AttributeGroup[], Error>({
    queryKey: ['allAttributeGroups'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(API_ENDPOINTS.imports.attributeGroups || '')
      return Array.isArray(data) ? data : []
    },
    staleTime: 10 * 60 * 1000,
    // No enabled condition - always load regardless of productId
  })
} 