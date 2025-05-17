import React from 'react'
// @ts-ignore - Importing ProductsTable as-is despite potential type conflicts
import { ProductsTable } from './ProductsTable'
import { Product } from '@/services/productService'
import { ProductGrid } from './ProductGrid'

interface ProductsTableAdapterProps {
  products?: Product[];
  loading?: boolean;
  error?: string | null;
  pagination?: { pageIndex: number; pageSize: number };
  setPagination?: (pagination: { pageIndex: number; pageSize: number }) => void;
  totalCount?: number;
  viewMode?: 'list' | 'grid';
}

/**
 * This is an adapter component that makes the existing ProductsTable work
 * with the new architecture until we can properly refactor it.
 * 
 * Implementation notes:
 * - We only pass the hideTopControls and hideTopSearch props
 * - ProductsTable currently handles its own data fetching internally
 * - In a future refactor, we need to update ProductsTable to use data from props
 */
export function ProductsTableAdapter(props: ProductsTableAdapterProps) {
  // Switch between ProductsTable and ProductGrid based on viewMode
  if (props.viewMode === 'grid') {
    return <ProductGrid 
      products={props.products || []}
      loading={props.loading}
      error={props.error}
    />
  }
  // Default to list view
  // @ts-ignore - This is a temporary solution until we properly update ProductsTable
  return <ProductsTable 
    hideTopSearch={true} 
    hideTopControls={false}
  />
} 