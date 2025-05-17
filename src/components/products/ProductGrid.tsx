import React, { memo, useRef, useEffect, useState } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import { Product, PaginatedResponse } from '@/services/productService'
import { ProductCard } from './ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useFetchProducts } from '@/hooks/useFetchProducts'
import { Button } from '@/components/ui/button'

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
    padding: '0.5rem',
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
        // Calculate a reasonable height - matching content exactly to avoid scrollbars
        const height = Math.min(
          window.innerHeight - 140, // Leave less room to avoid scrollbar
          Math.ceil(productsToRender.length / getColumnCount(width)) * rowHeight
        )
        
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
  }, [productsToRender.length, rowHeight])

  // Calculate columns based on container width
  const getColumnCount = (width: number) => {
    if (width < 640) return 2 // sm
    if (width < 768) return 3 // md
    if (width < 1024) return 4 // lg
    if (width < 1280) return 5 // xl
    return 6 // 2xl and above
  }

  const columnCount = getColumnCount(containerWidth)
  const columnWidth = containerWidth / columnCount
  const rowCount = Math.ceil(productsToRender.length / columnCount)

  if (isLoadingData) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
        {Array.from({ length: 20 }).map((_, index) => (
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
          <h3 className="text-lg font-medium mb-2">Failed to load products</h3>
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
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-sm text-slate-500">
            Try adjusting your search criteria or create a new product.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full px-4 py-2" ref={containerRef}>
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={containerHeight}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={containerWidth}
        overscanRowCount={2}
        className="scrollbar-thin react-window-grid"
        style={{ 
          overflow: 'hidden',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
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
      .react-window-grid::-webkit-scrollbar {
        display: none;
      }
      .react-window-grid {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      /* Explicitly hide horizontal scrollbars */
      .react-window-grid::-webkit-scrollbar-horizontal {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }
} 