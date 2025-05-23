import React, { useState, useEffect } from 'react'
import { ProductsTableAdapter } from '@/components/products/ProductsTableAdapter'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ViewToggle } from '@/components/products/ViewToggle'
import { useFetchProducts } from '@/hooks/useFetchProducts'
import { Product, PaginatedResponse } from '@/services/productService'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/useDebounce'
import { useUniqueCategories, useUniqueTags } from '@/hooks/useProductDerived'
import { config } from '@/config/config'

type ViewMode = 'list' | 'grid'

export default function ProductsPage() {
  // Get reference to the productsTable config section
  const tableConfig = config.productsTable
  
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  
  // Add search state here
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // Add filter toggle state
  const [filtersVisible, setFiltersVisible] = useState(false)
  
  // Update to use a simpler filters state for React Query
  const [filters, setFilters] = useState<Record<string, any>>({
    search: '',
    page: 1,
    page_size: viewMode === 'list' ? 10 : 50
  })
  
  // Update filters when search term changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearchTerm,
      page_size: viewMode === 'list' ? 10 : 50
    }))
  }, [debouncedSearchTerm, viewMode])
  
  // Fetch products with React Query
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useFetchProducts(filters)
  
  // 🔍 TEMPORARY DEBUG - Remove after investigation
  console.log('🔍 Raw data from useFetchProducts:', {
    'data': data,
    'data?.pages': data?.pages,
    'data?.pages?.length': data?.pages?.length,
    'first page': data?.pages?.[0],
    'first page keys': data?.pages?.[0] ? Object.keys(data.pages[0]) : 'no first page',
    'first page.results': data?.pages?.[0]?.results,
    'first page.results type': typeof data?.pages?.[0]?.results,
    'first page.results length': data?.pages?.[0]?.results?.length
  })
  
  // Extract products from paginated data
  const products = React.useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page: any) =>
      // if the page is an array of products, use it directly
      Array.isArray(page) ? page : page.results || []
    )
  }, [data])
  
  // Extract total count
  const totalCount = data?.pages?.[0]?.count || 0
  
  // Update pagination handlers to work with the new filters approach
  const handlePageChange = (pageIndex: number) => {
    setFilters(prev => ({
      ...prev,
      page: pageIndex + 1 // API uses 1-based indexing
    }))
  }
  
  const handlePageSizeChange = (pageSize: number) => {
    setFilters(prev => ({
      ...prev,
      page_size: pageSize,
      page: 1 // Reset to first page when changing page size
    }))
  }
  
  // Use these hooks to get unique categories and tags
  const uniqueCategories = useUniqueCategories(products || [])
  const uniqueTags = useUniqueTags(products || [])
  
  // Load saved view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem('productViewMode')
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      setViewMode(savedViewMode as ViewMode)
    }
  }, [])
  
  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('productViewMode', viewMode)
  }, [viewMode])
  
  // Handle refresh button click
  const handleRefresh = () => {
    // Trigger a refetch by updating the filters state
    setFilters(prev => ({ ...prev }))
    toast({ 
      title: tableConfig.messages.refresh, 
      variant: 'default' 
    })
  }
  
  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }
  
  // Handle clearing all filters
  const handleClearFilters = () => {
    setFilters({
      search: debouncedSearchTerm, // Keep the search term
      page: 1,
      page_size: viewMode === 'list' ? 10 : 50
    })
  }
  
  return (
    <div className="flex flex-col flex-1 px-2 lg:px-4 min-h-0 min-w-0 hide-x-scrollbar">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-1 px-1 border-b gap-1 sm:gap-1">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Search and filter removed */}
        </div>
        <div className="flex items-center space-x-2">
          <ViewToggle 
            view={viewMode} 
            onViewChange={setViewMode} 
          />
          {/* Refresh and New Product buttons removed as per instructions */}
        </div>
      </div>

      {/* Main Content */}
      <section className="flex flex-col overflow-hidden flex-1 min-h-0 min-w-0">
        {/* ONE self-contained scroll region */}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {viewMode === 'grid' ? (
            <ProductGrid 
              filters={filters}
              products={products}
              loading={isLoading}
              error={error?.message || null}
            />
          ) : (
            <ProductsTableAdapter 
              viewMode="list"
              filters={filters}
              hideTopSearch={true} 
              hideTopControls={false} 
            />
          )}
        </div>
      </section>

      {/* Shared Pagination Controls - Only show in grid view for React Query's fetchNextPage */}
      {viewMode === 'grid' && hasNextPage && (
        <div className="load-more-container border-t">
          <Button 
            variant="outline" 
            onClick={() => fetchNextPage()} 
            disabled={isFetchingNextPage}
            className="static"
          >
            {isFetchingNextPage 
              ? tableConfig.display.buttons.loadingMore 
              : tableConfig.display.buttons.loadMore
            }
          </Button>
        </div>
      )}
    </div>
  )
}

// Temporary component to avoid errors until you have this component
const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
)
