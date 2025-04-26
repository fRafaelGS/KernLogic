import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  SearchIcon,
  FilterIcon,
  MoreHorizontalIcon,
  EditIcon,
  TrashIcon,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ColumnsIcon,
  ChevronDown,
  ImageIcon,
  AlertTriangle,
  CheckIcon,
  XIcon,
  PlusIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { Product, productService, ProductImage } from "@/services/productService";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from '@/components/ui/use-toast';
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Define filter state type
interface FilterState {
  category: string;
  status: 'all' | 'active' | 'inactive';
  minPrice: string;
  maxPrice: string;
}

// Add useDebounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function ProductsTable() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms debounce
  
  // Add state to store the current product list with IDs for updates
  const [productRowMap, setProductRowMap] = useState<Record<number, number>>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = location;
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get('category') || 'all',
    status: (searchParams.get('status') as 'all' | 'active' | 'inactive') || 'all',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
  });

  // Add a new state for column ordering
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  // Create a sensors configuration for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px
      },
    })
  );

  // Add function to handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Update column order on drag completion
      setColumnOrder((prevOrder) => {
        const oldIndex = prevOrder.indexOf(active.id.toString());
        const newIndex = prevOrder.indexOf(over.id.toString());
        
        const newOrder = arrayMove(prevOrder, oldIndex, newIndex);
        // Save to session storage for persistence
        sessionStorage.setItem('productTableColumnOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  // Function to fetch products
  const fetchProducts = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use getProducts instead of getAllProducts
      const fetchedProducts = await productService.getProducts();
      setProducts(fetchedProducts);
      console.log('Fetched products:', fetchedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Replace filteredProducts with filteredData to avoid duplicate declaration
  const filteredData = useMemo(() => {
    let filtered = [...products];

    // Apply text search
    if (debouncedSearchTerm) {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(lowerSearchTerm) ||
        product.sku?.toLowerCase().includes(lowerSearchTerm) ||
        product.description?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Apply dropdown filters
    if (filters.category && filters.category !== 'all') {
      if (filters.category === 'uncategorized') {
        // Special case for uncategorized items
        filtered = filtered.filter(product => !product.category || product.category.trim() === '');
      } else {
        filtered = filtered.filter(product => product.category === filters.category);
      }
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(product => 
        filters.status === 'active' ? product.is_active : !product.is_active
      );
    }

    // Apply numeric range filters
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      if (!isNaN(min)) {
        filtered = filtered.filter(product => product.price >= min);
      }
    }
    
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      if (!isNaN(max)) {
        filtered = filtered.filter(product => product.price <= max);
      }
    }

    return filtered;
  }, [products, debouncedSearchTerm, filters]);

  // Update the productRowMap whenever the filtered products change
  useEffect(() => {
    const newMap: Record<number, number> = {};
    filteredData.forEach((product, index) => {
      if (product.id) {
        newMap[index] = product.id;
      }
    });
    setProductRowMap(newMap);
  }, [filteredData]);
  
  // Fetch products on mount and when auth changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  
  // Handle refresh button click
  const handleRefresh = () => {
    if (isAuthenticated) {
        console.log('Manually refreshing products list');
        setLoading(true);
        fetchProducts();
    } else {
        console.log('Manual refresh skipped, not authenticated.');
        toast({ title: 'Please log in to refresh products.', variant: 'default' });
    }
  };
  
  // Stabilize row action handlers with useCallback
  const startEditing = useCallback((rowIndex: number, columnId: string) => {
    setEditingCell({ rowIndex, columnId });
  }, []);
  
  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleEdit = useCallback((productId: number) => {
    navigate(`/app/products/${productId}/edit`);
  }, [navigate]);

  const handleDelete = useCallback(async (productId: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(productId);
        toast({ title: 'Product marked as inactive successfully', variant: 'default' });
        fetchProducts();
      } catch (error: any) {
        console.error('Error deleting product via service:', error);
        toast({ title: error.message || 'Failed to delete product', variant: 'destructive' });
      }
    }
  }, [fetchProducts]);

  const handleFilterToggle = useCallback(() => {
    setFilters(prev => ({ ...prev, category: 'all', status: 'all', minPrice: '', maxPrice: '' }));
  }, []);

  const handleFilterChange = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      category: 'all',
      status: 'all',
      minPrice: '',
      maxPrice: '',
    });
    
    // Update URL params without the cleared filters
    const params = new URLSearchParams(searchParams);
    params.delete('category');
    params.delete('status');
    params.delete('minPrice');
    params.delete('maxPrice');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // --- ADD Bulk Action Handlers (Placeholder/Assumed API) ---
  const handleBulkDelete = async () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows
      .map(r => r.original.id)
      .filter((id): id is number => typeof id === 'number');
      
    if (selectedIds.length === 0) {
        toast({ title: "No products selected for deletion.", variant: 'destructive' });
        return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} product(s)? This action might be irreversible.`)) {
      console.log("Attempting bulk delete for IDs:", selectedIds);
      try {
        // Placeholder: Replace with actual API call
        // await productService.deleteBulkProducts(selectedIds);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        toast({ title: `${selectedIds.length} product(s) deleted successfully (simulated).`, variant: 'default' });
        setRowSelection({}); // Clear selection
        fetchProducts(); // Refresh data
      } catch (error: any) {
        console.error("Bulk delete error:", error);
        toast({ title: error.message || "Failed to delete selected products.", variant: 'destructive' });
      }
    }
  };

  const handleBulkSetStatus = async (isActive: boolean) => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows
      .map(r => r.original.id)
      .filter((id): id is number => typeof id === 'number');

    if (selectedIds.length === 0) {
        toast({ title: `No products selected to mark as ${isActive ? 'active' : 'inactive'}.`, variant: 'destructive' });
        return;
    }
    
    const actionText = isActive ? 'active' : 'inactive';
    console.log(`Attempting to set status (${actionText}) for IDs:`, selectedIds);
    try {
      // Placeholder: Replace with actual API call
      // await productService.updateBulkProductStatus(selectedIds, isActive);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast({ title: `${selectedIds.length} product(s) marked as ${actionText} (simulated).`, variant: 'default' });
      setRowSelection({}); // Clear selection
      fetchProducts(); // Refresh data
    } catch (error: any) {
      console.error("Bulk status update error:", error);
      toast({ title: error.message || `Failed to update status for selected products.`, variant: 'destructive' });
    }
  };
  // --- End Bulk Action Handlers ---

  // --- Derived Data ---
  const uniqueCategories = useMemo(() => {
    // --- DEBUG LOGS ---
    console.log('[ProductsTable.useMemo uniqueCategories] Products value:', products);
    console.log('[ProductsTable.useMemo uniqueCategories] Is products an array?:', Array.isArray(products));
    // --- END DEBUG LOGS ---
    if (!Array.isArray(products)) {
        console.error('[ProductsTable.useMemo uniqueCategories] products is not an array!', products);
        return []; // Return empty array if not an array
    }
    
    // Create a set of all non-empty categories
    const categories = new Set(
      products
        .map(p => (p.category ?? '').trim())
        .filter(Boolean)            // removes '', null, undefined
    );
    
    return Array.from(categories);
  }, [products]);

  // Update the productRowMap whenever the filtered products change
  useEffect(() => {
    const newMap: Record<number, number> = {};
    filteredData.forEach((product, index) => {
      if (product.id) {
        newMap[index] = product.id;
      }
    });
    setProductRowMap(newMap);
  }, [filteredData]);
  
  // Update the updateData function to use the productRowMap instead of the table reference
  const updateData = useCallback(async (rowIndex: number, columnId: string, value: any) => {
    const productId = productRowMap[rowIndex];
    
    if (!productId) {
      console.error('Product ID not found for row:', rowIndex);
      return;
    }

    try {
      // Format the value based on the column type
      let formattedValue = value;
      
      // Special handling for different column types
      if (columnId === 'price') {
        formattedValue = parseFloat(value);
        if (isNaN(formattedValue) || formattedValue < 0) {
          toast({ title: 'Invalid price value', variant: 'destructive' });
          return;
        }
      } else if (columnId === 'is_active') {
        formattedValue = value === 'true' || value === true;
      }

      // Create update payload
      const updateData: Partial<Product> = {
        [columnId]: formattedValue,
      };

      // Optimistically update UI using ID instead of index
      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, [columnId]: formattedValue } : p))
      );

      console.log(`Updating product ${productId}, setting ${columnId} to`, formattedValue);

      // Save to API
      await productService.updateProduct(productId, updateData);
      
      toast({ title: `${columnId.charAt(0).toUpperCase() + columnId.slice(1)} updated`, variant: 'default' });
      setEditingCell(null); // Clear editing state
    } catch (error) {
      console.error('Failed to update product:', error);
      toast({ title: 'Failed to update product', variant: 'destructive' });
      
      // Revert optimistic update
      fetchProducts();
    }
  }, [fetchProducts, productRowMap, toast]);

  // Move the price cell input handler to avoid recreating it on each render
  const handlePriceCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and a single decimal point
    if (/^$|^[0-9]+(\.[0-9]*)?$/.test(value)) {
      setEditValue(value);
    }
  }, []);

  // Handle starting cell editing
  const handleCellEdit = useCallback((rowIndex: number, columnId: string, value: string) => {
    setEditingCell({ rowIndex, columnId });
    setEditValue(value);
  }, []);

  // Handle saving cell edit
  const handleSaveCellEdit = useCallback(() => {
    if (editingCell) {
      updateData(editingCell.rowIndex, editingCell.columnId, editValue);
    }
  }, [editingCell, editValue, updateData]);

  // Handle canceling cell edit
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Handle key press in editable cell
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveCellEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveCellEdit, handleCancelEdit]);

  // Stabilize column definitions with useMemo
  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center space-x-1">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="ml-1"
          />
          <Button
            variant="outline"
            className="h-8 capitalize ml-2"
            onClick={() => table.toggleAllPageRowsSelected(table.getIsAllPageRowsSelected() ? false : true)}
          >
            {table.getIsAllPageRowsSelected() ? "Deselect All" : "Select All"}
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="ml-1"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/app/products/${row.original.id}`);
            }}
          >
            <EditIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "thumbnail",
      header: ({column}) => {
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Image</span>
              {column.getIsSorted() === "asc" ? (
                <ArrowUpDown className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowUpDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />
              )}
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const images = row.original.images as ProductImage[] || [];
        const primaryImage = images.length > 0 ? images[0] : null;
        
        return (
          <div className="flex items-center space-x-2">
            {primaryImage ? (
              <HoverCard>
                <HoverCardTrigger>
                  <div className="h-16 w-16 rounded-md border overflow-hidden">
                    <img 
                      src={primaryImage.url} 
                      alt={row.original.name} 
                      className="h-full w-full object-cover hover:scale-110 transition duration-300"
                      loading="lazy"
                    />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="p-2 w-80">
                  <img 
                    src={primaryImage.url} 
                    alt={row.original.name} 
                    className="w-full h-auto max-h-64 rounded-md object-contain"
                  />
                  <p className="mt-2 text-sm font-medium text-center">{row.original.name}</p>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-slate-100">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>
        );
      },
      size: 120,
      enableSorting: true,
    },
    {
      accessorKey: 'sku',
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            <span>SKU</span>
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
      cell: ({ row, column, table }) => {
        const rowIndex = row.index;
        const value = row.getValue('sku') as string;
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'sku';
        
        return isEditing ? (
          <div className="flex space-x-2 w-full" onClick={(e) => e.stopPropagation()}>
            <Input
              className="h-8 w-full"
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
        ) : (
          <div
            className="truncate cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'sku', value);
            }}
          >
            {value}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'name',
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            <span>Name</span>
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
      cell: ({ row, column, table }) => {
        const rowIndex = row.index;
        const value = row.getValue('name') as string;
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'name';
        
        return isEditing ? (
          <div className="flex space-x-2 w-full" onClick={(e) => e.stopPropagation()}>
            <Input
              className="h-8 w-full"
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
        ) : (
          <div
            className="truncate cursor-pointer hover:text-primary transition-colors font-medium"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'name', value);
            }}
            data-editable="true"
          >
            {value}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "category",
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            <span>Category</span>
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
        const value = row.getValue("category") as string || "";
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'category';
        
        if (isEditing) {
          return (
            <div className="flex space-x-2 w-full" onClick={(e) => e.stopPropagation()}>
              <Select
                defaultValue={value}
                onValueChange={(newValue) => {
                  setEditValue(newValue);
                  setTimeout(() => handleSaveCellEdit(), 100);
                }}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="">Uncategorized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        }
        
        return (
          <div 
            className="w-[100px] truncate cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'category', value);
            }}
            data-editable="true"
          >
            {value || "—"}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "brand",
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
            <div className="flex space-x-2 w-full" onClick={(e) => e.stopPropagation()}>
              <Input
                className="h-8 w-full"
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
            className="w-[100px] truncate cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'brand', value);
            }}
            data-editable="true"
          >
            {value || "—"}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[] | undefined;
        
        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {tags && tags.length > 0 ? (
              tags.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs whitespace-nowrap">
                  {tag}
                </Badge>
              ))
            ) : (
              "—"
            )}
            {tags && tags.length > 2 && (
              <Badge variant="outline" className="text-xs">+{tags.length - 2}</Badge>
            )}
          </div>
        );
      },
    },
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
            <div className="flex space-x-2 w-full" onClick={(e) => e.stopPropagation()}>
              <Input
                className="h-8 w-full"
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
            className="truncate cursor-pointer hover:text-primary transition-colors font-mono text-sm"
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
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row, column, table }) => {
        const rowIndex = row.index;
        const value = row.getValue('price');
        const formattedValue = typeof value === 'number' ? value.toFixed(2) : '0.00';
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'price';

        return isEditing ? (
          <div className="flex space-x-2">
          <Input
              className="h-8 w-20"
              autoFocus
              value={editValue}
              onChange={handlePriceCellChange}
            onKeyDown={handleKeyDown}
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
            className="cursor-pointer hover:text-primary transition-colors"
            onClick={() => handleCellEdit(rowIndex, 'price', formattedValue)}
           >
            ${formattedValue}
          </div>
        );
      },
    },
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
        
        return (
          <div 
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (productId) {
                handleStatusChange(productId);
              }
            }}
            data-editable="true"
          >
            <Badge 
              variant={isActive ? "default" : "secondary"} 
              className={isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const dateString = row.getValue("created_at") as string;
        
        if (!dateString) return "—";
        
        // Parse and format date
        const date = new Date(dateString);
        const formattedDate = `${date.toLocaleDateString()}`;
        
        return <div>{formattedDate}</div>;
      },
    },
    {
      accessorKey: "updated_at",
      header: "Last Modify",
      cell: ({ row }) => {
        const dateString = row.getValue("updated_at") as string;
        
        if (!dateString) return "—";
        
        // Parse and format date
        const date = new Date(dateString);
        const formattedDate = `${date.toLocaleDateString()}`;
        
        return <div>{formattedDate}</div>;
      },
    },
  ], [
    editingCell, 
    editValue, 
    handleKeyDown, 
    handlePriceCellChange, 
    handleSaveCellEdit, 
    handleCancelEdit, 
    handleCellEdit,
    navigate
  ]);

  // Initialize column order from saved state or create default order
  useEffect(() => {
    // Only attempt to get column IDs if columns array has items
    if (columns.length === 0) return;
    
    const savedOrder = sessionStorage.getItem('productTableColumnOrder');
    if (savedOrder) {
      try {
        setColumnOrder(JSON.parse(savedOrder));
      } catch (e) {
        // If parsing fails, initialize with default order
        const defaultOrder = columns.map((column) => {
          // Safely access column id or accessorKey with type checking
          return column.id || 
            // @ts-ignore - handle accessorKey which may exist on some column types
            (column.accessorKey ? column.accessorKey.toString() : '');
        });
        setColumnOrder(defaultOrder);
      }
    } else {
      // No saved order, use default from columns
      const defaultOrder = columns.map((column) => {
        // Safely access column id or accessorKey with type checking
        return column.id || 
          // @ts-ignore - handle accessorKey which may exist on some column types
          (column.accessorKey ? column.accessorKey.toString() : '');
      });
      setColumnOrder(defaultOrder);
    }
  }, [columns]);

  // Configure the table with useReactTable
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
      rowSelection,
      columnOrder,
    },
    meta: {
      updateData,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Add missing handleRowClick function
  const handleRowClick = useCallback((productId: number) => {
    navigate(`/app/products/${productId}`);
  }, [navigate]);

  // Update toast calls to match the correct API
  const handleStatusChange = useCallback(async (productId: number) => {
    try {
      const currentProduct = products.find(p => p.id === productId);
      if (!currentProduct) return;
      
      toast({
        title: "Updating status...",
        description: "Please wait while we update the product status.",
      });
      
      const updatedProduct = await productService.updateProduct(productId, {
        ...currentProduct,
        is_active: !currentProduct.is_active
      });
      
      // Update product in local state
      setProducts(prevProducts => 
        prevProducts.map(p => p.id === productId ? updatedProduct : p)
      );
      
      toast({
        title: "Status updated",
        description: `Product status has been ${updatedProduct.is_active ? 'activated' : 'deactivated'}.`,
        variant: "default",
      });
    } catch (err) {
      console.error('Failed to update product status:', err);
      toast({
        title: "Error",
        description: "Failed to update product status. Please try again.",
        variant: "destructive",
      });
    }
  }, [products, toast]);

  // --- Render ---
  
  // --- DEBUGGING LOGS ---
  console.log('[ProductsTable Render] Loading:', loading);
  console.log('[ProductsTable Render] Products State:', products);
  console.log('[ProductsTable Render] Filtered Products:', filteredData);
  console.log('[ProductsTable Render] Table Row Count:', table.getRowModel().rows?.length);
  // --- END DEBUGGING LOGS ---

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-enterprise-400" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-9 border-enterprise-200 bg-white focus-visible:ring-primary-500 focus-visible:border-primary-500"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFilterToggle}
            className={cn(
              "border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50",
              table.getState().columnVisibility.category && "bg-enterprise-100 border-primary-300 text-primary-700"
            )}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Filter {table.getState().columnVisibility.category ? '(Hide)' : '(Show)'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50">
                <ColumnsIcon className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  // Custom display names for specific columns
                  let displayName = column.id.replace('_', ' ');
                  if (column.id === 'barcode') {
                    displayName = 'GTIN';
                  }
                  
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize cursor-pointer"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {displayName}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50 data-[state=open]:bg-enterprise-100 disabled:opacity-50 disabled:pointer-events-none"
                disabled={Object.keys(table.getState().rowSelection).length === 0} // Disable if no rows selected
               >
                Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuLabel>Actions ({Object.keys(table.getState().rowSelection).length} selected)</DropdownMenuLabel>
                <DropdownMenuSeparator />
              <DropdownMenuGroup>
                 <DropdownMenuItem
                   className="cursor-pointer text-enterprise-700 focus:bg-enterprise-50"
                   onClick={() => handleBulkSetStatus(true)}
                 >
                  Mark as Active
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   className="cursor-pointer text-enterprise-700 focus:bg-enterprise-50"
                    onClick={() => handleBulkSetStatus(false)}
                  >
                   Mark as Inactive
                 </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-danger-600 focus:text-danger-700 focus:bg-danger-50"
                onClick={handleBulkDelete}
              >
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-start sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-primary-600 hover:bg-primary-700 text-white"
            asChild
          >
            <Link to="/app/products/new">
              <span className="flex items-center">
                <span className="h-4 w-4 mr-2">+</span>
                Add Product
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Display Error Banner */}
      {error && (
        <div className="bg-danger-50 text-danger-700 p-4 rounded-lg border border-danger-200 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <div className="font-medium">{error}</div>
          </div>
        </div>
      )}

      {/* Filter Panel (Animated) */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          table.getState().columnVisibility.category ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="bg-enterprise-50 border border-enterprise-200 rounded-lg p-4 mb-6">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value as 'all' | 'active' | 'inactive')}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {uniqueCategories
                    .filter(category => category !== null && category !== '') // Filter out null/empty from the dropdown
                    .map((category) => (
                      <SelectItem key={category} value={category || ""}>
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => 
                  handleFilterChange('status', value as 'all' | 'active' | 'inactive')
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Price Range</Label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Filter Actions */}
          <div className="flex justify-end mt-4 pt-4 border-t border-enterprise-200">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters}
              className="text-enterprise-700 hover:bg-enterprise-100"
            >
              Clear Filters
            </Button>
            {/* No Apply button needed as filtering is live */}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {/* Selected Row Count Info */}         
        {Object.keys(table.getState().rowSelection).length > 0 && (
           <div className="px-4 py-2 text-sm text-slate-600 border-b bg-slate-100 font-medium">
               {table.getFilteredSelectedRowModel().rows.length} of{" "}
               {table.getFilteredRowModel().rows.length} row(s) selected.
           </div>
        )}
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columnOrder}
              strategy={horizontalListSortingStrategy}
            >
              <Table className="w-full">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-slate-100 border-b border-slate-200 hover:bg-slate-200">
                      {headerGroup.headers.map((header) => {
                        // Create a sortable header component
                        const id = header.column.id;
                        
                        return (
                          <SortableTableHeader
                            key={header.id}
                            id={id}
                            header={header}
                          />
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Skeleton Loading Rows
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`} className="border-b border-slate-100 bg-white">
                        {columns.map((column, colIndex) => (
                          <TableCell key={`skeleton-${index}-${column.id || colIndex}`} className="px-4 py-4">
                            <Skeleton className="h-4 w-4/5" /> 
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredData.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                      // Access the id once outside JSX to avoid potential issues
                      const productId = row.original.id;
                      
                      return (
                        <TableRow 
                          key={row.id} 
                          data-state={row.getIsSelected() && "selected"}
                          className={cn(
                            "border-b border-slate-100 transition-colors min-h-[72px] cursor-pointer",
                            row.getIsSelected() ? "bg-slate-50" : "bg-white hover:bg-slate-50"
                          )}
                          onClick={(e) => {
                            // Only navigate if the click wasn't on an interactive element
                            const target = e.target as HTMLElement;
                            const isActionClick = !!target.closest('button, input, [role="combobox"], [data-editable="true"]');
                            if (!isActionClick && productId) {
                              handleRowClick(productId);
                            }
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  ) : (
                    // Empty State
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 py-8">
                          {(!debouncedSearchTerm && !Object.values(filters).some(v => v !== 'all' && v !== '')) ? (
                            // No filters applied - empty product list
                            <>
                              <p className="text-slate-500">No products available yet</p>
                              <Button
                                size="sm"
                                className="bg-primary-600 hover:bg-primary-700 text-white"
                                asChild
                              >
                                <Link to="/app/products/new">
                                  <span className="flex items-center">
                                    <span className="h-4 w-4 mr-2">+</span>
                                    Add Your First Product
                                  </span>
                                </Link>
                              </Button>
                            </>
                          ) : (
                            // Filters applied - no matching results
                            <>
                              <p className="text-slate-500">No products match your search criteria</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleClearFilters}
                                className="text-slate-700 hover:bg-slate-100"
                              >
                                Clear Filters
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={loading}
                            className="border-slate-200 text-slate-700"
                          >
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Results
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        </div>
        {filteredData.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>Showing</span>
                <span className="font-medium">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </span>
                <span>to</span>
                <span className="font-medium">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    filteredData.length
                  )}
                </span>
                <span>of</span>
                <span className="font-medium">{filteredData.length}</span>
                <span>results</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex items-center mr-2">
                  <Label htmlFor="per-page" className="mr-2 text-xs text-slate-600">
                    Items per page:
                  </Label>
                  <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger
                      id="per-page"
                      className="h-8 w-20 border-slate-200 bg-white text-slate-800"
                    >
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-slate-200 text-slate-700"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-slate-200 text-slate-700"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-slate-200 text-slate-700"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-slate-200 text-slate-700"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-xs text-slate-500">
                  Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Debug info - only show in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-4 text-xs text-enterprise-400">
          <p>Products count: {products.length}</p>
        </div>
      )}
    </div>
  );
}

// ProductThumbCell component
const ProductThumbCell: React.FC<{ product: Product }> = ({ product }) => {
  // Get primary image or first image, or use the new primary_image_thumb field if available
  const images = product.images;
  const primaryImage = images?.find(img => img.is_primary) || images?.[0];
  
  // Use dedicated thumbnail fields if available, otherwise fall back to the full image
  const thumbUrl = product.primary_image_thumb || primaryImage?.url;
  const largeUrl = product.primary_image_large || primaryImage?.url;
  
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="pl-2">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={product.name}
              loading="lazy"
              className="h-16 w-16 rounded-sm object-contain hover:scale-105 transition-all duration-200"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-slate-100">
              <ImageIcon className="h-6 w-6 text-slate-400" />
            </div>
          )}
        </div>
      </HoverCardTrigger>
      
      {thumbUrl && (
        <HoverCardContent
          side="right"
          align="start"
          className="w-[320px] p-2"
        >
          <img
            src={largeUrl}
            alt={product.name}
            className="h-[280px] w-full object-contain rounded"
          />
          <p className="mt-2 text-sm text-center font-medium">{product.name}</p>
        </HoverCardContent>
      )}
    </HoverCard>
  );
};

// Add a SortableTableHeader component
interface SortableTableHeaderProps {
  header: any; // Replace with correct type
  id: string;
}

const SortableTableHeader = ({ header, id }: SortableTableHeaderProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className="px-4 py-3 font-medium text-slate-700"
      {...attributes}
      {...listeners}
    >
      {header.isPlaceholder
        ? null
        : flexRender(
            header.column.columnDef.header,
            header.getContext()
          )}
    </TableHead>
  );
};
