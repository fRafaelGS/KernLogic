import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      return productService.updateProduct(id, data)
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['products'] })
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['product', data.id] })
      }
    }
  })
} 