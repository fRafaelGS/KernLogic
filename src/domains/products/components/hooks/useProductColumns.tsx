/* ---------------------------------------------------------- */
/*  src/hooks/useProductColumns.tsx                           */
/* ---------------------------------------------------------- */
import React, { useMemo } from "react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import {
  ArrowUpDown,
  ImageIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  type LucideIcon,
  Loader2,
} from "lucide-react";

import { Button } from "@/domains/core/components/ui/button";
import { Badge } from "@/domains/core/components/ui/badge";
import { Checkbox } from "@/domains/core/components/ui/checkbox";
import { Input } from "@/domains/core/components/ui/input";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/domains/core/components/ui/hover-card";
import type { OnChangeValue } from "react-select";

import { useFamilies } from '@/domains/families/services/familyApi';
import { normalizeFamily } from '@/domains/core/utils/familyNormalizer';
import { FamilyDisplay } from '@/domains/products/components/FamilyDisplay';

import {
  Product,
  productService,
} from "@/domains/products/services/productService";
import { Category } from '@/domains/products/types/categories';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/domains/core/components/ui/tooltip"
import { CategoryTreeSelect } from '@/domains/categories/components/CategoryTreeSelect';
import CreatableSelect from 'react-select/creatable'
import '@/domains/core/styles/editable-cell.scss'
import { pickPrimaryImage } from '@/domains/products/utils/images';


// Helper function to safely format price amounts
const formatAmount = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return '0.00';
  
  try {
    // Convert to string, then parse to float, then format with 2 decimal places
    return parseFloat(String(amount)).toFixed(2);
  } catch (error) {
    console.error('Error formatting amount:', amount, error);
    return '0.00';
  }
};

// After the imports and helper functions but before the useProductColumns function
// Add the CategoryCellPlaceholder component
const CategoryCellPlaceholder = () => (
  <div className="flex items-center space-x-2 p-1">
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    <span className="text-muted-foreground text-sm">Loading categories...</span>
  </div>
);

/* ---------------------------------------------------------- */
/*  Helper / shared types                                     */
/* ---------------------------------------------------------- */
export interface CategoryOption {
  label: string;
  value: string | number;
}

export interface TagOption {
  label: string;
  value: string;
}

/* What the parent component passes down */
export interface UseProductColumnsOpts {
  /* --- table‐level state --- */
  editingCell: { rowIndex: number; columnId: string } | null;
  editValue: string | any; // Allow any to accommodate different types for tags
  tagOptions: TagOption[];
  categoryOptions: CategoryOption[];

  /* --- setters that columns mutate --- */
  setEditValue(v: string | any): void; // Allow any to accommodate different types for tags
  setCategoryOptions(
    updater: (prev: CategoryOption[]) => CategoryOption[]
  ): void;
  setProducts?(
    updater: (prev: Product[]) => Product[] | Product[]
  ): void;

  /* --- event/callback helpers from ProductsTable --- */
  handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void;
  handlePriceCellChange(e: React.ChangeEvent<HTMLInputElement>): void;
  handleSaveCellEdit(): void;
  handleCancelEdit(): void;
  handleCellEdit(row: number, col: string, v: string): void;
  handleCreateTagOption(input: string): Promise<TagOption | null>;
  updateData(row: number, col: string, v: any): void;

  /* --- navigation / actions --- */
  navigate(path: string): void;
  handleRowClick(id: number): void;
  handleDelete(id: number): void;

  /* --- misc helpers --- */
  toast(msg: { title: string; description?: string; variant?: string }): void;
  fetchData?(): void;

  /* tiny reusable icon button component */
  IconBtn: React.ComponentType<{
    tooltip: string;
    icon: LucideIcon;
    onClick(): void;
  }>;
}

// Function to handle setProducts which might be undefined
const safeUpdateProducts = (
  setProducts: UseProductColumnsOpts['setProducts'],
  productId: number,
  update: (product: Product) => Product
): void => {
  if (typeof setProducts === 'function') {
    setProducts(prev => prev.map(p => (p.id === productId ? update(p) : p)));
  }
};

// Function to safely call fetchData
const safeCallFetchData = (fetchData?: () => void): void => {
  if (typeof fetchData === 'function') {
    fetchData();
  }
};

/* ---------------------------------------------------------- */
/*  The Hook                                                  */
/* ---------------------------------------------------------- */
export function useProductColumns({
  /* destructure all opts */
  editingCell,
  editValue,
  tagOptions,
  categoryOptions,
  setEditValue,
  setCategoryOptions,
  setProducts,
  handleKeyDown,
  handlePriceCellChange,
  handleSaveCellEdit,
  handleCancelEdit,
  handleCellEdit,
  handleCreateTagOption,
  updateData,
  navigate,
  handleRowClick,
  handleDelete,
  toast,
  fetchData,
  IconBtn,
}: UseProductColumnsOpts) {
  console.log('[useProductColumns] Hook initialized');

  /* -------- 1. main data columns -------------------------- */
  const columns = useMemo<ColumnDef<Product>[]>(() => [
    /* ------------------------------------------------------------------
       All the column definitions you pasted – **unchanged** – except
       we (a) replace productService with the alias `ps`, and
       (b) use the props we received instead of referring to upper-scope
    ------------------------------------------------------------------ */

    /**********  SELECT checkbox **************************************/
    {
      id: "select",
      size: 20,
      header: ({ table }) => (
        <div className="px-1">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-0 text-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },

    /**********  THUMBNAIL ********************************************/
    {
      accessorKey: "thumbnail",
      size: 70,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span>Image</span>
          <ArrowUpDown className="ml-1 h-4 w-4 opacity-70" />
        </Button>
      ),
      cell: ({ row }) => {
        // Use the centralized pickPrimaryImage utility for consistent image selection
        const primaryImageUrl = pickPrimaryImage(row.original);
        
        console.log("Product thumbnail:", {
          id: row.original.id,
          sku: row.original.sku, 
          primary_asset_url: row.original.primary_asset_url,
          selected_image: primaryImageUrl,
        });

        return (
          <div className="flex items-center space-x-2">
            {primaryImageUrl ? (
              <HoverCard>
                <HoverCardTrigger>
                  <img
                    src={primaryImageUrl}
                    alt={row.original.name}
                    className="h-14 w-14 rounded border object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2256%22%20height%3D%2256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2056%2056%22%3E%3Cpath%20fill%3D%22%23f0f0f0%22%20d%3D%22M0%200h56v56H0z%22%2F%3E%3C%2Fsvg%3E';
                    }}
                  />
                </HoverCardTrigger>
                <HoverCardContent className="p-2 w-80">
                  <img
                    src={primaryImageUrl}
                    alt={row.original.name}
                    className="w-full h-auto max-h-64 rounded"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20300%22%3E%3Cpath%20fill%3D%22%23f0f0f0%22%20d%3D%22M0%200h300v300H0z%22%2F%3E%3C%2Fsvg%3E';
                    }}
                  />
                  <p className="mt-2 text-sm">{row.original.name}</p>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <div className="h-14 w-14 rounded border flex items-center justify-center bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        );
      },
      enableSorting: true,
    },

    /**********  SKU ***************************************************/
    {
      accessorKey: "sku",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent w-full text-center"
        >
          <span className="w-full text-center block">SKU</span>
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const rowIdx = row.index;
        const value = row.getValue("sku") as string ?? "";
        const isEditing =
          editingCell?.rowIndex === rowIdx && editingCell.columnId === "sku";

        return isEditing ? (
          <div
            className="flex space-x-2 w-full p-1"
            onClick={(e) => e.stopPropagation()}
            data-editing="true"
          >
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveCellEdit}
              className="h-8 w-full"
            />
            <Button size="sm" variant="ghost" onClick={handleSaveCellEdit}>
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            title={value}
            className="truncate cursor-pointer hover:text-primary p-1"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIdx, "sku", value);
            }}
            data-editable
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="editable-cell">{value}</span>
              </TooltipTrigger>
              <TooltipContent>Click to edit</TooltipContent>
            </Tooltip>
          </div>
        );
      },
      enableSorting: true,
    },

    /**********  NAME **************************************************/
    {
      accessorKey: "name",
      size: 260,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent w-full text-center"
        >
          <span className="w-full text-center block">Name</span>
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const rowIdx = row.index;
        const value = row.getValue("name") as string ?? "";
        const isEditing =
          editingCell?.rowIndex === rowIdx && editingCell.columnId === "name";

        return isEditing ? (
          <div
            className="flex space-x-2 w-full p-1"
            onClick={(e) => e.stopPropagation()}
            data-editing="true"
          >
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveCellEdit}
              className="h-8 w-full"
            />
            <Button size="sm" variant="ghost" onClick={handleSaveCellEdit}>
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            title={value}
            className="truncate font-medium cursor-pointer hover:text-primary p-1"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIdx, "name", value);
            }}
            data-editable
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="editable-cell">{value}</span>
              </TooltipTrigger>
              <TooltipContent>Click to edit</TooltipContent>
            </Tooltip>
          </div>
        );
      },
      enableSorting: true,
    },

    /**********  FAMILY **************************************************/
    {
      accessorKey: "family",
      size: 200,
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent w-full text-center"
          >
            <span className="w-full text-center block">Family</span>
            <ArrowUpDown className="ml-1 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        // Get family data from the product - might be a family object, ID, or family_name string
        const family = row.original.family;
        const familyName = row.original.family_name;
        
        // Debug log to help diagnose family data
        console.log("Family rendering:", { 
          id: row.original.id, 
          sku: row.original.sku,
          family, 
          familyName 
        });
        
        // First try using family object or ID if available
        if (family) {
          // Get families data using the hook imported at the top
          const { data: familiesData, isLoading: isFamiliesLoading } = useFamilies();
          const families = familiesData || [];
          
          // First, normalize the family data for consistent format
          let normalizedFamily = normalizeFamily(family);
          
          // If we have families data and normalized family shows a generic label ("Family X"),
          // try to find the complete family data from the families list
          if (normalizedFamily && families.length > 0 && !isFamiliesLoading) {
            // Check if we need to enhance with full family data (when label is generic "Family X" or is missing properties)
            const hasGenericLabel = normalizedFamily.label.includes(`Family ${normalizedFamily.id}`);
            const isMissingProperties = !normalizedFamily.code || normalizedFamily.code === `family-${normalizedFamily.id}`;
            
            if (hasGenericLabel || isMissingProperties) {
              const fullFamily = families.find(f => f.id === normalizedFamily?.id);
              if (fullFamily) {
                normalizedFamily = normalizeFamily(fullFamily);
              }
            }
          }
          
          return (
            <div className="flex justify-center p-1 w-full">
              <FamilyDisplay 
                family={normalizedFamily} 
                badgeVariant="secondary"
                showEmpty={true}
                showCode={false}
                hideTooltip={true}
                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors w-full text-center px-2"
              />
            </div>
          );
        }
        
        // If direct family object isn't available but family_name is, use that
        if (familyName) {
          return (
            <div className="flex justify-center p-1 w-full">
              <FamilyDisplay 
                family={{ label: familyName }}
                badgeVariant="secondary"
                showEmpty={true}
                showCode={false}
                hideTooltip={true}
                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors w-full text-center px-2"
              />
            </div>
          );
        }
        
        // No family data found
        return (
          <div className="flex justify-center p-1 w-full">
            <FamilyDisplay 
              family={null}
              badgeVariant="secondary"
              showEmpty={true}
              showCode={false}
              hideTooltip={true}
              className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors w-full text-center px-2"
            />
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        
        // Try to match against family object first
        const family = row.getValue(columnId);
        // Then try to match against family_name
        const familyName = row.original.family_name;
        
        if (family) {
          // Handle different possible family data formats
          let familyId: number | null = null;
          
          if (typeof family === 'object' && family !== null) {
            // Family might be a complex object with an ID property
            familyId = (family as any).id;
          } else if (typeof family === 'number') {
            // Family might be just the ID
            familyId = family;
          }
          
          // Compare family ID with filter value
          return String(familyId) === String(filterValue);
        } else if (familyName) {
          // If using family_name, do a string match
          const familyNameLower = familyName.toLowerCase();
          const filterValueLower = String(filterValue).toLowerCase();
          return familyNameLower.includes(filterValueLower);
        }
        
        return false;
      },
    },

    /**********  CATEGORY **************************************************/
    {
      accessorKey: "category",
      size: 190,
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent w-full text-center"
          >
            <span className="w-full text-center block">Category</span>
            <ArrowUpDown className="ml-1 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const rowIndex = row.index;
        
        // Get all potential category data sources - use optional chaining for safety
        const categoryData = row.getValue("category") as Category[] | Category | string | undefined;
        const categoryName = row.original?.category_name as string | undefined;
        
        // Debug log
        console.log("Category rendering:", { 
          id: row.original?.id, 
          sku: row.original?.sku, 
          categoryData, 
          categoryName 
        });
        
        // Check if we're editing
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'category';
        
        // Check if categories have been loaded yet
        const categoriesLoading = !categoryOptions || categoryOptions.length === 0;
        
        // Determine category ID for editing
        let categoryId = null;
        if (categoryData) {
          if (Array.isArray(categoryData) && categoryData.length > 0) {
            const leafCategory = categoryData[categoryData.length - 1];
            categoryId = leafCategory?.id;
          } else if (typeof categoryData === 'object' && categoryData !== null) {
            categoryId = (categoryData as any).id;
          } else if (typeof categoryData === 'number') {
            categoryId = categoryData;
          }
        }
        
        if (isEditing) {
          return (
            <div 
              className="min-w-[250px] p-1" 
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()} 
              onKeyDown={e => e.stopPropagation()}
              data-editing="true" 
              data-component="category-tree-select"
            >
              <CategoryTreeSelect
                selectedValue={categoryId}
                onChange={newId => updateData(rowIndex, 'category', newId)}
                disabled={categoriesLoading}
              />
            </div>
          );
        }
        
        // Show loading state if categories aren't loaded yet
        if (categoriesLoading) {
          return <CategoryCellPlaceholder />;
        }
        
        // Render the category information - handle all possible formats safely
        let categoryContent: JSX.Element;
        
        // First priority: Use category_name from API (most reliable source)
        if (categoryName) {
          // Check if categoryName has path separators (/, >, \ or |)
          const hasSeparators = /[\/\\>|]/.test(categoryName);
          
          if (hasSeparators) {
            // Split by any common separator and trim each part
            const parts = categoryName.split(/[\/\\>|]+/)
                               .map(part => part.trim())
                               .filter(Boolean);
            
            if (parts.length > 1) {
              categoryContent = (
                <div className="flex flex-wrap items-center">
                  {parts.map((part, i) => (
                    <React.Fragment key={`part-${i}`}>
                      {i > 0 && <span className="mx-1 text-slate-400">&gt;</span>}
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {part}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              );
            } else {
              // Single part
              categoryContent = (
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                  {categoryName}
                </span>
              );
            }
          } else {
            // No separators
            categoryContent = (
              <span className="text-xs font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                {categoryName}
              </span>
            );
          }
        }
        // Second priority: Check category array (full breadcrumb structure)
        else if (Array.isArray(categoryData) && categoryData.length > 0) {
          categoryContent = (
            <div className="flex flex-wrap items-center">
              {categoryData.map((cat, i) => (
                <React.Fragment key={typeof cat === 'object' && cat !== null ? cat.id : i}>
                  {i > 0 && <span className="mx-1 text-slate-400">&gt;</span>}
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                    {typeof cat === 'object' && cat !== null ? cat.name : String(cat)}
                  </span>
                </React.Fragment>
              ))}
            </div>
          );
        }
        // Third priority: Check if category is a single object
        else if (typeof categoryData === 'object' && categoryData !== null && 'name' in categoryData) {
          categoryContent = (
            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
              {(categoryData as any).name}
            </span>
          );
        }
        // Fourth priority: Check if category is a string or primitive that can be displayed
        else if (categoryData !== null && categoryData !== undefined) {
          // For safety, explicitly convert to string regardless of type
          // This avoids TypeScript errors with string[]
          try {
            // Convert safely to string, handling arrays and objects
            let displayText: string;
            
            if (Array.isArray(categoryData)) {
              // If it's an array but not handled by the array case above, join values
              displayText = categoryData.map(item => 
                typeof item === 'object' && item !== null ? 
                  (item.name || String(item)) : 
                  String(item)
              ).join(', ');
            } else if (typeof categoryData === 'object') {
              // For objects not caught by previous checks
              displayText = String(categoryData);
            } else {
              // For primitives like string, number
              displayText = String(categoryData);
            }
            
            categoryContent = (
              <span className="text-xs font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                {displayText || 'Uncategorized'}
              </span>
            );
          } catch (error) {
            console.error('Error displaying category:', error);
            categoryContent = <span className="text-muted-foreground text-xs">Error</span>;
          }
        }
        // Fallback: Uncategorized
        else {
          categoryContent = <span className="text-muted-foreground text-xs">Uncategorized</span>;
        }
        
        // READ-ONLY VIEW: CATEGORY DISPLAY
        return (
          <div
            className="min-w-[180px] cursor-pointer p-1 hover:bg-muted rounded flex items-center"
            onClick={e => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'category', categoryId);
            }}
            tabIndex={0}
            role="button"
            aria-label="Edit category"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCellEdit(rowIndex, 'category', categoryId);
              }
            }}
          >
            {categoryContent}
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      // Use our custom categoryFilter registered in the table's filterFns
      filterFn: "categoryFilter" as any,
    },

    /**********  BRAND **************************************************/
    {
      accessorKey: "brand",
      size: 140,
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent w-full text-center"
          >
            <span className="w-full text-center block">Brand</span>
            {column.getIsSorted() === "asc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const rowIndex = row.index;
        const value = row.getValue("brand") as string || "";
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'brand';
        
        if (isEditing) {
          return (
            <div className="flex space-x-2 w-full p-1" onClick={(e) => e.stopPropagation()}>
              <Input
                className="h-8 w-full min-w-[120px]"
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveCellEdit}
              />
              <Button size="sm" variant="ghost" onClick={handleSaveCellEdit}>
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        
        return (
          <div 
            className="truncate lg:whitespace-normal cursor-pointer hover:text-primary transition-colors p-1 text-ellipsis whitespace-nowrap overflow-hidden"
            title={value || '—'}
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'brand', value);
            }}
            data-editable="true"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="editable-cell">{value.length > 18 ? `${value.slice(0,18)}…` : value || '—'}</span>
              </TooltipTrigger>
              <TooltipContent>Click to edit</TooltipContent>
            </Tooltip>
          </div>
        );
      },
      enableSorting: true,
    },
    /**********  TAGS **************************************************/
    {
      accessorKey: "tags",
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent w-full text-center"
          >
            <span className="w-full text-center block">Tags</span>
            {column.getIsSorted() === "asc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const rowIndex = row.index;
        // Handle tags which could be a string or array
        let tags: string[] = [];
        const rawTags = row.getValue("tags");
        
        // Safely parse tags from various formats
        if (Array.isArray(rawTags)) {
          tags = rawTags;
        } else if (typeof rawTags === 'string') {
          try {
            // Try to parse if it's a JSON string
            const parsed = JSON.parse(rawTags);
            tags = Array.isArray(parsed) ? parsed : [rawTags];
          } catch (e) {
            // If not valid JSON, treat as a single tag
            tags = [rawTags];
          }
        }
        
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'tags';
        // Map editValue (array of tag strings) to tag option objects for the select's value
        const editTagOptions: TagOption[] = Array.isArray(editValue)
          ? editValue.map(tag => {
              const existingOption = tagOptions.find(opt => opt.value === tag || opt.label === tag)
              if (existingOption) return existingOption
              return { label: tag, value: tag }
            })
          : []
        if (isEditing) {
          return (
            <div className="min-w-[240px] p-2 bg-white rounded shadow border" onClick={e => e.stopPropagation()} data-editing="true">
              <CreatableSelect
                isMulti
                autoFocus
                value={editTagOptions}
                options={tagOptions}
                onChange={(options: OnChangeValue<TagOption, true>) => {
                  // Handle options based on whether we need string or array format
                  const values = Array.isArray(options) ? options.map(opt => String(opt.value)) : []
                  
                  // Determine if we need JSON string or direct array based on current editValue type
                  if (typeof editValue === 'string') {
                    setEditValue(JSON.stringify(values))
                  } else {
                    setEditValue(values)
                  }
                }}
                onCreateOption={async (inputValue: string) => {
                  // Call handleCreateTagOption which now returns TagOption or null
                  const newOption = await handleCreateTagOption(inputValue);
                  
                  // Only proceed if we got a valid tag option back
                  if (newOption && newOption.value) {
                    // Parse current value from JSON string if it exists
                    const currentValues = editValue ? 
                      (typeof editValue === 'string' ? JSON.parse(editValue) : editValue) as string[] : 
                      [];
                    
                    // Update with new value and convert back to JSON string if needed
                    const newValues = [...currentValues, String(newOption.value)];
                    setEditValue(typeof editValue === 'string' ? JSON.stringify(newValues) : newValues);
                  }
                }}
                isClearable
                placeholder="Add or select tags..."
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 38 }) }}
                noOptionsMessage={() => 'No tags found'}
                formatCreateLabel={(inputValue: string) => `Create tag "${inputValue}"`}
              />
              <div className="flex gap-2 mt-3 justify-end">
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" variant="secondary" onClick={handleSaveCellEdit}>
                  Save
                </Button>
              </div>
            </div>
          )
        }
        // Non-editing mode: show tags as badges and a single + button
        return (
          <div className="flex flex-wrap gap-1 max-w-[220px] items-center">
            {tags && tags.length > 0 ? (
              tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs whitespace-nowrap">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-slate-400">No tags</span>
            )}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">+{tags.length - 3}</Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 ml-1" 
              aria-label="Edit tags"
              onClick={e => {
                e.stopPropagation();
                // Pass the actual array of tags instead of converting to a comma-separated string
                handleCellEdit(rowIndex, 'tags', JSON.stringify(tags));
              }}
            >
              <PlusIcon className="h-3 w-3" />
            </Button>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: (row: Row<Product>, columnId: string, filterValue: any): boolean => {
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) return true;
        
        // Get tags and normalize them
        let tags: string[] = [];
        const rawTags = row.getValue(columnId);
        
        // Safely parse tags from various formats
        if (Array.isArray(rawTags)) {
          tags = rawTags;
        } else if (typeof rawTags === 'string') {
          try {
            // Try to parse if it's a JSON string
            const parsed = JSON.parse(rawTags);
            tags = Array.isArray(parsed) ? parsed : [rawTags];
          } catch (e) {
            // If not valid JSON, treat as a single tag
            tags = [rawTags];
          }
        }
        
        if (!tags || tags.length === 0) return false;
        
        // Check if all filter tags are present in this product's tags
        return filterValue.every((filterTag: string) => 
          tags.some((tag: string) => String(tag).toLowerCase() === String(filterTag).toLowerCase())
        );
      }
    },
    /**********  BARCODE **************************************************/
    {
      accessorKey: "barcode",
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent w-full text-center"
          >
            <span className="w-full text-center block">GTIN</span>
            {column.getIsSorted() === "asc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const rowIndex = row.index;
        const value = row.getValue("barcode") as string || "";
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'barcode';
        
        if (isEditing) {
          return (
            <div className="flex space-x-2 w-full p-1" onClick={(e) => e.stopPropagation()} data-editing="true">
              <Input
                className="h-8 w-full min-w-[120px]"
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveCellEdit}
              />
              <Button size="sm" variant="ghost" onClick={handleSaveCellEdit}>
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        
        return (
          <div 
            className="truncate cursor-pointer hover:text-primary transition-colors font-mono text-sm p-1"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'barcode', value);
            }}
            data-editable="true"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="editable-cell">{value || "—"}</span>
              </TooltipTrigger>
              <TooltipContent>Click to edit</TooltipContent>
            </Tooltip>
          </div>
        );
      },
      enableSorting: true,
    },
    /**********  PRICE **************************************************/
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent w-full text-center"
        >
          <span className="w-full text-center block">Price</span>
          <ArrowUpDown className="ml-1 h-4 w-4 opacity-70" />
        </Button>
      ),
      cell: ({ row, column, table }) => {
        const rowIndex = row.index;
        const columnId = column.id;
        const isEditing =
          editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;
        
        // Check for multiple prices
        const hasPrices = row.original.prices && row.original.prices.length > 0;
        
        return isEditing ? (
          <div className="flex items-center">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editValue}
              onChange={handlePriceCellChange}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-20 h-8"
            />
            <div className="flex ml-1">
              <IconBtn
                tooltip="Save"
                icon={CheckIcon}
                onClick={handleSaveCellEdit}
              />
              <IconBtn
                tooltip="Cancel"
                icon={XIcon}
                onClick={handleCancelEdit}
              />
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              // Handle click to edit price
              if (hasPrices) {
                // Check for valid ID before navigation
                const productId = row.original.id;
                if (productId) {
                  // Redirect to pricing modal
                  navigate(`/app/products/${productId}/edit?tab=pricing`);
                }
              } else {
                // Only allow direct editing of the legacy price field if no prices array
                handleCellEdit(rowIndex, columnId, ((row.original as any).price || 0).toString());
              }
            }}
          >
            {hasPrices ? (
              <div className="px-1 py-1">
                {row.original.prices && row.original.prices.length > 0 
                  ? `${row.original.prices[0].currency} ${formatAmount(row.original.prices[0].amount)}`
                  : `$ ${formatAmount((row.original as any).price)}`}
                {row.original.prices && row.original.prices.length > 1 && (
                  <span className="ml-1 text-xs text-muted-foreground">+{row.original.prices.length - 1}</span>
                )}
              </div>
            ) : (
              <div className="px-1 py-1">${formatAmount((row.original as any).price)}</div>
            )}
          </div>
        );
      },
    },
    /**********  STATUS **************************************************/
    {
      accessorKey: "is_active",
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent w-full text-center"
          >
            <span className="w-full text-center block">Status</span>
            {column.getIsSorted() === "asc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        const productId = row.original.id;
        
        const handleToggleStatus = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (productId) {
            // Create a new product object with toggled status
            const updatedData = {
              is_active: !isActive
            };
            
            // Optimistically update UI
            safeUpdateProducts(setProducts, productId, p => ({ ...p, is_active: !isActive }));
            
            // Call API to update
            productService.updateProduct(productId, updatedData)
              .then(() => {
                toast({ title: `Product ${!isActive ? 'activated' : 'deactivated'}`, variant: 'default' });
              })
              .catch((error) => {
                toast({ title: 'Failed to update status', variant: 'destructive' });
                // Revert optimistic update
                safeCallFetchData(fetchData);
              });
          }
        };
        
        return (
          <div 
            className="cursor-pointer p-1"
            onClick={handleToggleStatus}
            data-editable="true"
          >
            <Badge 
              variant={isActive ? "default" : "secondary"} 
              className={`w-[80px] justify-center ${isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        );
      },
      enableSorting: true,
    },
    /**********  CREATED **************************************************/
    {
      accessorKey: "created_at",
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent w-full text-center"
          >
            <span className="w-full text-center block">Created</span>
            {column.getIsSorted() === "asc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const dateString = row.getValue("created_at") as string;
        
        if (!dateString) return "—";
        
        // Parse and format date
        const date = new Date(dateString);
        const formattedDate = `${date.toLocaleDateString()}`;
        
        return <div>{formattedDate}</div>;
      },
      sortingFn: 'datetime',
      enableSorting: true,
    },
    /**********  UPDATED **************************************************/
    {
      accessorKey: "updated_at",
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent w-full text-center"
          >
            <span className="w-full text-center block">Last Modify</span>
            {column.getIsSorted() === "asc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowUpDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const dateString = row.getValue("updated_at") as string;
        
        if (!dateString) return "—";
        
        // Parse and format date
        const date = new Date(dateString);
        const formattedDate = `${date.toLocaleDateString()}`;
        
        return <div>{formattedDate}</div>;
      },
      sortingFn: 'datetime',
      enableSorting: true,
    },
  ], [
    editingCell,
    editValue,
    tagOptions,
    categoryOptions,
    /* every handler/prop you reference inside the column cells */
    handleKeyDown,
    handlePriceCellChange,
    handleSaveCellEdit,
    handleCancelEdit,
    handleCellEdit,
    handleCreateTagOption,
    updateData,
    setCategoryOptions,
    setProducts,
    toast,
    navigate,
    handleRowClick,
    handleDelete,
  ]);

  /* -------- 2. sticky action column ----------------------- */
  const ACTION_W = 112;
  const actionColumn: ColumnDef<Product> = {
    id: "actions",
    size: ACTION_W,
    enableHiding: false,
    enableSorting: false,
    header: () => (
      <div className="sticky right-0 z-30 w-12 text-center py-1 text-xs font-medium bg-slate-100 border-l">
        Actions
      </div>
    ),
    cell: ({ row }) => {
      const id = row.original.id;
      if (!id) return null;
      return (
        <div className="sticky right-0 z-20 w-12 flex justify-center border-l bg-transparent">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-white shadow-sm py-1 px-0.5">
            <IconBtn
              tooltip="View"
              icon={EyeIcon}
              onClick={() => handleRowClick(id)}
            />
            <IconBtn
              tooltip="Edit"
              icon={PencilIcon}
              onClick={() => navigate(`/app/products/${id}/edit`)}
            />
            <IconBtn
              tooltip="Archive"
              icon={TrashIcon}
              onClick={() => handleDelete(id)}
            />
          </div>
        </div>
      );
    },
  };

  /* -------- 3. concat + return ---------------------------- */
  const allColumns = useMemo(
    () => [...columns, actionColumn],
    [columns, actionColumn]
  );

  return { columns, actionColumn, allColumns };
}

/* ---------------------------------------------------------- */
/*  END of hook                                               */
/* ---------------------------------------------------------- */
