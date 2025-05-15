import { QueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/services/productService'

/**
 * Invalidates all product-related queries
 * @param queryClient The React Query client
 * @param productId The product ID
 */
export const invalidateProductQueries = async (
  queryClient: QueryClient,
  productId: number | string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT(productId) }),
  ])
}

/**
 * Invalidates product assets queries
 * @param queryClient The React Query client
 * @param productId The product ID
 */
export const invalidateProductAssets = async (
  queryClient: QueryClient,
  productId: number | string
): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_ASSETS(productId) })
}

/**
 * Invalidates both product data and assets
 * @param queryClient The React Query client
 * @param productId The product ID
 */
export const invalidateProductAndAssets = async (
  queryClient: QueryClient,
  productId: number | string
): Promise<void> => {
  await Promise.all([
    invalidateProductQueries(queryClient, productId),
    invalidateProductAssets(queryClient, productId),
  ])
}

/**
 * Invalidates product prices queries
 * @param queryClient The React Query client
 * @param productId The product ID
 */
export const invalidateProductPrices = async (
  queryClient: QueryClient,
  productId: number | string
): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_PRICES(productId) })
} 