import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/domains/products/services/productService'
import { toast } from 'sonner'

interface SetPrimaryAssetOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Hook for setting an asset as primary with proper cache invalidation
 * Includes error handling for backend issues with asset.url
 */
export function useSetPrimaryAsset(productId: number, options?: SetPrimaryAssetOptions) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (assetId: number) => {
      console.log(`[useSetPrimaryAsset] Setting asset ${assetId} as primary for product ${productId}`)
      
      try {
        // First attempt the standard endpoint
        return await productService.setAssetPrimary(productId, assetId)
      } catch (error: any) {
        // Check if it's the specific "asset.url" error from backend
        const errorMsg = error?.response?.data?.detail || ''
        if (errorMsg.includes("'ProductAsset' object has no attribute 'url'")) {
          console.warn(`[useSetPrimaryAsset] Backend error with asset.url attribute, applying fallback solution`)
          
          // Fallback approach:
          // 1. Mark the asset as primary using PATCH
          await productService.updateAsset(productId, assetId, { is_primary: true })
          
          // 2. Get the updated asset info
          const assets = await productService.getProductAssets(productId)
          const primaryAsset = assets.find(a => a.id === assetId)
          
          if (!primaryAsset) {
            throw new Error('Could not find the asset after marking it as primary')
          }
          
          // No need to update legacy image properties since they've been removed
          // Just ensure the asset is marked as primary
          await productService.updateProduct(productId, {})
          
          return true
        }
        
        // For other errors, just rethrow
        throw error
      }
    },
    
    onSuccess: () => {
      console.log(`[useSetPrimaryAsset] Successfully set primary asset for product ${productId}`)
      
      // Invalidate all related queries to ensure UI is updated everywhere
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['productAssets', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] }) // Also refresh the products list view
      
      // Force refetch the product data to ensure the UI updates
      queryClient.refetchQueries({ queryKey: ['product', productId], exact: true })
        .catch(err => console.error(`[useSetPrimaryAsset] Error refetching product:`, err))
      
      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess()
      }
      
      toast.success('Primary image updated')
    },
    
    onError: (error) => {
      console.error(`[useSetPrimaryAsset] Error setting primary asset for product ${productId}:`, error)
      
      // Call custom error handler if provided
      if (options?.onError) {
        options.onError(error as Error)
      }
      
      toast.error('Failed to update primary image')
    }
  })
} 