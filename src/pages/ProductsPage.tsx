import React, { useState, useEffect } from 'react'
import { ProductsTableAdapter } from '@/components/products/ProductsTableAdapter'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ViewToggle } from '@/components/products/ViewToggle'
import { PaginationControls } from '@/components/products/PaginationControls'
import { useFetchProducts, PaginationState, FilterParams } from '@/hooks/useFetchProducts'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/useDebounce'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useUniqueCategories, useUniqueTags } from '@/hooks/useProductDerived'

type ViewMode = 'list' | 'grid'

export default function ProductsPage() {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  
  // Add search state here
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // Add filter toggle state
  const [filtersVisible, setFiltersVisible] = useState(false)
  
  // Add filter state
  const [filters, setFilters] = useState<FilterParams>({
    searchTerm: '',
    category: 'all',
    status: 'all',
    minPrice: '',
    maxPrice: '',
    tags: []
  })
  
  // Separate pagination states
  const [listPagination, setListPagination] = useState<PaginationState>({ 
    pageIndex: 0, 
    pageSize: 10 
  })
  
  const [gridPagination, setGridPagination] = useState<PaginationState>({ 
    pageIndex: 0, 
    pageSize: 50 
  })
  
  // Get the active pagination based on view mode
  const activePagination = viewMode === 'list' ? listPagination : gridPagination
  const onPaginationChange = viewMode === 'list' ? setListPagination : setGridPagination
  
  // Update filters when search term changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      searchTerm: debouncedSearchTerm
    }))
  }, [debouncedSearchTerm])
  
  // Fetch products with the active pagination and filters
  const { products, totalCount, loading, error } = useFetchProducts(activePagination, filters)
  
  // Use these hooks to get unique categories and tags
  const uniqueCategories = useUniqueCategories(products)
  const uniqueTags = useUniqueTags(products)
  
  // Compute page count for controls
  const pageCount = Math.ceil(totalCount / activePagination.pageSize)
  
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
    // Just trigger a re-fetch by updating the pagination state with the same values
    onPaginationChange({ ...activePagination })
    toast({ 
      title: 'Refreshing products', 
      variant: 'default' 
    })
  }
  
  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }
  
  // Handle filter change
  const handleFilterChange = <K extends keyof FilterParams>(key: K, value: FilterParams[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  
  // Handle clearing all filters
  const handleClearFilters = () => {
    setFilters({
      searchTerm: debouncedSearchTerm, // Keep the search term
      category: 'all',
      status: 'all',
      minPrice: '',
      maxPrice: '',
      tags: []
    })
  }
  
  return (
    <div className="flex flex-col flex-1 px-2 lg:px-4 min-h-0 min-w-0">
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
      <section className="flex flex-col overflow-auto flex-1 min-h-0 min-w-0">
        {/* ONE self-contained scroll region */}
        <div className="flex-1 min-h-0 min-w-0">
          <ProductsTableAdapter 
            viewMode={viewMode}
            products={products}
            loading={loading}
            error={error}
          />
        </div>
      </section>

      {/* Shared Pagination Controls - Only show in grid view, table has its own */}
      {viewMode === 'grid' && (
        <PaginationControls
          pagination={gridPagination}
          onChange={setGridPagination}
          pageCount={Math.ceil(totalCount / gridPagination.pageSize)}
          pageSizeOptions={[50, 100]}
        />
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
