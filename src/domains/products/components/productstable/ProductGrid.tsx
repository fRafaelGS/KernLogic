import React, { memo, useRef, useEffect, useState } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import { Product, PaginatedResponse } from '@/domains/products/services/productService'
import { ProductCard } from '@/domains/products/components/ProductCard'
import { Skeleton } from '@/domains/core/components/ui/skeleton'
import { useFetchProducts } from '@/domains/products/components/hooks/useFetchProducts'
import { config } from '@/config/config'

interface ProductGridProps {
  filters?: Record<string, any>
  products?: Product[]
  loading?: boolean
  error?: string | null
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
  filters = {}, 
  products: passedProducts, 
  loading: passedLoading, 
  error: passedError 
}: ProductGridProps) {
  // Get reference to the productsTable config section
  const tableConfig = config.productsTable
  
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage,
    isFetchingNextPage 
  } = useFetchProducts(filters)
  
  // Use passed props if they exist, otherwise use values from useFetchProducts
  const isLoadingData = passedLoading !== undefined ? passedLoading : isLoading
  const errorMessage = passedError !== undefined ? passedError : error
  
  const productsToRender = React.useMemo(() => {
    // If products are passed directly, use them
    if (passedProducts) return passedProducts
    
    // Otherwise use data from useFetchProducts
    if (!data) return []
    return data.pages.flatMap((page: PaginatedResponse<Product>) => page.results)
  }, [data, passedProducts])

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
        const rowCount = Math.ceil(productsToRender.length / columnCount)
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
  }, [productsToRender.length])

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
  const rowCount = Math.ceil(productsToRender.length / columnCount)

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

  if (productsToRender.length === 0) {
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
          if (idx >= productsToRender.length) return null
          return <MemoizedProductCard style={style} product={productsToRender[idx]} />
        }}
      </Grid>
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