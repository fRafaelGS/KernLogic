import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, ProductAsset, QUERY_KEYS } from '@/domains/products/services/productService';
import { invalidateProductAndAssets } from '@/domains/core/utils/query/queryInvalidation';
import { toast } from 'sonner';

/**
 * Hook for fetching and managing product assets
 */
export function useProductAssets(productId: number | string | undefined) {
  const queryClient = useQueryClient();
  
  // Convert productId to number if it's a string
  const numericId = productId ? (typeof productId === 'string' ? parseInt(productId, 10) : productId) : 0;
  
  // Don't run the query if productId is undefined or 0
  const enabled = !!productId && numericId > 0;

  // Fetch assets query
  const {
    data: assets = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.PRODUCT_ASSETS(numericId),
    queryFn: () => productService.getProductAssets(numericId),
    enabled
  });

  // Upload asset mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      onProgress
    }: {
      file: File;
      onProgress?: (progress: number) => void;
    }) => {
      return productService.uploadAsset(numericId, file, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
        if (onProgress) onProgress(progress);
      });
    },
    onSuccess: (newAsset) => {
      // Optimistically update the query cache
      queryClient.setQueryData(
        QUERY_KEYS.PRODUCT_ASSETS(numericId),
        (oldData: ProductAsset[] = []) => [newAsset, ...oldData]
      );
      
      // Also invalidate the product query to update primary image if needed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT(numericId) });
      
      toast.success('Asset uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading asset:', error);
      toast.error('Failed to upload asset. Please try again.');
    }
  });

  // Set primary asset mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (assetId: number) => {
      return productService.setAssetPrimary(numericId, assetId);
    },
    onMutate: async (assetId: number) => {
      // Optimistically update the assets to show the new primary
      const previousAssets = queryClient.getQueryData<ProductAsset[]>(
        QUERY_KEYS.PRODUCT_ASSETS(numericId)
      ) || [];
      
      // Update the assets in the cache
      queryClient.setQueryData(
        QUERY_KEYS.PRODUCT_ASSETS(numericId),
        (oldAssets: ProductAsset[] = []) => {
          return oldAssets.map(asset => ({
            ...asset,
            is_primary: asset.id === assetId
          }));
        }
      );
      
      return { previousAssets };
    },
    onError: (error, assetId, context) => {
      // Rollback to previous assets on error
      if (context?.previousAssets) {
        queryClient.setQueryData(
          QUERY_KEYS.PRODUCT_ASSETS(numericId),
          context.previousAssets
        );
      }
      toast.error('Failed to set primary asset. Please try again.');
    },
    onSuccess: () => {
      // Invalidate product query to update primary image
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT(numericId) });
      toast.success('Primary asset updated');
    }
  });

  // Delete asset mutation
  const deleteMutation = useMutation({
    mutationFn: async (assetId: number) => {
      return productService.deleteAsset(numericId, assetId);
    },
    onMutate: async (assetId: number) => {
      // Optimistically remove the asset from the list
      const previousAssets = queryClient.getQueryData<ProductAsset[]>(
        QUERY_KEYS.PRODUCT_ASSETS(numericId)
      ) || [];
      
      queryClient.setQueryData(
        QUERY_KEYS.PRODUCT_ASSETS(numericId),
        (oldAssets: ProductAsset[] = []) => {
          return oldAssets.filter(asset => asset.id !== assetId);
        }
      );
      
      return { previousAssets };
    },
    onError: (error, assetId, context) => {
      // Rollback to previous assets on error
      if (context?.previousAssets) {
        queryClient.setQueryData(
          QUERY_KEYS.PRODUCT_ASSETS(numericId),
          context.previousAssets
        );
      }
      toast.error('Failed to delete asset. Please try again.');
    },
    onSuccess: () => {
      // Invalidate product query to update primary image if needed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT(numericId) });
      toast.success('Asset deleted successfully');
    }
  });

  // Get primary asset helper
  const getPrimaryAsset = (): ProductAsset | undefined => {
    return assets.find(asset => asset.is_primary);
  };

  return {
    assets,
    isLoading,
    isError,
    error,
    refetch,
    uploadAsset: uploadMutation.mutate,
    uploadAssetAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    setPrimaryAsset: setPrimaryMutation.mutate,
    setPrimaryAssetAsync: setPrimaryMutation.mutateAsync,
    isSettingPrimary: setPrimaryMutation.isPending,
    deleteAsset: deleteMutation.mutate,
    deleteAssetAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    getPrimaryAsset
  };
} 