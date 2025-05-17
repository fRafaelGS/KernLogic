import React from 'react'
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
    <div className="flex flex-col">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
        {productsToRender.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {/* Only show load more button if using React Query data */}
      {!passedProducts && hasNextPage && (
        <div className="flex justify-center py-4">
          <Button 
            variant="outline" 
            onClick={() => fetchNextPage()} 
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load more products'}
          </Button>
        </div>
      )}
    </div>
  )
} 