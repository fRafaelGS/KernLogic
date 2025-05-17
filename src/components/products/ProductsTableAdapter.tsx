import React from 'react'
// @ts-ignore - Importing ProductsTable as-is despite potential type conflicts
import { ProductsTable } from './ProductsTable'
import { ProductGrid } from './ProductGrid'

interface ProductsTableAdapterProps {
  viewMode?: 'list' | 'grid'
  filters?: Record<string, any>
  hideTopSearch?: boolean
  hideTopControls?: boolean
}

/**
 * This is an adapter component that makes the existing ProductsTable work
 * with the new architecture until we can properly refactor it.
 * 
 * Implementation notes:
 * - All components now use React Query internally for data fetching
 * - We pass filters to ensure consistent querying
 */
export function ProductsTableAdapter({ 
  viewMode = 'list', 
  filters = {},
  hideTopSearch = false,
  hideTopControls = false
}: ProductsTableAdapterProps) {
  // Ensure filters are correctly formatted
  const normalizedFilters = React.useMemo(() => {
    // Convert any null values to undefined to prevent API issues
    return Object.entries(filters).reduce((acc, [key, value]) => {
      acc[key] = value === null ? undefined : value;
      return acc;
    }, {} as Record<string, any>);
  }, [filters]);

  // Switch between ProductsTable and ProductGrid based on viewMode
  if (viewMode === 'grid') {
    return <ProductGrid filters={normalizedFilters} />
  }
  
  // Default to list view
  return <ProductsTable 
    hideTopSearch={hideTopSearch} 
    hideTopControls={hideTopControls}
    filters={normalizedFilters}
  />
} 