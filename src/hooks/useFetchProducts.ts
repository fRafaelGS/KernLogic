import { useState, useEffect } from 'react'
import { Product, productService } from '@/services/productService'
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

export function useFetchProducts(pagination: PaginationState) {
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
        // Use pagination for server-side paging
        const response = await productService.getProducts(
          {
            page: pagination.pageIndex + 1, // API uses 1-based indexing
            page_size: pagination.pageSize
          },
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
  }, [isAuthenticated, pagination.pageIndex, pagination.pageSize])
  
  return state
} 