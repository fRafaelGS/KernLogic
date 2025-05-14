import React from 'react'
// @ts-ignore - Importing ProductsTable as-is despite potential type conflicts
import { ProductsTable } from './ProductsTable'
import { Product } from '@/services/productService'

interface ProductsTableAdapterProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: (pagination: { pageIndex: number; pageSize: number }) => void;
  totalCount: number;
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
  // Currently, ProductsTable only accepts hideTopControls and hideTopSearch props
  // It handles its own data fetching internally - we'll need to refactor it later
  
  // @ts-ignore - This is a temporary solution until we properly update ProductsTable
  return <ProductsTable 
    hideTopSearch={true} 
    hideTopControls={true} 
  />;
} 