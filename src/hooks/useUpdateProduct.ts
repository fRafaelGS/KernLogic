import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { invalidateProductQueries } from '@/utils/queryInvalidation'

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      return productService.updateProduct(id, data)
    },
    onSuccess: (data) => {
      // Use our utility function to invalidate all relevant queries
      if (data?.id) {
        invalidateProductQueries(queryClient, data.id)
      }
    }
  })
} 