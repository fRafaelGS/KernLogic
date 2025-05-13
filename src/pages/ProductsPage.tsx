import React, { useState, useEffect } from 'react'
import { ProductsTableAdapter } from '@/components/products/ProductsTableAdapter'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ViewToggle } from '@/components/products/ViewToggle'
import { PaginationControls } from '@/components/products/PaginationControls'
import { useFetchProducts, PaginationState } from '@/hooks/useFetchProducts'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'

type ViewMode = 'list' | 'grid'

export default function ProductsPage() {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  
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
  const setActivePagination = viewMode === 'list' ? setListPagination : setGridPagination
  
  // Fetch products with the active pagination
  const { products, filteredData, totalCount, loading, error } = useFetchProducts(activePagination)
  
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
    setActivePagination({ ...activePagination })
    toast({ 
      title: 'Refreshing products', 
      variant: 'default' 
    })
  }
  
  return (
    <div className="flex flex-col flex-1 w-full h-full mx-auto max-w-screen-2xl px-2 lg:px-4 min-h-0">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-1 px-1 border-b gap-1 sm:gap-1">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Add your search box here */}
          <Button 
            variant="outline" 
            size="sm"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <ViewToggle 
            view={viewMode} 
            onViewChange={setViewMode} 
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button className="h-9" asChild>
            <Link to="/app/products/new">
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <section className="flex flex-col flex-1 min-h-0">
        {viewMode === 'list' ? (
          <div className="flex-1 overflow-auto min-h-0">
            {/* Use the adapter for now until we properly migrate the component */}
            <ProductsTableAdapter 
              products={products}
              filteredData={filteredData}
              loading={loading}
              error={error}
              pagination={listPagination}
              setPagination={setListPagination}
              totalCount={totalCount}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <ProductGrid 
              products={filteredData}
              loading={loading}
              error={error}
            />
          </div>
        )}
      </section>

      {/* Shared Pagination Controls - Only show in grid view, table has its own */}
      {viewMode === 'grid' && (
        <PaginationControls
          pagination={gridPagination}
          onChange={setGridPagination}
          pageCount={pageCount}
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
