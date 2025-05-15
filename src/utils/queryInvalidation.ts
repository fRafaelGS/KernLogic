import { QueryClient } from '@tanstack/react-query'

/**
 * Invalidates queries related to a product after it's been updated
 * 
 * This is particularly important for components like ProductAttributesPanel
 * that depend on the product's family ID which might have changed.
 */
export function invalidateProductQueries(
  queryClient: QueryClient, 
  productId: number | string
) {
  // Convert productId to number if it's a string
  const numericId = typeof productId === 'string' ? parseInt(productId, 10) : productId
  
  // Invalidate product-specific queries
  queryClient.invalidateQueries({ queryKey: ['product', numericId] })
  
  // Invalidate attribute-related queries
  queryClient.invalidateQueries({ queryKey: ['attributes'] })
  queryClient.invalidateQueries({ queryKey: ['attribute-groups'] })
  
  // Invalidate family-related queries if the product's family changed
  queryClient.invalidateQueries({ queryKey: ['familyAttributeGroups'] })
  
  // Invalidate product list
  queryClient.invalidateQueries({ queryKey: ['products'] })
} 