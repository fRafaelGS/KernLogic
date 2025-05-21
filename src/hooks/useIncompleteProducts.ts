import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/axiosInstance'
import { IncompleteProduct, dashboardService } from '@/services/dashboardService'
import { useAuth } from '@/domains/app/providers/AuthContext'
import { ReportFiltersState } from '@/features/reports/components/filters/ReportFilters'
import logger from '@/lib/logger'
import { API_ENDPOINTS } from '@/config/config'

/**
 * Utility function to process promises in batches to limit concurrency
 * @param items Items to process
 * @param batchSize Maximum number of parallel promises
 * @param fn Function that returns a promise for each item
 * @returns Array of results in the same order as the input items
 */
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchPromises = batch.map(fn)
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Fetches incomplete products data from the dashboard API
 * and enriches it with family data from the Products API
 * 
 * @param filters Optional filters to apply to the incomplete products query
 * @returns Promise with array of enriched incomplete products
 */
const fetchIncompleteProducts = async (filters?: ReportFiltersState): Promise<IncompleteProduct[]> => {
  try {
    // Step 1: Fetch raw incomplete products
    // Build query parameters from filters
    const params: Record<string, string> = {}
    
    if (filters) {
      if (filters.locale) params.locale = filters.locale
      if (filters.category) params.category = filters.category
      if (filters.channel) params.channel = filters.channel
      if (filters.family) params.family = filters.family
      if (filters.from) params.from_date = new Date(filters.from).toISOString()
      if (filters.to) params.to_date = new Date(filters.to).toISOString()
    }
    
    const { data: rawProducts } = await axiosInstance.get<IncompleteProduct[]>(API_ENDPOINTS.dashboard + '/incomplete-products', { params })

    // Step 2: Extract product IDs
    const productIds = rawProducts.map(p => p.id)
    
    if (productIds.length === 0) {
      return rawProducts // No products to enrich
    }
    
    try {
      // Step 3: Batch-fetch product details with family info using axiosInstance
      logger.info(`Fetching family info for ${productIds.length} products`)
      
      // Fetch products in batches to avoid too many parallel requests
      const MAX_CONCURRENT_REQUESTS = 10
      const productDetails = await processBatch<number, any>(
        productIds,
        MAX_CONCURRENT_REQUESTS,
        id => axiosInstance.get(`/api/products/${id}/`)
          .then(res => res.data)
          .catch(error => {
            logger.error(`Error fetching product ${id}:`, error)
            return null // Return null for failed fetches
          })
      )
      
      // Step 4: Build ID to family name mapping
      const familyMap = new Map<number, string>()
      
      productDetails.forEach(pd => {
        if (pd?.id) {
          familyMap.set(pd.id, pd.family?.name || 'Unknown')
        }
      })
      
      // Step 5: Merge family info into each incomplete product
      const enrichedProducts = rawProducts.map(p => ({
        ...p,
        family: { name: familyMap.get(p.id) || 'Unknown' }
      }))
      
      logger.info(`Successfully enriched ${enrichedProducts.length} products with family data`)
      return enrichedProducts
      
    } catch (error) {
      // If fetching product details fails, return the raw products with 'Unknown' family
      logger.error('Error fetching product details for family enrichment:', error)
      return rawProducts.map(p => ({
        ...p,
        family: { name: 'Unknown' }
      }))
    }
  } catch (error) {
    logger.error('Error fetching incomplete products:', error)
    throw error
  }
}

/**
 * Hook for fetching incomplete products data with React Query,
 * enriched with family information from the Products API
 * 
 * @param filters Optional filters to apply to the data
 */
export function useIncompleteProducts(filters?: ReportFiltersState) {
  const { user } = useAuth()
  
  return useQuery<IncompleteProduct[], Error>({
    queryKey: ['dashboard', 'incomplete-products', 'enriched', user?.organization_id, filters],
    queryFn: () => fetchIncompleteProducts(filters),
    staleTime: 60_000, // 1 minute
    retry: 2
  })
} 