import React, { memo, useRef, useEffect, useState } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import { Product, PaginatedResponse } from '@/services/productService'
import { ProductCard } from './ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useFetchProductsInfinite } from '@/hooks/useFetchProducts'
import { config } from '@/config/config'

interface ProductGridProps {
  products: Product[]
  loading: boolean
  error: string | null
  filters: Record<string, any>
  onFilterChange: (columnId: string, value: any) => void
  onClearFilters: () => void
  table: any
  columns: any[]
  uniqueCategories: any[]
  uniqueTags: string[]
  uniqueBrands: string[]
  families: any[]
  isFamiliesLoading: boolean
  // Optional infinite scroll functions
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
}

// Memoized product card component with proper spacing
const MemoizedProductCard = memo(({ 
  product, 
  style 
}: { 
  product: Product, 
  style: React.CSSProperties 
}) => {
  // Adjust style to add padding for spacing between items
  const adjustedStyle = {
    ...style,
    padding: '0.75rem',
    boxSizing: 'border-box' as 'border-box',
  }
  
  return (
    <div style={adjustedStyle}>
      <ProductCard product={product} />
    </div>
  )
})

export function ProductGrid({ 
  filters, 
  products: passedProducts, 
  loading: passedLoading, 
  error: passedError,
  onFilterChange,
  onClearFilters,
  table,
  columns,
  uniqueCategories,
  uniqueTags,
  uniqueBrands,
  families,
  isFamiliesLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}: ProductGridProps) {
  // DEBUG: Log props immediately on render
  console.log('🔍 ProductGrid IMMEDIATE Props Debug:', {
    'onFilterChange type': typeof onFilterChange,
    'onFilterChange value': onFilterChange,
    'onClearFilters type': typeof onClearFilters,
    'onClearFilters value': onClearFilters
  });

  // Get reference to the productsTable config section
  const tableConfig = config.productsTable
  
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage: useFetchProductsInfiniteFetchNextPage, 
    hasNextPage: useFetchProductsInfiniteHasNextPage,
    isFetchingNextPage: useFetchProductsInfiniteIsFetchingNextPage 
  } = useFetchProductsInfinite(
    filters,
    // Only fetch when products are not passed as props (standalone mode) or when empty array is passed
    passedProducts === undefined || passedProducts.length === 0
  )
  
  // Use passed props if they exist and are not empty, otherwise use values from useFetchProductsInfinite
  const isLoadingData = passedLoading !== undefined && passedProducts && passedProducts.length > 0 ? passedLoading : isLoading
  const errorMessage = passedError !== undefined && passedProducts && passedProducts.length > 0 ? passedError : error
  
  // Use passed infinite scroll functions if available, otherwise use internal ones
  const finalFetchNextPage = fetchNextPage || useFetchProductsInfiniteFetchNextPage
  const finalHasNextPage = hasNextPage !== undefined ? hasNextPage : useFetchProductsInfiniteHasNextPage
  const finalIsFetchingNextPage = isFetchingNextPage !== undefined ? isFetchingNextPage : useFetchProductsInfiniteIsFetchingNextPage
  
  const productsToRender = React.useMemo(() => {
    console.log('🔍 productsToRender Debug:', {
      passedProducts,
      'passedProducts?.length': passedProducts?.length,
      data,
      'data?.pages': data?.pages,
      'data?.pages?.[0]': data?.pages?.[0],
      'Array.isArray(data?.pages?.[0])': Array.isArray(data?.pages?.[0]),
      'data?.pages?.[0]?.results': data?.pages?.[0]?.results
    })
    
    // If products are passed directly and not empty, use them (standalone ProductGrid scenario)
    if (passedProducts !== undefined && passedProducts.length > 0) {
      console.log('Using passed products')
      return passedProducts
    }
    
    // Otherwise use data from useFetchProductsInfinite (ProductsPage grid scenario or standalone)
    if (!data) {
      console.log('No data available')
      return []
    }
    
    const result = data.pages.flatMap((page: any) => {
      console.log('Processing page:', { page, 'Array.isArray(page)': Array.isArray(page), 'page.results': page.results })
      // if the page is an array of products, use it directly
      // if the page is a paginated response object, use page.results
      if (Array.isArray(page)) {
        return page
      } else if (page && page.results && Array.isArray(page.results)) {
        return page.results
      } else {
        console.warn('Unexpected page structure:', page)
        return []
      }
    })
    
    console.log('Final productsToRender result:', result.length, 'products')
    return result
  }, [data, passedProducts])

  // Apply client-side filtering to the products for grid view
  const filteredProducts = React.useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return productsToRender
    }

    return productsToRender.filter(product => {
      // Category filter
      if (filters.category && filters.category !== 'all') {
        if (filters.category === 'uncategorized') {
          // For uncategorized, check if product has no category
          const hasCategory = product.category?.id || product.category_id
          if (hasCategory) return false
        } else {
          // For specific categories, compare IDs
          const productCategoryId = product.category?.id || product.category_id
          if (String(productCategoryId) !== String(filters.category)) {
            return false
          }
        }
      }

      // Family filter
      if (filters.family && filters.family !== 'all') {
        const productFamily = product.family
        let familyId = null
        
        if (typeof productFamily === 'object' && productFamily?.id) {
          familyId = productFamily.id
        } else if (typeof productFamily === 'number') {
          familyId = productFamily
        }
        
        if (String(familyId) !== String(filters.family)) {
          return false
        }
      }

      // Status filter
      if (filters.is_active && filters.is_active !== 'all') {
        const isActive = product.is_active
        if (filters.is_active === 'active' && !isActive) return false
        if (filters.is_active === 'inactive' && isActive) return false
      }

      // Brand filter
      if (filters.brand && filters.brand.trim()) {
        const productBrand = product.brand || ''
        if (!productBrand.toLowerCase().includes(filters.brand.toLowerCase())) {
          return false
        }
      }

      // Tags filter (AND logic - all selected tags must be present)
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        const productTags = product.tags || []
        let normalizedProductTags: string[] = []
        
        if (Array.isArray(productTags)) {
          normalizedProductTags = productTags.map(tag => 
            typeof tag === 'object' && tag?.name ? tag.name : String(tag)
          )
        } else if (typeof productTags === 'string') {
          try {
            const parsed = JSON.parse(productTags)
            normalizedProductTags = Array.isArray(parsed) ? parsed : [productTags]
          } catch (e) {
            normalizedProductTags = [productTags]
          }
        }
        
        const hasAllTags = filters.tags.every((filterTag: string) => 
          normalizedProductTags.some(productTag => 
            String(productTag).toLowerCase().includes(String(filterTag).toLowerCase())
          )
        )
        
        if (!hasAllTags) return false
      }

      // Price filters
      if (filters.minPrice) {
        const minPrice = parseFloat(filters.minPrice)
        if (!isNaN(minPrice)) {
          let productPrice = 0
          if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
            productPrice = parseFloat(product.prices[0].amount) || 0
          } else if ((product as any).price) {
            productPrice = parseFloat((product as any).price) || 0
          }
          if (productPrice < minPrice) return false
        }
      }

      if (filters.maxPrice) {
        const maxPrice = parseFloat(filters.maxPrice)
        if (!isNaN(maxPrice)) {
          let productPrice = 0
          if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
            productPrice = parseFloat(product.prices[0].amount) || 0
          } else if ((product as any).price) {
            productPrice = parseFloat((product as any).price) || 0
          }
          if (productPrice > maxPrice) return false
        }
      }

      // GTIN/Barcode filter
      if (filters.barcode && filters.barcode.trim()) {
        const productBarcode = product.barcode || ''
        if (!productBarcode.toLowerCase().includes(filters.barcode.toLowerCase())) {
          return false
        }
      }

      // SKU filter
      if (filters.sku && filters.sku.trim()) {
        const productSku = product.sku || ''
        if (!productSku.toLowerCase().includes(filters.sku.toLowerCase())) {
          return false
        }
      }

      // Name filter
      if (filters.name && filters.name.trim()) {
        const productName = product.name || ''
        if (!productName.toLowerCase().includes(filters.name.toLowerCase())) {
          return false
        }
      }

      // Date filters (created_at)
      if (filters.created_at_from) {
        const createdDate = new Date(product.created_at)
        const fromDate = new Date(filters.created_at_from)
        if (createdDate < fromDate) return false
      }

      if (filters.created_at_to) {
        const createdDate = new Date(product.created_at)
        const toDate = new Date(filters.created_at_to)
        if (createdDate > toDate) return false
      }

      // Date filters (updated_at)
      if (filters.updated_at_from) {
        const updatedDate = new Date(product.updated_at)
        const fromDate = new Date(filters.updated_at_from)
        if (updatedDate < fromDate) return false
      }

      if (filters.updated_at_to) {
        const updatedDate = new Date(product.updated_at)
        const toDate = new Date(filters.updated_at_to)
        if (updatedDate > toDate) return false
      }

      return true
    })
  }, [productsToRender, filters])

  // 🔍 DEBUGGING: Log all the critical values
  React.useEffect(() => {
    console.log('🔍 ProductGrid Debug Report:', {
      // Input props
      'passedProducts': passedProducts,
      'passedProducts?.length': passedProducts?.length,
      'passedLoading': passedLoading,
      'passedError': passedError,
      'filters': filters,
      
      // Hook results
      'data': data,
      'data?.pages': data?.pages,
      'data?.pages?.length': data?.pages?.length,
      'isLoading': isLoading,
      'error': error,
      
      // Computed values
      'isLoadingData': isLoadingData,
      'errorMessage': errorMessage,
      'productsToRender': productsToRender,
      'productsToRender.length': productsToRender.length,
      'filteredProducts': filteredProducts,
      'filteredProducts.length': filteredProducts.length,
      
      // Load More button debug
      'finalHasNextPage': finalHasNextPage,
      'hasNextPage (props)': hasNextPage,
      'useFetchProductsInfiniteHasNextPage': useFetchProductsInfiniteHasNextPage,
      'finalFetchNextPage': !!finalFetchNextPage,
      'finalIsFetchingNextPage': finalIsFetchingNextPage,
      
      // First few products for inspection
      'first3Products': filteredProducts.slice(0, 3).map(p => ({ id: p?.id, name: p?.name, sku: p?.sku }))
    })
  }, [passedProducts, passedLoading, passedError, filters, data, isLoading, error, isLoadingData, errorMessage, productsToRender, filteredProducts, finalHasNextPage, hasNextPage, useFetchProductsInfiniteHasNextPage, finalFetchNextPage, finalIsFetchingNextPage])

  // Debug logging for filter changes
  React.useEffect(() => {
    try {
      console.log('🔍 ProductGrid Filter Debug:', {
        filters,
        'onFilterChange': !!onFilterChange,
        'onClearFilters': !!onClearFilters,
        'uniqueCategories.length': uniqueCategories?.length || 0,
        'uniqueTags.length': uniqueTags?.length || 0,
        'uniqueBrands.length': uniqueBrands?.length || 0,
        'families.length': families?.length || 0
      });
    } catch (error) {
      console.log('🔍 ProductGrid Filter Debug - ERROR:', error);
    }
  }, [filters, onFilterChange, onClearFilters, uniqueCategories, uniqueTags, uniqueBrands, families]);

  // Grid container ref and dimensions
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1000) // Default width
  const [containerHeight, setContainerHeight] = useState(600) // Default height
  const rowHeight = 320 // Keep consistent row height

  // Update dimensions on mount and window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        // Calculate height based on visible rows needed (avoid partial rows)
        const columnCount = getColumnCount(width)
        const rowCount = Math.ceil(filteredProducts.length / columnCount)
        // Height calculation - 2 rows visible initially, more as needed
        const visibleRows = Math.min(rowCount, 12)
        const height = visibleRows * rowHeight
        
        setContainerWidth(width)
        setContainerHeight(height)
      }
    }
    
    // Initial measurement
    updateDimensions()
    
    // Add resize listener
    window.addEventListener('resize', updateDimensions)
    
    // Cleanup
    return () => window.removeEventListener('resize', updateDimensions)
  }, [filteredProducts.length])

  // Calculate columns based on container width - more conservative to prevent overflow
  const getColumnCount = (width: number) => {
    if (width < 640) return 1 // xs - single column on very small screens
    if (width < 768) return 2 // sm 
    if (width < 1024) return 3 // md
    if (width < 1280) return 4 // lg
    return 5 // xl and above
  }

  const columnCount = getColumnCount(containerWidth)
  // Calculate column width with safety margin
  const columnWidth = Math.floor((containerWidth - 16) / columnCount)
  const rowCount = Math.ceil(filteredProducts.length / columnCount)

  if (isLoadingData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex flex-col h-full">
            <Skeleton className="aspect-square w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-1" />
            <Skeleton className="h-3 w-1/2 mb-1" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <h3 className="text-lg font-medium mb-2">{tableConfig.messages.error.loadProducts}</h3>
          <p className="text-sm text-slate-500">
            {errorMessage instanceof Error ? errorMessage.message : errorMessage || 'An error occurred'}
          </p>
        </div>
      </div>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <h3 className="text-lg font-medium mb-2">{tableConfig.display.emptyState.title}</h3>
          <p className="text-sm text-slate-500">
            {tableConfig.display.emptyState.description}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full px-2 py-1" ref={containerRef}>
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={containerHeight}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={containerWidth}
        overscanRowCount={1}
        className="scrollbar-hide react-window-grid"
        aria-label={tableConfig.display.tableView.tableSummary}
      >
        {({ columnIndex, rowIndex, style }) => {
          const idx = rowIndex * columnCount + columnIndex
          if (idx >= filteredProducts.length) return null
          
          const product = filteredProducts[idx]
          if (!product) return null
          
          return <MemoizedProductCard style={style} product={product} />
        }}
      </Grid>
      
      {/* Load More Button */}
      {finalHasNextPage && (
        <div className="flex justify-center mt-6 mb-4">
          <button
            onClick={() => finalFetchNextPage()}
            disabled={finalIsFetchingNextPage}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {finalIsFetchingNextPage ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}

// Inject a CSS rule to fix React Window scrollbar issues
if (typeof document !== 'undefined') {
  const styleId = 'product-grid-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Hide all horizontal scrollbars */
      .react-window-grid::-webkit-scrollbar {
        display: none !important;
      }
      .react-window-grid {
        scrollbar-width: none !important;
      }
      
      /* Ensure no horizontal scrolling anywhere in the products area */
      #root, html, body, .app-main, .products-page, .products-container {
        max-width: 100vw !important;
      }
    `;
    document.head.appendChild(style);
  }
} 