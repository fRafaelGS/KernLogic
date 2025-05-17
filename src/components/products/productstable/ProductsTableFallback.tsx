import React from "react";
import { Link } from "react-router-dom";
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilterIcon,
  RefreshCw,
  ShoppingBagIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Product } from "@/services/productService";

/* ------------------------------------------------------------------ */
/*  Small helper type (duplicate for now — we'll centralise later)    */
/* ------------------------------------------------------------------ */
export interface FilterState {
  category: string;
  status: "all" | "active" | "inactive";
  minPrice: string;
  maxPrice: string;
  tags: string[];
  searchTerm?: string;
}

/* ------------------------------------------------------------------ */
/*               TableFallback component (exported)                   */
/* ------------------------------------------------------------------ */
export interface ProductsTableFallbackProps {
  columns: ColumnDef<Product>[];
  loading: boolean;
  filteredData: Product[];
  filters: FilterState;
  handleClearFilters: () => void;
  handleRefresh: () => void;
}

export function ProductsTableFallback({
  columns,
  loading,
  filteredData,
  filters,
  handleClearFilters,
  handleRefresh,
}: ProductsTableFallbackProps) {
  /* -------- 1. Skeleton rows while data loads -------------------- */
  if (loading) {
    return (
      <>
        <tr className="sr-only">
          <td>Loading product data…</td>
        </tr>
        {Array.from({ length: 5 }).map((_, idx) => (
          <TableRow
            key={`skeleton-${idx}`}
            className="border-b border-slate-100 bg-white h-8"
          >
            {columns.map((column, colIdx) => {
              const columnId =
                column.id ||
                // @ts-ignore because accessorKey isn't on every ColumnDef
                (column as any).accessorKey?.toString() ||
                "";
              const hideMobile = ["brand", "barcode", "created_at", "tags"].includes(
                columnId,
              )
                ? "hidden md:table-cell"
                : "";
              const width =
                columnId === "name"
                  ? "w-1/4"
                  : columnId === "select"
                  ? "w-10"
                  : "";

              return (
                <TableCell
                  key={`${idx}-${colIdx}`}
                  className={`p-2 ${hideMobile} ${width}`}
                >
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </>
    );
  }

  /* -------- 2. No-data / no-match UI ----------------------------- */
  if (filteredData.length === 0) {
    const hasFilters =
      filters.searchTerm ||
      filters.category ||
      filters.status !== "all" ||
      filters.minPrice ||
      filters.maxPrice;

    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-60 text-center">
          <div className="flex flex-col items-center justify-center p-6">
            {hasFilters ? (
              <>
                <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FilterIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No products match your filters
                </h3>
                <p className="text-gray-500 mb-4 max-w-md">
                  Try adjusting your search or filter criteria to find what
                  you're looking for.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="flex items-center gap-2"
                  >
                    <XIcon className="h-4 w-4" />
                    Clear Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <ShoppingBagIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No products found
                </h3>
                <p className="text-gray-500 mb-4 max-w-md">
                  There are no products in your inventory yet. Start by adding
                  a new product.
                </p>
                <Link to="/app/products/new">
                  <Button className="flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Add Product
                  </Button>
                </Link>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  /* -------- 3. Let the caller render normal rows ---------------- */
  return null;
}
