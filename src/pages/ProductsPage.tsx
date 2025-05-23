import React, { useState, useEffect, useCallback } from 'react'
import { ProductsTableAdapter } from '@/components/products/ProductsTableAdapter'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ViewToggle } from '@/components/products/ViewToggle'
import { ProductsTableFilters } from '@/components/products/ProductsTableFilters'
import { useFetchProducts } from '@/hooks/useFetchProducts'
import { getCategories } from '@/services/categoryService'
import { useFamilies } from '@/api/familyApi'
import { productService } from '@/services/productService'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'
import { config } from '@/config/config'
import { useQuery } from '@tanstack/react-query'

type ViewMode = 'list' | 'grid'

// Define the shared FilterState type
export interface FilterState {
  page_size: number
  page: number
  search?: string
  category?: string
  family?: string
  status?: 'all' | 'active' | 'inactive'
  minPrice?: string
  maxPrice?: string
  tags?: string[]
  brand?: string
  barcode?: string
  sku?: string
  name?: string
  created_at?: string
  updated_at?: string
  is_archived?: boolean
}

export default function ProductsPage() {
  // Get reference to the productsTable config section
  const tableConfig = config.productsTable
  
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  
  // Add search state here
  const [searchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // LIFTED FILTER STATE - shared by both List and Grid views
  const [filters, setFilters] = useState<FilterState>({
    page_size: 10,
    page: 1,
    search: '',
    tags: [],
    category: 'all',
    family: undefined,
    status: 'all',
    minPrice: '',
    maxPrice: '',
    brand: '',
    barcode: '',
    sku: '',
    name: '',
    created_at: '',
    updated_at: '',
    is_archived: false,
  })
  
  // Update filters when search term changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearchTerm,
      page_size: viewMode === 'list' ? 10 : 50
    }))
  }, [debouncedSearchTerm, viewMode])
  
  // SHARED FILTER HANDLERS
  const handleFilterChange = useCallback((columnId: string, value: any) => {
    setFilters(prev => {
      const next = { ...prev, [columnId as keyof FilterState]: value }
      if (
        value === '' ||
        value === 'all' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete (next as any)[columnId]
      }
      return next
    })
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      page_size: viewMode === 'list' ? 10 : 50,
      page: 1,
      search: debouncedSearchTerm, // Keep search term
      tags: [],
      category: 'all',
      family: undefined,
      status: 'all',
      minPrice: '',
      maxPrice: '',
      brand: '',
      barcode: '',
      sku: '',
      name: '',
      created_at: '',
      updated_at: '',
      is_archived: false,
    })
  }, [viewMode, debouncedSearchTerm])
  
  // Fetch products with React Query
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useFetchProducts(filters)
  
  // Extract products from paginated data
  const products = React.useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page: any) =>
      // if the page is an array of products, use it directly
      Array.isArray(page) ? page : page.results || []
    )
  }, [data])
  
  // Get ALL categories from API (not filtered by current products)
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  // Get ALL families from API (not filtered by current products)
  const { data: allFamilies = [], isLoading: isFamiliesLoading } = useFamilies()
  
  // Get ALL tags from API (not filtered by current products)
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => productService.searchTags(''), // Empty string gets all tags
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  // For brands, we need to get unique brands from ALL products (not just current page)
  // This requires fetching all products briefly to extract brands
  const { data: allProductsForBrands = [] } = useQuery({
    queryKey: ['all-products-brands'],
    queryFn: () => productService.getProducts({}, true, false), // fetchAll=true, no assets
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data: any) => {
      // Extract unique brands from all products
      const products = Array.isArray(data) ? data : data.results || []
      const brandSet = new Set<string>()
      products.forEach((product: any) => {
        if (product?.brand && typeof product.brand === 'string') {
          brandSet.add(product.brand)
        }
      })
      return Array.from(brandSet).sort()
    }
  })
  
  // Create category options with IDs as values for grid view (all available categories)
  const gridCategoryOptions = React.useMemo(() => {
    return allCategories.map(category => ({
      label: category.name,
      value: String(category.id)
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [allCategories])
  
  // Create brand options for grid view (all available brands)
  const gridBrandOptions = React.useMemo(() => {
    return allProductsForBrands
  }, [allProductsForBrands])
  
  // Create tag options for grid view (all available tags)
  const gridTagOptions = React.useMemo(() => {
    return allTags.map(tag => tag.label).sort()
  }, [allTags])
  
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

      {/* SHARED FILTER BAR - renders once for both views */}
      <div className="mb-4">
        {viewMode === 'grid' && (
          <ProductsTableFilters
            columns={[]} // Empty for now - will be populated by individual components
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            table={null as any} // Pass null since we don't need TanStack table instance here
            uniqueCategories={gridCategoryOptions}
            uniqueTags={gridTagOptions}
            uniqueBrands={gridBrandOptions}
            families={allFamilies}
            isFamiliesLoading={isFamiliesLoading}
          />
        )}
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
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              table={undefined}
              columns={[]} // Empty for now
              uniqueCategories={gridCategoryOptions}
              uniqueTags={gridTagOptions}
              uniqueBrands={gridBrandOptions}
              families={allFamilies}
              isFamiliesLoading={isFamiliesLoading}
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
