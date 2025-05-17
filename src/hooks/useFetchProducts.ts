import { useInfiniteQuery } from '@tanstack/react-query'
import { productService, PaginatedResponse, Product } from '@/services/productService'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface ProductsState {
  products: Product[]
  filteredData: Product[]
  totalCount: number
  loading: boolean
  error: string | null
}

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export interface FilterParams {
  searchTerm?: string
  category?: string
  status?: 'all' | 'active' | 'inactive'
  minPrice?: string
  maxPrice?: string
  tags?: string[]
}

const PAGE_SIZE = 25

export function useFetchProducts(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['products', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await productService.getProducts(
        { 
          ...filters, 
          page: pageParam, 
          page_size: PAGE_SIZE 
        }, 
        false, // fetchAll = false to ensure we get paginated response
        false  // includeAssets = false for performance
      )
      // Ensure we return a properly typed response
      return response as PaginatedResponse<Product>
    },
    getNextPageParam: (lastPage: PaginatedResponse<Product>) => {
      if (!lastPage.next) return undefined
      // Extract page number from URL
      try {
        const url = new URL(lastPage.next)
        const nextPage = url.searchParams.get('page')
        return nextPage ? parseInt(nextPage) : undefined
      } catch (e) {
        // If next is not a valid URL, try to parse it as a relative path
        const match = lastPage.next.match(/page=(\d+)/)
        return match?.[1] ? parseInt(match[1]) : undefined
      }
    },
    initialPageParam: 1,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  })
}

export function useFetchProductsOld(
  pagination: PaginationState,
  filterParams: FilterParams = {}
) {
  const { isAuthenticated } = useAuth()
  const [state, setState] = useState<ProductsState>({
    products: [],
    filteredData: [],
    totalCount: 0,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!isAuthenticated) return
    
    const fetchData = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      try {
        // Map our filter params to API query parameters
        const queryParams: Record<string, any> = {
          page: pagination.pageIndex + 1, // API uses 1-based indexing
          page_size: pagination.pageSize
        }
        
        // Add search term if provided
        if (filterParams.searchTerm) {
          queryParams.search = filterParams.searchTerm
        }
        
        // Add category filter if provided
        if (filterParams.category && filterParams.category !== 'all') {
          queryParams.category = filterParams.category
        }
        
        // Add status filter if provided
        if (filterParams.status && filterParams.status !== 'all') {
          queryParams.is_active = filterParams.status === 'active'
        }
        
        // Add price range filters if provided
        if (filterParams.minPrice) {
          queryParams.min_price = filterParams.minPrice
        }
        
        if (filterParams.maxPrice) {
          queryParams.max_price = filterParams.maxPrice
        }
        
        // Add tags filter if provided
        if (filterParams.tags && filterParams.tags.length > 0) {
          queryParams.tags = filterParams.tags.join(',')
        }
        
        // Log the query parameters before making the API call
        console.log('[useFetchProducts] calling API with:', queryParams);
        
        // Use pagination for server-side paging
        const response = await productService.getProducts(
          queryParams,
          /* fetchAll */ false,
          /* includeAssets */ false
        )
        
        // Check if it's a paginated response
        if (response && 'results' in response && Array.isArray(response.results)) {
          // Update with paginated data
          setState({
            products: response.results,
            filteredData: response.results,
            totalCount: response.count || 0,
            loading: false,
            error: null
          })
        } else if (Array.isArray(response)) {
          // Direct array response
          setState({
            products: response,
            filteredData: response,
            totalCount: response.length,
            loading: false,
            error: null
          })
        } else {
          // Fallback case
          setState({
            products: [],
            filteredData: [],
            totalCount: 0,
            loading: false,
            error: 'Invalid response format'
          })
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch products'
        }))
        console.error('Error fetching products:', err)
      }
    }
    
    fetchData()
  }, [
    isAuthenticated, 
    pagination.pageIndex, 
    pagination.pageSize,
    filterParams.searchTerm,
    filterParams.category,
    filterParams.status,
    filterParams.minPrice,
    filterParams.maxPrice,
    // Join tags array to a string for dependency comparison
    filterParams.tags?.join(',')
  ])
  
  return state
} 