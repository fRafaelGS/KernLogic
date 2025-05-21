import { useInfiniteQuery } from '@tanstack/react-query'
import { productService, PaginatedResponse, Product } from '@/services/productService'
import { useState, useEffect } from 'react'
import { useAuth } from '@/domains/app/providers/AuthContext'

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
  page_size?: number
  page?: number
  search?: string
}

const PAGE_SIZE = 25
const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = PAGE_SIZE

function buildQueryParams(ui: Record<string, any>) {
  const qp: Record<string, any> = {
    page_size: Math.min(ui.page_size ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  };

  // text search
  if (ui.search)  qp.search = ui.search;
  
  // name, sku, and other direct matches
  if (ui.name) qp.name = ui.name;
  if (ui.sku) qp.sku = ui.sku;
  if (ui.brand) qp.brand = ui.brand;
  if (ui.barcode) qp.barcode = ui.barcode;
  if (ui.family) qp.family = ui.family;

  // category
  if (ui.category && ui.category !== 'all') qp.category = ui.category;

  // status → is_active (bool)
  if (ui.status && ui.status !== 'all')
    qp.is_active = ui.status === 'active';
  else if (ui.is_active !== undefined)
    qp.is_active = ui.is_active;

  // price range
  if (ui.minPrice) qp.min_price = ui.minPrice;
  if (ui.maxPrice) qp.max_price = ui.maxPrice;

  // tags array → comma-separated
  if (Array.isArray(ui.tags) && ui.tags.length)
    qp.tags = ui.tags.join(',');
    
  // date filters
  if (ui.created_at_from) qp.created_at_from = ui.created_at_from;
  if (ui.created_at_to) qp.created_at_to = ui.created_at_to;
  if (ui.updated_at_from) qp.updated_at_from = ui.updated_at_from;
  if (ui.updated_at_to) qp.updated_at_to = ui.updated_at_to;

  // strip empty / undefined values
  Object.keys(qp).forEach(k => {
    if (qp[k] === '' || qp[k] === undefined) delete qp[k];
  });
  return qp;
}

export function useFetchProducts(filters: FilterParams = {}) {
  const effectivePageSize = 
    Math.min(filters.page_size ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    
  const queryParams = buildQueryParams(filters)

  return useInfiniteQuery({
    queryKey: ['products', queryParams],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await productService.getProducts(
        { ...queryParams, page: pageParam },
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