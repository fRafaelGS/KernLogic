/* ---------------------------------------------------------- */
/*  src/hooks/useProductColumns.tsx                           */
/* ---------------------------------------------------------- */
import React, { useMemo } from "react";
import type { ColumnDef, Row, FilterFn } from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  CheckCircle,
  XCircle,
  FolderIcon,
  TagIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  type LucideIcon,
  InfoIcon,
} from "lucide-react";

import {
  TableHead,
  TableRow,
  TableCell, 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import type { OnChangeValue } from "react-select";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import {
  Product,
  ProductImage,
  productService,
} from "@/services/productService";
import { productService as ps } from "@/services/productService"; // alias
import { updateProductCategory, getCategories } from "@/services/categoryService"; // Import specific functions
import { normalizeCategory, Category } from '@/types/categories';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CategoryTreeSelect } from '@/components/categories/CategoryTreeSelect';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { formatPrice, getProductPriceDisplay } from "@/utils/formatPrice";
import { PriceSummaryBadge } from "@/components/products/PriceSummaryBadge";

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
  editValue: string;
  tagOptions: TagOption[];
  categoryOptions: CategoryOption[];

  /* --- setters that columns mutate --- */
  setEditValue(v: string): void;
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
  handleCreateTagOption(input: string): void;
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
      size: 36,
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
      size: 88,
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
        // Add a local images variable with correct typing
        const images = (row.original.images as ProductImage[]) || [];

        const primary =
          row.original.primary_image_thumb ||
          row.original.primary_image_large ||
          row.original.primary_image_url ||
          row.original.primary_image ||
          images.find(i => i.is_primary)?.url ||
          images[0]?.url;

        return (
          <div className="flex items-center space-x-2">
            {primary ? (
              <HoverCard>
                <HoverCardTrigger>
                  <img
                    src={primary}
                    alt={row.original.name}
                    className="h-14 w-14 rounded border object-cover"
                  />
                </HoverCardTrigger>
                <HoverCardContent className="p-2 w-80">
                  <img
                    src={primary}
                    alt={row.original.name}
                    className="w-full h-auto max-h-64 rounded"
                  />
                  <p className="mt-2 text-sm font-medium text-center">
                    {row.original.name}
                  </p>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <div className="h-14 w-14 flex flex-col items-center justify-center rounded border bg-gray-100">
                <ImageIcon className="h-6 w-6 text-slate-400" />
                <span className="text-xs text-slate-400">No Image</span>
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
          className="p-0 hover:bg-transparent"
        >
          <span>SKU</span>
          <ArrowUpDown className="ml-1 h-4 w-4 opacity-70" />
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
            {value}
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
          className="p-0 hover:bg-transparent"
        >
          <span>Name</span>
          <ArrowUpDown className="ml-1 h-4 w-4 opacity-70" />
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
            {value}
          </div>
        );
      },
      enableSorting: true,
    },

    /**********  CATEGORY **************************************************/
    {
      accessorKey: "category",
      size: 160,
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            <span>Category</span>
            <ArrowUpDown className="ml-1 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const rowIndex = row.index;
        const raw = row.getValue("category") as Category[] | Category | string;
        console.log('ProductTable categoryRaw:', raw);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'category';
        
        // Determine category ID for editing
        let categoryId = null;
        if (raw) {
          if (Array.isArray(raw) && raw.length > 0) {
            const leafCategory = raw[raw.length - 1];
            categoryId = leafCategory.id;
          } else if (typeof raw === 'object' && raw !== null) {
            categoryId = (raw as any).id;
          } else if (typeof raw === 'number') {
            categoryId = raw;
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
              />
            </div>
          );
        }
        
        // Read-only: show breadcrumb, and clicking the cell enters edit mode
        return (
          <div
            className="min-w-[180px] cursor-pointer p-1 hover:bg-muted rounded"
            title={Array.isArray(raw) ? raw.map(cat => (cat as any).name).join(' > ') : (typeof raw === 'object' && raw !== null && 'name' in raw ? (raw as any).name : raw || 'Uncategorized')}
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
            {Array.isArray(raw) && raw.length > 0 ? (
              <Breadcrumb>
                {raw.map((cat, i, arr) => (
                  <React.Fragment key={typeof cat === 'object' ? cat.id : i}>
                    <span className="truncate">{typeof cat === 'object' ? cat.name : cat}</span>
                    {i < arr.length - 1 && <span className="mx-1">&gt;</span>}
                  </React.Fragment>
                ))}
              </Breadcrumb>
            ) : typeof raw === 'object' && raw !== null && 'name' in raw ? (
              <span>{(raw as any).name}</span>
            ) : typeof raw === 'string' ? (
              <span>{raw}</span>
            ) : (
              <span className="text-muted-foreground">Uncategorized</span>
            )}
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
            className="p-0 hover:bg-transparent"
          >
            <span>Brand</span>
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
            {value.length > 18 ? `${value.slice(0,18)}…` : value || '—'}
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
            className="p-0 hover:bg-transparent"
          >
            <span>Tags</span>
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
        const tags = (row.getValue("tags") as string[] | undefined) || [];
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'tags';
        
        // Convert tag strings/IDs to options for react-select
        const currentTagOptions = tags.map(tag => {
          // Check if this tag exists in our tagOptions
          const existingOption = tagOptions.find(opt => opt.value === tag || opt.label === tag);
          if (existingOption) {
            return existingOption;
          }
          // If not found, create a new option
          return { label: tag, value: tag };
        });

        if (isEditing) {
          return (
            <div 
              className="min-w-[200px] p-1" 
              onClick={(e) => e.stopPropagation()}
              data-editing="true"
            >
              <div 
                className="flex flex-wrap gap-1 max-w-[150px] cursor-pointer group p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  // Start editing this cell
                  handleCellEdit(rowIndex, 'tags', tags.length > 0 ? tags.join(',') : '');
                }}
                data-editable="true"
              >
                {tags && tags.length > 0 ? (
                  <>
                    {tags.slice(0, 2).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs whitespace-nowrap">
                        {tag}
                      </Badge>
                    ))}
                    {tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{tags.length - 2}
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400 group-hover:text-primary transition-colors">
                    Add tags
                  </span>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCellEdit(rowIndex, 'tags', tags.length > 0 ? tags.join(',') : '');
                  }}
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        }
        
        return (
          <div 
            className="flex flex-wrap gap-1 max-w-[150px] cursor-pointer group p-1"
            onClick={(e) => {
              e.stopPropagation();
              // Start editing this cell
              handleCellEdit(rowIndex, 'tags', tags.length > 0 ? tags.join(',') : '');
            }}
            data-editable="true"
          >
            {tags && tags.length > 0 ? (
              <>
                {tags.slice(0, 2).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs whitespace-nowrap">
                    {tag}
                  </Badge>
                ))}
                {tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 2}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-slate-400 group-hover:text-primary transition-colors">
                Add tags
              </span>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleCellEdit(rowIndex, 'tags', tags.length > 0 ? tags.join(',') : '');
              }}
            >
              <PlusIcon className="h-3 w-3" />
            </Button>
          </div>
        );
      },
      enableSorting: true,
      // Add these properties to enable filtering
      enableColumnFilter: true,
      filterFn: (row: Row<Product>, columnId: string, filterValue: any): boolean => {
        // Skip if no filter value
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) return true;
        
        // Get tags from the row
        const tags = row.getValue(columnId) as any[];
        
        // If no tags, no match
        if (!tags || !Array.isArray(tags) || tags.length === 0) return false;
        
        // Check if ALL of the filter tags exist in the row's tags (AND logic)
        return filterValue.every(filterTag => 
          tags.some((tag: any) => {
            // Handle tag as string
            if (typeof tag === 'string') {
              return tag === filterTag;
            }
            
            // Handle tag as object
            if (tag && typeof tag === 'object') {
              const tagObj = tag as any;
              return (
                String(tagObj.id) === filterTag ||
                String(tagObj.name) === filterTag ||
                String(tagObj.value) === filterTag ||
                String(tagObj.label) === filterTag
              );
            }
            
            return false;
          })
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
            className="p-0 hover:bg-transparent"
          >
            <span>GTIN</span>
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
            {value || "—"}
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
          className="p-0 hover:bg-transparent"
        >
          <span>Price</span>
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
            onClick={() => {
              if (!hasPrices) {
                // Only allow direct editing of the legacy price field if no prices array
                handleCellEdit(rowIndex, columnId, row.original.price?.toString() || "0");
              }
            }}
          >
            {hasPrices ? (
              <PriceSummaryBadge product={row.original} />
            ) : (
              <div className="px-1 py-1">{formatPrice(row.original.price || 0)}</div>
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
            className="p-0 hover:bg-transparent"
          >
            <span>Status</span>
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
            setProducts(prev =>
              prev.map(p => (p.id === productId ? { ...p, is_active: !isActive } : p))
            );
            
            // Call API to update
            productService.updateProduct(productId, updatedData)
              .then(() => {
                toast({ title: `Product ${!isActive ? 'activated' : 'deactivated'}`, variant: 'default' });
              })
              .catch((error) => {
                toast({ title: 'Failed to update status', variant: 'destructive' });
                // Revert optimistic update
                fetchData();
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
            className="p-0 hover:bg-transparent"
          >
            <span>Created</span>
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
            className="p-0 hover:bg-transparent"
          >
            <span>Last Modify</span>
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
  const ACTION_W = 48;
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
