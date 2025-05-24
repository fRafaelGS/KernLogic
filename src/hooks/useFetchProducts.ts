import { useQuery } from '@tanstack/react-query'
import { productService, PaginatedResponse, Product } from '@/services/productService'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Define the allowed fields for table optimization
const ALLOWED_FIELDS = [
  "id", "name", "sku",
  "category_id", "category_name",
  "brand", "tags", "barcode",
  "is_active", "created_at", "updated_at",
  "family_id", "family_name",
  "price", "created_by", "is_archived",
  "primary_image_thumb"
] as const

export interface ProductsState {
  products: Product[]
  filteredData: Product[]
  totalCount: number
  loading: boolean
  error: string | null
}

export interface FilterParams {
  searchTerm?: string
  name?: string
  sku?: string
  category?: string
  status?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  tags?: string[]
  page_size?: number
  page?: number  // Add page parameter for pagination
  family?: string
  useFieldsOptimization?: boolean // Flag to enable/disable optimization
}

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function buildQueryParams(filters: FilterParams): Record<string, any> {
  const params: Record<string, any> = {}
  
  if (filters.searchTerm) {
    params.search = filters.searchTerm
  }
  
  if (filters.name) {
    params.name = filters.name
  }
  
  if (filters.sku) {
    params.sku = filters.sku
  }
  
  if (filters.category && filters.category !== 'all') {
    params.category = filters.category
  }
  
  if (filters.status && filters.status !== 'all') {
    params.is_active = filters.status === 'active'
  }
  
  if (filters.brand && filters.brand !== 'all') {
    params.brand = filters.brand
  }
  
  if (filters.minPrice !== undefined) {
    params.min_price = filters.minPrice
  }
  
  if (filters.maxPrice !== undefined) {
    params.max_price = filters.maxPrice
  }
  
  if (filters.tags && filters.tags.length > 0) {
    params.tags = filters.tags.join(',')
  }
  
  if (filters.family && filters.family !== 'all') {
    params.family = filters.family
  }
  
  // Add page parameter from filters
  if (filters.page) {
    params.page = filters.page
  }
  
  // Add fields optimization parameter if enabled (default: true)
  if (filters.useFieldsOptimization !== false) {
    params.fields = ALLOWED_FIELDS.join(',')
  }
  
  // Set page size with validation
  params.page_size = Math.min(filters.page_size ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  
  return params
}

export function useFetchProducts(filters: FilterParams = {}) {
  const effectivePageSize = 
    Math.min(filters.page_size ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    
  const queryParams = buildQueryParams(filters)

  return useQuery({
    queryKey: ['products', queryParams],
    queryFn: async () => {
      const response = await productService.getProducts(
        queryParams,
        false, // fetchAll = false to ensure we get paginated response
        false  // includeAssets = false for performance (handled by fields optimization)
      )
      // Ensure we return a properly typed response
      return response as PaginatedResponse<Product>
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status
        if (status >= 400 && status < 500) {
          return false
        }
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    }
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
        
        // Add name filter if provided
        if (filterParams.name) {
          queryParams.name = filterParams.name
        }
        
        // Add sku filter if provided
        if (filterParams.sku) {
          queryParams.sku = filterParams.sku
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
    filterParams.name,
    filterParams.sku,
    filterParams.category,
    filterParams.status,
    filterParams.minPrice,
    filterParams.maxPrice,
    // Join tags array to a string for dependency comparison
    filterParams.tags?.join(',')
  ])
  
  return state
}

// Enhanced hook for on-demand detail fetching
export function useFetchProductDetail(productId: number | undefined, options?: {
  includeAssets?: boolean
  includeAttributeGroups?: boolean
}) {
  const { includeAssets = false, includeAttributeGroups = false } = options || {}
  
  return useQuery({
    queryKey: ['product-detail', productId, { includeAssets, includeAttributeGroups }],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required')
      
      const product = await productService.getProduct(productId)
      
      // Fetch additional data on demand
      const additionalData: any = {}
      
      if (includeAssets) {
        try {
          const assets = await productService.getProductAssets(productId)
          additionalData.assets = assets
        } catch (error) {
          console.warn('Failed to fetch assets:', error)
          additionalData.assets = []
        }
      }
      
      if (includeAttributeGroups) {
        try {
          // This would be the call to fetch attribute groups
          // const attributeGroups = await productService.getProductAttributeGroups(productId)
          // additionalData.attribute_groups = attributeGroups
        } catch (error) {
          console.warn('Failed to fetch attribute groups:', error)
          additionalData.attribute_groups = []
        }
      }
      
      return { ...product, ...additionalData }
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes for detail data
    gcTime: 10 * 60 * 1000, // 10 minutes cache time for detail data
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status
        if (status >= 400 && status < 500) {
          return false
        }
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    }
  })
} 