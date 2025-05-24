import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService, Product } from '@/services/productService'
import { useFetchProducts, FilterParams } from './useFetchProducts'
import { useGlobalAttributes } from './useGlobalAttributes'

/**
 * Enhanced hook for optimized product table data with on-demand expansion
 */
export function useOptimizedProducts(filters: FilterParams = {}) {
  // Always enable fields optimization for table view
  const optimizedFilters = {
    ...filters,
    useFieldsOptimization: true
  }
  
  // Use the existing hook with optimization enabled
  const queryResult = useFetchProducts(optimizedFilters)
  
  return {
    ...queryResult,
    // Helper to check if optimization is active
    isOptimized: true
  }
}

/**
 * Hook for on-demand asset loading when expanding a table row
 */
export function useProductAssets(productId: number | undefined, enabled: boolean = false) {
  return useQuery({
    queryKey: ['product-assets', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required')
      return productService.getProductAssets(productId)
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for on-demand attribute groups loading when expanding a table row
 */
export function useProductAttributeGroups(
  productId: number | undefined, 
  enabled: boolean = false,
  options: { locale?: string; channel?: string } = {}
) {
  // Get global attributes cache
  const { data: globalAttrData } = useGlobalAttributes()

  return useQuery({
    queryKey: ['product-attribute-groups', productId, options],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required')
      
      // Pass the attribute map from global cache to avoid redundant API call
      return productService.getProductAttributeGroups(
        productId, 
        options.locale, 
        options.channel,
        globalAttrData?.attributeMap // Pass the cached attribute map
      )
    },
    enabled: enabled && !!productId && !!globalAttrData, // Also wait for global attributes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for table row expansion with on-demand data loading
 */
export function useProductExpansion(productId: number | undefined) {
  const queryClient = useQueryClient()
  
  const assetsQuery = useProductAssets(productId, false)
  const attributeGroupsQuery = useProductAttributeGroups(productId, false)
  
  const expandRow = useMutation({
    mutationFn: async (options: { 
      includeAssets?: boolean 
      includeAttributeGroups?: boolean
      locale?: string
      channel?: string
    }) => {
      const promises: Promise<any>[] = []
      
      if (options.includeAssets) {
        promises.push(
          queryClient.fetchQuery({
            queryKey: ['product-assets', productId],
            queryFn: () => productService.getProductAssets(productId!),
            staleTime: 5 * 60 * 1000
          })
        )
      }
      
      if (options.includeAttributeGroups) {
        promises.push(
          queryClient.fetchQuery({
            queryKey: ['product-attribute-groups', productId, { 
              locale: options.locale, 
              channel: options.channel 
            }],
            queryFn: () => productService.getProductAttributeGroupsOnDemand(productId!, {
              locale: options.locale,
              channel: options.channel
            }),
            staleTime: 5 * 60 * 1000
          })
        )
      }
      
      return Promise.all(promises)
    },
    onSuccess: () => {
      // Invalidate and refetch the specific queries
      queryClient.invalidateQueries({ queryKey: ['product-assets', productId] })
      queryClient.invalidateQueries({ queryKey: ['product-attribute-groups', productId] })
    }
  })
  
  return {
    expandRow: expandRow.mutate,
    isExpanding: expandRow.isPending,
    expansionError: expandRow.error,
    assetsData: assetsQuery.data,
    attributeGroupsData: attributeGroupsQuery.data,
    isLoadingAssets: assetsQuery.isLoading,
    isLoadingAttributeGroups: attributeGroupsQuery.isLoading
  }
}

/**
 * Export the allowed fields for consistency
 */
export const OPTIMIZED_PRODUCT_FIELDS = [
  "id", "name", "sku",
  "category_id", "category_name",
  "brand", "tags", "barcode",
  "is_active", "created_at", "updated_at",
  "family_id", "family_name",
  "price", "created_by", "is_archived",
  "primary_image_thumb"
] as const

export type OptimizedProductField = typeof OPTIMIZED_PRODUCT_FIELDS[number] 