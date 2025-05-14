import React from 'react'
// @ts-ignore - Importing ProductsTable as-is despite potential type conflicts
import { ProductsTable } from './ProductsTable'
import { Product } from '@/services/productService'

interface ProductsTableAdapterProps {
  products: Product[];
  filteredData: Product[];
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
 * - ProductsTable handles its own data fetching and pagination internally
 * - Currently, we don't pass props to prevent TypeScript errors since
 *   ProductsTable doesn't fully support them yet
 * - We hide only specific controls that are duplicated in the parent component
 */
export function ProductsTableAdapter(props: ProductsTableAdapterProps) {
  // Hide only the search box, filter button, view toggle, refresh button, and new product button
  // but keep bulk actions, category management, and columns control
  return <ProductsTable 
    hideTopSearch={true} 
    hideTopControls={true} 
  />;
} 