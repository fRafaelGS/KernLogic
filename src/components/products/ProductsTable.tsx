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
  Header,
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
  ArrowUp,
  ArrowDown,
  ChevronUp,
  Filter,
  MoreVertical,
  Cloud,
  CheckCircle,
  XCircle,
  EyeIcon,
  PencilIcon,
  TagIcon,
  FolderIcon,
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
import { useLayoutEffect } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import AsyncCreatableSelect from 'react-select/async-creatable';
import { ActionMeta, OnChangeValue } from 'react-select';
import { ProductsSearchBox } from './ProductsSearchBox';
import { BulkCategoryModal } from './BulkCategoryModal';
import { BulkTagModal } from './BulkTagModal';

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

// SortableTableHeader component for handling sorting
interface SortableTableHeaderProps {
  id: string;
  header: Header<Product, unknown>;
}

const SortableTableHeader = ({ id, header }: SortableTableHeaderProps) => {
  const column = header.column;
  const isSorted = column.getIsSorted();
  
  // Skip sort UI for select column
  if (id === 'select') {
    return (
      <TableHead key={header.id} className="p-2 w-10 bg-gray-100 font-semibold">
        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
      </TableHead>
    );
  }
  
  // Get sort icon
  const getSortIcon = () => {
    if (!isSorted) return null;
    return isSorted === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Use tailwind classes for mobile responsiveness
  const hideOnMobileClass = ['brand', 'barcode', 'created_at', 'tags'].includes(id) ? 'hidden md:table-cell' : '';
  
  return (
    <TableHead
      key={header.id}
      className={`px-2 py-2 ${hideOnMobileClass} bg-gray-100 text-gray-700 font-semibold text-sm tracking-wide border-b border-gray-200 text-left whitespace-nowrap`}
      onClick={column.getCanSort() ? column.getToggleSortingHandler() : undefined}
    >
      <div className="flex items-center">
        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        {column.getCanSort() && (
          <div className="flex items-center">
            {getSortIcon()}
          </div>
        )}
      </div>
    </TableHead>
  );
};

interface TableFallbackProps {
  columns: ColumnDef<Product>[];
  loading: boolean;
  filteredData: Product[];
  debouncedSearchTerm: string;
  filters: FilterState;
  handleClearFilters: () => void;
  handleRefresh: () => void;
}

const TableFallback = ({
  columns,
  loading,
  filteredData,
  debouncedSearchTerm,
  filters,
  handleClearFilters,
  handleRefresh
}: TableFallbackProps) => {
  if (loading) {
    return (
      <>
        {/* Skeleton Loading Rows with reduced padding */}
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={`skeleton-${index}`} className="border-b border-slate-100 bg-white h-8">
            {columns.map((column, colIndex) => {
              // Add mobile responsiveness to table cells
              const columnId = column.id || 
                // Access accessorKey safely with a type assertion
                (column as any).accessorKey?.toString() || '';
              const hideOnMobileClass = ['brand', 'barcode', 'created_at', 'tags'].includes(columnId) ? 'hidden md:table-cell' : '';
              
              return (
                <TableCell key={`skeleton-${index}-${columnId || colIndex}`} className={`px-2 py-1 ${hideOnMobileClass}`}>
                  <Skeleton className="h-4 w-4/5" /> 
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </>
    );
  }
  
  if (filteredData.length === 0) {
    return (
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
    );
  }
  
  return null;
};

// Add type for category options
interface CategoryOption {
  label: string;
  value: number | string; // Allow string ID if backend uses it
}

// Add type for raw category data from API
interface Category {
  id: number | string;
  name: string;
  // Add other category fields if they exist
}

export function ProductsTable() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]); // State for formatted options
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms debounce
  
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

  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((prevOrder) => {
        const oldIndex = prevOrder.indexOf(active.id.toString());
        const newIndex = prevOrder.indexOf(over.id.toString());
        const newOrder = arrayMove(prevOrder, oldIndex, newIndex);
        sessionStorage.setItem('productTableColumnOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  // Function to fetch products and categories
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    
    try {
      console.log('[ProductsTable] Fetching data, auth status:', isAuthenticated);
      
      // Make the requests one at a time to avoid race conditions
      let fetchedProducts: Product[] = [];
      let fetchedCategories: Category[] = [];
      
      try {
        // Explicitly set fetchAll to true to get all products across all pages
        fetchedProducts = await productService.getProducts({}, true);
        console.log('[ProductsTable] Fetched products:', fetchedProducts.length);
        // Guard against non-array responses
        if (!Array.isArray(fetchedProducts)) {
          console.error('[ProductsTable] Products response is not an array:', fetchedProducts);
          fetchedProducts = [];
        }
      } catch (productsError) {
        console.error('[ProductsTable] Error fetching products:', productsError);
        // Don't throw, continue to fetch categories
        fetchedProducts = [];
      }
      
      try {
        fetchedCategories = await productService.getCategories();
        console.log('[ProductsTable] Fetched categories:', fetchedCategories);
        // Guard against non-array responses
        if (!Array.isArray(fetchedCategories)) {
          console.error('[ProductsTable] Categories response is not an array:', fetchedCategories);
          fetchedCategories = [];
        }
      } catch (categoriesError) {
        console.error('[ProductsTable] Error fetching categories:', categoriesError);
        // Don't throw, continue with empty categories
        fetchedCategories = [];
      }
      
      // Update state with whatever data we managed to get
      setProducts(fetchedProducts);
      const categoryOpts = fetchedCategories.map(c => ({ 
        label: typeof c === 'object' ? c.name : c,
        value: typeof c === 'object' ? c.id : c
      }));
      setCategoryOptions(categoryOpts);
      
      // Log success
      console.log('[ProductsTable] Data fetch completed successfully');
      
    } catch (err) {
      console.error('[ProductsTable] Error in fetchData:', err);
      setError('Failed to fetch data');
      // Don't logout the user, let them retry
      toast({ 
        title: 'Could not load products',
        description: 'Please try refreshing the page',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Re-introduce filteredData calculation
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

  // Fetch data on mount and when auth changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refresh button click
  const handleRefresh = () => {
    if (isAuthenticated) {
        console.log('Manually refreshing data');
        setLoading(true);
        fetchData();
    } else {
        console.log('Manual refresh skipped, not authenticated.');
        toast({ title: 'Please log in to refresh data.', variant: 'default' });
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
    if (window.confirm('Are you sure you want to archive this product?')) {
      try {
        await productService.deleteProduct(productId);
        toast({ title: 'Product marked as inactive successfully', variant: 'default' });
        fetchData();
      } catch (error: any) {
        console.error('Error deleting product via service:', error);
        toast({ title: error.message || 'Failed to archive product', variant: 'destructive' });
      }
    }
  }, [fetchData]);

  // Update the handleFilterToggle function to toggle filtersVisible
  const handleFilterToggle = useCallback(() => {
    setFiltersVisible(prev => !prev);
    // Add more visibility logic if needed for specific filter sections
    console.log("Filter visibility toggled:", !filtersVisible);
  }, [filtersVisible]);

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
    const selectedIds = Object.keys(rowSelection)
      .map(index => productRowMap[parseInt(index)])
      .filter((id): id is number => typeof id === 'number');
      
    if (selectedIds.length === 0) {
      toast({ title: "No products selected for deletion.", variant: 'destructive' });
      return;
    }

    if (window.confirm(`Are you sure you want to archive ${selectedIds.length} product(s)? This action is reversible from the admin panel.`)) {
      try {
        await productService.bulkDelete(selectedIds);
        toast({ title: `${selectedIds.length} product(s) archived successfully.`, variant: 'default' });
        setRowSelection({}); // Clear selection
        fetchData(); // Refresh data
      } catch (error: any) {
        console.error("Bulk delete error:", error);
        toast({ 
          title: "Failed to archive selected products.", 
          description: error.message || "An unexpected error occurred.",
          variant: 'destructive' 
        });
      }
    }
  };

  const handleBulkSetStatus = async (isActive: boolean) => {
    const selectedIds = Object.keys(rowSelection)
      .map(index => productRowMap[parseInt(index)])
      .filter((id): id is number => typeof id === 'number');

    if (selectedIds.length === 0) {
      toast({ 
        title: `No products selected to mark as ${isActive ? 'active' : 'inactive'}.`, 
        variant: 'destructive' 
      });
      return;
    }
    
    const actionText = isActive ? 'active' : 'inactive';
    try {
      await productService.bulkSetStatus(selectedIds, isActive);
      toast({ title: `${selectedIds.length} product(s) marked as ${actionText}.`, variant: 'default' });
      setRowSelection({}); // Clear selection
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error("Bulk status update error:", error);
      toast({ 
        title: `Failed to update status for selected products.`,
        description: error.message || "An unexpected error occurred.",
        variant: 'destructive' 
      });
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
      fetchData();
    }
  }, [fetchData, productRowMap, toast]);

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
      // Special handling for tags - convert comma-separated string to array
      if (editingCell.columnId === 'tags') {
        const tagsArray = editValue
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean); // Remove empty strings
        updateData(editingCell.rowIndex, editingCell.columnId, tagsArray);
      } else {
        updateData(editingCell.rowIndex, editingCell.columnId, editValue);
      }
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

  // Handle row click for navigation to product detail - MOVED HERE BEFORE COLUMNS DEFINITION
  const handleRowClick = useCallback((productId: number) => {
    navigate(`/app/products/${productId}`);
  }, [navigate]);

  // Add state for tag options
  const [tagOptions, setTagOptions] = useState<{ label: string; value: string }[]>([]);

  // Fetch tags on component mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await productService.searchTags("");
        setTagOptions(tags);
      } catch (error) {
        console.error("Failed to load tags:", error);
      }
    };
    loadTags();
  }, []);

  // Improve the function to handle tag creation for inline editing
  const handleCreateTagOption = useCallback(async (inputValue: string) => {
    if (!inputValue) return;
    try {
      const newTag = await productService.createTag({ name: inputValue });
      const newOption = { label: newTag.name, value: newTag.id };
      
      // Add to options state
      setTagOptions((prev) => {
        // Avoid duplicates
        if (prev.some(tag => tag.value === newTag.id)) {
          return prev;
        }
        return [...prev, newOption];
      });
      
      // If currently editing tags, update the current product
      if (editingCell && editingCell.columnId === 'tags') {
        const productId = productRowMap[editingCell.rowIndex];
        const product = products.find(p => p.id === productId);
        
        if (product) {
          const currentTags = [...(product.tags || [])];
          // Add the new tag if it's not already there
          if (!currentTags.includes(newTag.id)) {
            updateData(editingCell.rowIndex, 'tags', [...currentTags, newTag.id]);
          }
        }
      }
      
      // Show success message
      toast({ title: `Tag "${inputValue}" created`, variant: "default" });
      
      return newOption;
    } catch (error) {
      console.error("Error creating tag:", error);
      toast({ title: 'Failed to create tag', variant: 'destructive' });
    }
  }, [editingCell, productRowMap, products, updateData, toast]);

  // Stabilize column definitions with useMemo
  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      id: "select",
      size: 36,            // 36 px  (just fits the checkbox)
      header: ({ table }) => (
        <div className="px-1">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-0 text-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "thumbnail",
      size: 88,            // cut gap; image is 64 px + 12 px padding
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
        // First check for primary image URLs directly on the product
        const primaryImageUrl = row.original.primary_image_thumb || row.original.primary_image_large;
        
        // Then find a primary image in the images array as a fallback
        const primaryImageFromArray = images.find(img => img.is_primary) || (images.length > 0 ? images[0] : null);
        
        return (
          <div className="flex items-center space-x-2">
            {primaryImageUrl ? (
              <HoverCard>
                <HoverCardTrigger>
                  <div className="h-14 w-14 rounded-md border overflow-hidden">
                    <img 
                      src={primaryImageUrl} 
                      alt={row.original.name} 
                      className="h-full w-full object-cover hover:scale-110 transition duration-300"
                      loading="lazy"
                    />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="p-2 w-80">
                  <img 
                    src={primaryImageUrl} 
                    alt={row.original.name} 
                    className="w-full h-auto max-h-64 rounded-md object-contain"
                  />
                  <p className="mt-2 text-sm font-medium text-center">{row.original.name}</p>
                </HoverCardContent>
              </HoverCard>
            ) : primaryImageFromArray ? (
              <HoverCard>
                <HoverCardTrigger>
                  <div className="h-14 w-14 rounded-md border overflow-hidden">
                    <img 
                      src={primaryImageFromArray.url} 
                      alt={row.original.name} 
                      className="h-full w-full object-cover hover:scale-110 transition duration-300"
                      loading="lazy"
                    />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="p-2 w-80">
                  <img 
                    src={primaryImageFromArray.url} 
                    alt={row.original.name} 
                    className="w-full h-auto max-h-64 rounded-md object-contain"
                  />
                  <p className="mt-2 text-sm font-medium text-center">{row.original.name}</p>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-gray-100 backdrop-blur-sm">
                <div className="flex flex-col items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-slate-400" />
                  <span className="text-xs text-slate-400 mt-1">No Image</span>
                </div>
              </div>
            )}
          </div>
        );
      },
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
        ) : (
          <div
            className="truncate cursor-pointer hover:text-primary transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'sku', value);
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
      accessorKey: 'name',
      size: 260,          // plenty for most names
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
          <div className="flex space-x-2 w-full p-1" onClick={(e) => e.stopPropagation()}>
            <Input
              className="h-8 w-full min-w-[150px]"
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
            className="truncate lg:whitespace-normal cursor-pointer hover:text-primary transition-colors font-medium p-1"
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
      size: 160,
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
        const categoryValue = row.getValue("category") as string | undefined;
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'category';
        
        // Find the current option object for the select value
        const currentOption = categoryOptions.find(opt => opt.label === categoryValue) || 
                             (categoryValue ? { label: categoryValue, value: categoryValue } : null);

        if (isEditing) {
          return (
            <div className="min-w-[150px] p-1" onClick={(e) => e.stopPropagation()}>
              <AsyncCreatableSelect
                cacheOptions
                defaultOptions={categoryOptions} // Show initially fetched categories
                loadOptions={productService.searchCategories} // Function to search server-side
                onCreateOption={async (inputValue) => {
                  if (!inputValue) return;
                  try {
                    const newCategory = await productService.createCategory({ name: inputValue });
                    const newOption = { label: newCategory.name, value: newCategory.id };
                    setCategoryOptions((prev) => [...prev, newOption]);
                    // Update the cell value immediately
                    updateData(rowIndex, 'category', newCategory.name); // Update with name or ID based on backend
                  } catch (error) {
                     console.error("Error creating category:", error);
                     toast({ title: 'Failed to create category', variant: 'destructive' });
                  }
                }}
                onChange={(newValue: OnChangeValue<CategoryOption, false>) => {
                  if (newValue) {
                    updateData(rowIndex, 'category', newValue.label); // Update with label or value based on backend
                  }
                }}
                value={currentOption}
                placeholder="Search or create..."
                // Add styling if needed
              />
            </div>
          );
        }
        
        return (
          <div 
            className="truncate lg:whitespace-normal cursor-pointer hover:text-primary transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'category', categoryValue || '');
            }}
            data-editable="true"
          >
            {categoryValue || "Uncategorized"}
          </div>
        );
      },
      enableSorting: true,
    },
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
            className="truncate lg:whitespace-normal cursor-pointer hover:text-primary transition-colors p-1"
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
            <div className="min-w-[200px] p-1" onClick={(e) => e.stopPropagation()}>
              <AsyncCreatableSelect
                isMulti
                cacheOptions
                defaultOptions={tagOptions} // Use loaded tagOptions 
                loadOptions={productService.searchTags}
                onCreateOption={handleCreateTagOption}
                onChange={(newValue: OnChangeValue<{ label: string; value: string }, true>) => {
                  const newTags = newValue ? newValue.map(option => option.value) : [];
                  updateData(rowIndex, 'tags', newTags);
                }}
                value={currentTagOptions}
                placeholder="Add or create tags..."
                className="min-w-[200px]"
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
              />
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
    {
      accessorKey: 'price',
      header: ({column}) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            <span>Price</span>
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
        const value = row.getValue('price');
        const formattedValue = typeof value === 'number' ? value.toFixed(2) : '0.00';
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === 'price';

        return isEditing ? (
          <div className="flex space-x-2 p-1" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full min-w-[100px]">
              <span className="absolute left-2 top-1/2 -translate-y-1/2">$</span>
              <Input
                className="h-8 w-full pl-6"
                autoFocus
                value={editValue}
                onChange={handlePriceCellChange}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveCellEdit}
              />
            </div>
            <Button size="sm" variant="ghost" onClick={handleSaveCellEdit}>
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div 
            className="cursor-pointer hover:text-primary transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation();
              handleCellEdit(rowIndex, 'price', formattedValue);
            }}
            data-editable="true"
          >
            ${formattedValue}
          </div>
        );
      },
      enableSorting: true,
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
    handleKeyDown, 
    handlePriceCellChange, 
    handleSaveCellEdit, 
    handleCancelEdit, 
    handleCellEdit,
    navigate,
    categoryOptions,
    handleCreateTagOption,
    handleRowClick, // Add dependency for the action handling
    handleDelete // Add dependency for delete action
  ]);

  // Action column definition
  const actionColumn: ColumnDef<Product> = {
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    size: 110,           // keeps icons + shadow but a bit tighter
    meta: {
      className: "sticky right-0 bg-white shadow-md z-10", // Make the column sticky
    },
    header: () => (
      <div className="text-right px-2 sticky right-0 bg-white shadow-md border-l border-gray-200 z-20">
        Actions
      </div>
    ),
    cell: ({ row }) => {
      const productId = row.original.id;
      
      if (!productId) return null;
      
      return (
        <div className="flex justify-end gap-2 pr-2 sticky right-0 bg-white shadow-md z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              if (productId) handleRowClick(productId);
            }}
            title="View"
          >
            <EyeIcon className="h-4 w-4 text-gray-500 hover:text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              if (productId) navigate(`/app/products/${productId}/edit`);
            }}
            title="Edit"
          >
            <PencilIcon className="h-4 w-4 text-gray-500 hover:text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              if (productId) handleDelete(productId);
            }}
            title="Archive"
          >
            <TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-600" />
          </Button>
        </div>
      );
    },
  };

  // Combine the columns with the action column - MOVED HERE RIGHT AFTER BOTH DEPENDENCIES ARE DEFINED
  const allColumns = useMemo(() => [...columns, actionColumn], [columns, actionColumn]);

  // Initialize column order from saved state or create default order
  useEffect(() => {
    // Only attempt to get column IDs if columns array has items
    if (columns.length === 0) return;
    
    const loadUserPreferences = () => {
      try {
        // Load column order
        const savedOrder = localStorage.getItem('productTableColumnOrder');
        if (savedOrder) {
          try {
            const parsedOrder = JSON.parse(savedOrder);
            // Validate that parsedOrder is an array and filter out any null/undefined values
            if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
              setColumnOrder(parsedOrder.filter(Boolean));
            } else {
              // Fall back to default if saved order is invalid
              createDefaultOrder();
            }
          } catch (e) {
            console.error('Error parsing columnOrder from localStorage:', e);
            createDefaultOrder();
          }
        } else {
          createDefaultOrder();
        }
        
        // Load column visibility
        const savedVisibility = localStorage.getItem('productTableColumnVisibility');
        if (savedVisibility) {
          setColumnVisibility(JSON.parse(savedVisibility));
        }
        
        // Load page size
        const savedPageSize = localStorage.getItem('productTablePageSize');
        if (savedPageSize) {
          setPagination(prev => ({
            ...prev,
            pageSize: parseInt(savedPageSize, 10)
          }));
        }
      } catch (e) {
        console.error('Error loading user preferences:', e);
        createDefaultOrder();
      }
    };
    
    const createDefaultOrder = () => {
      // Initialize with default order
      const defaultOrder = columns
        .map((column) => {
          return column.id || 
            // @ts-ignore - handle accessorKey which may exist on some column types
            (column.accessorKey ? column.accessorKey.toString() : '');
        })
        .filter(Boolean); // Filter out any null or empty strings
      
      setColumnOrder(defaultOrder);
    };
    
    loadUserPreferences();
  }, [columns]);

  // Configure the table with useReactTable
  const table = useReactTable({
    data: filteredData,
    columns: allColumns, // Use allColumns instead of columns
    defaultColumn: {            // 👈 add this block
      minSize: 80,              // every column can shrink to 80 px
      size: 150,                // …but starts at 150 px
      maxSize: 500,
    },
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

  // Add column filter state and handlers
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({});

  // Handle column filter change
  const handleColumnFilterChange = useCallback((columnId: string, value: any) => {
    setColumnFilterValues(prev => ({
      ...prev,
      [columnId]: value
    }));
    
    // Update the table filter state
    table.setColumnFilters(prev => {
      const existing = prev.find(filter => filter.id === columnId);
      if (!value) {
        // Remove filter if value is empty
        return prev.filter(filter => filter.id !== columnId);
      }
      
      if (existing) {
        // Update existing filter
        return prev.map(filter => 
          filter.id === columnId ? { id: columnId, value } : filter
        );
      }
      
      // Add new filter
      return [...prev, { id: columnId, value }];
    });
  }, [table]);

  // Save user preferences when they change
  useEffect(() => {
    // Save column order
    localStorage.setItem('productTableColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  useEffect(() => {
    // Save column visibility
    localStorage.setItem('productTableColumnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    // Save page size
    localStorage.setItem('productTablePageSize', JSON.stringify(pagination.pageSize));
  }, [pagination.pageSize]);

  // This useEffect will log when row selection changes
  useEffect(() => {
    console.log("Row selection changed:", Object.keys(rowSelection).length, "rows selected");
  }, [rowSelection]);

  // Add these new state variables for modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  
  // Modal handlers
  const openBulkCategoryModal = useCallback(() => {
    setShowCategoryModal(true);
  }, []);
  
  const openBulkTagModal = useCallback(() => {
    setShowTagModal(true);
  }, []);
  
  // Get selected product IDs helper
  const getSelectedProductIds = useCallback(() => {
    return Object.keys(rowSelection)
      .map(index => productRowMap[parseInt(index)])
      .filter((id): id is number => typeof id === 'number');
  }, [rowSelection, productRowMap]);

  return (
    <React.Fragment>
      <div className="w-full h-full flex flex-col mx-auto max-w-screen-2xl px-2 lg:px-4">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-1 px-1 border-b gap-1 sm:gap-1">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <ProductsSearchBox
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full"
              />
            </div>
            <Button 
              variant={filtersVisible ? "primary" : "outline"} 
              size="sm" 
              onClick={handleFilterToggle}
              className={filtersVisible ? "text-white" : ""}
            >
              <FilterIcon className="mr-2 h-4 w-4" />
              Filter {filtersVisible ? "(on)" : ""}
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Always show Bulk Actions but disable if no selection */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9"
                  disabled={Object.keys(rowSelection).length === 0}
                >
                  <span>Bulk Actions {Object.keys(rowSelection).length > 0 ? `(${Object.keys(rowSelection).length})` : ""}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkSetStatus(true)}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Activate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkSetStatus(false)}>
                  <XCircle className="mr-2 h-4 w-4 text-slate-600" />
                  Deactivate
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={openBulkCategoryModal}>
                  <FolderIcon className="mr-2 h-4 w-4 text-blue-600" />
                  Assign Category
                </DropdownMenuItem>

                <DropdownMenuItem onClick={openBulkTagModal}>
                  <TagIcon className="mr-2 h-4 w-4 text-purple-600" />
                  Tag in bulk
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600">
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Archive Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <ColumnsIcon className="mr-2 h-4 w-4" />
                  <span>Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table.getAllColumns()
                  .filter(column => column.id !== 'select' && column.id !== 'actions')
                  .map(column => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id.charAt(0).toUpperCase() + column.id.slice(1).replace('_', ' ')}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button className="h-9" asChild>
              <Link to="/app/products/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                New Product
              </Link>
            </Button>
          </div>
        </div>

        {/* Additional Filter Panel that toggles based on filtersVisible state */}
        {filtersVisible && (
          <div className="border-b border-slate-200 bg-slate-50 p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger id="category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value as any)}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min-price">Min Price</Label>
              <Input
                id="min-price"
                type="number"
                min={0}
                placeholder="Min Price"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-price">Max Price</Label>
              <Input
                id="max-price"
                type="number"
                min={0}
                placeholder="Max Price"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
            
            <div className="col-span-full flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button size="sm" onClick={handleFilterToggle}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        <div className="w-full h-full flex flex-col relative overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="shadow-header">
              {table.getHeaderGroups().map(headerGroup => (
                <React.Fragment key={headerGroup.id}>
                  {/* 1) Column titles */}
                  <TableRow className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 h-8">
                    {headerGroup.headers.map(header =>
                      <SortableTableHeader key={header.id} id={header.column.id} header={header}/>
                    )}
                  </TableRow>

                  {/* 2) Filter inputs - Always visible now */}
                  <TableRow className="sticky top-8 z-10 bg-slate-50 border-b border-slate-200 h-8">
                    {headerGroup.headers.map((header) => {
                      const column = header.column;
                      const columnId = column.id;
                      
                      // Skip filter UI for select column
                      if (columnId === 'select') {
                        return <TableHead key={`filter-${columnId}`} className="px-2 py-2" />;
                      }
                      
                      // Skip filter UI for thumbnail column
                      if (columnId === 'thumbnail') {
                        return <TableHead key={`filter-${columnId}`} className="px-2 py-2" />;
                      }
                      
                      // Use tailwind classes for mobile responsiveness
                      const hideOnMobileClass = ['brand', 'barcode', 'created_at', 'tags'].includes(columnId) ? 'hidden md:table-cell' : '';
                      
                      return (
                        <TableHead key={`filter-${columnId}`} className={`px-2 py-2 ${hideOnMobileClass}`}>
                          {(() => {
                            // Text input filter for text columns
                            if (['name', 'sku', 'brand', 'barcode'].includes(columnId)) {
                              return (
                                <Input
                                  placeholder={`Filter...`}
                                  value={(table.getColumn(columnId)?.getFilterValue() as string) ?? ''}
                                  onChange={(e) => {
                                    column.setFilterValue(e.target.value);
                                    handleColumnFilterChange(columnId, e.target.value);
                                  }}
                                  className="h-7 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              );
                            }
                            
                            // Dropdown filter for category
                            if (columnId === 'category') {
                              return (
                                <Select
                                  value={(table.getColumn(columnId)?.getFilterValue() as string) ?? ''}
                                  onValueChange={(value) => {
                                    // Handle special values:
                                    // 1. "all" - clears the filter completely (undefined)
                                    // 2. "uncategorized" - sets filter to empty string to find products with no category
                                    let filterValue;
                                    if (value === "all") {
                                      filterValue = undefined;
                                    } else if (value === "uncategorized") {
                                      filterValue = "";
                                    } else {
                                      filterValue = value;
                                    }
                                    column.setFilterValue(filterValue);
                                    handleColumnFilterChange(columnId, filterValue);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                    <SelectValue placeholder="Filter..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                    {uniqueCategories.map((category) => (
                                      <SelectItem key={category} value={category || "uncategorized"}>
                                        {category || "Uncategorized"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            }
                            
                            // Dropdown filter for status
                            if (columnId === 'is_active') {
                              return (
                                <Select
                                  value={(table.getColumn(columnId)?.getFilterValue() as string) ?? ''}
                                  onValueChange={(value) => {
                                    // Convert "all" to undefined to clear the filter
                                    const filterValue = value === "all" ? undefined : value;
                                    column.setFilterValue(filterValue);
                                    handleColumnFilterChange(columnId, filterValue);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                    <SelectValue placeholder="Filter..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="true">Active</SelectItem>
                                    <SelectItem value="false">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                              );
                            }
                            
                            // Price range filter
                            if (columnId === 'price') {
                              const priceRange = table.getColumn(columnId)?.getFilterValue() as [number, number] | undefined;
                              
                              return (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 text-xs w-full justify-between"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {priceRange ? `$${priceRange[0]} - $${priceRange[1]}` : 'Filter price'}
                                      <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label htmlFor="min-price">Min Price</Label>
                                          <Input
                                            id="min-price"
                                            type="number"
                                            min={0}
                                            placeholder="Min"
                                            value={priceRange?.[0] ?? ''}
                                            onChange={(e) => {
                                              const min = e.target.value ? Number(e.target.value) : 0;
                                              const max = priceRange?.[1] ?? Infinity;
                                              column.setFilterValue([min, max]);
                                              handleColumnFilterChange(columnId, [min, max]);
                                            }}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label htmlFor="max-price">Max Price</Label>
                                          <Input
                                            id="max-price"
                                            type="number"
                                            min={0}
                                            placeholder="Max"
                                            value={priceRange?.[1] ?? ''}
                                            onChange={(e) => {
                                              const min = priceRange?.[0] ?? 0;
                                              const max = e.target.value ? Number(e.target.value) : Infinity;
                                              column.setFilterValue([min, max]);
                                              handleColumnFilterChange(columnId, [min, max]);
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            column.setFilterValue(undefined);
                                            handleColumnFilterChange(columnId, undefined);
                                          }}
                                        >
                                          Reset
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              );
                            }
                            
                            // Date range filter for created_at and updated_at
                            if (['created_at', 'updated_at'].includes(columnId)) {
                              return (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 text-xs w-full justify-between"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {column.getFilterValue() ? 'Date filtered' : 'Filter date'}
                                      <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label htmlFor={`${columnId}-from`}>From</Label>
                                          <Input
                                            id={`${columnId}-from`}
                                            type="date"
                                            onChange={(e) => {
                                              const dateRange = column.getFilterValue() as [string, string] || ['', ''];
                                              column.setFilterValue([e.target.value, dateRange[1]]);
                                              handleColumnFilterChange(columnId, [e.target.value, dateRange[1]]);
                                            }}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label htmlFor={`${columnId}-to`}>To</Label>
                                          <Input
                                            id={`${columnId}-to`}
                                            type="date"
                                            onChange={(e) => {
                                              const dateRange = column.getFilterValue() as [string, string] || ['', ''];
                                              column.setFilterValue([dateRange[0], e.target.value]);
                                              handleColumnFilterChange(columnId, [dateRange[0], e.target.value]);
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            column.setFilterValue(undefined);
                                            handleColumnFilterChange(columnId, undefined);
                                          }}
                                        >
                                          Reset
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              );
                            }

                            return null;
                          })()}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </React.Fragment>
              ))}
            </TableHeader>
          </Table>
          
          <div className="overflow-auto h-[calc(100%-100px)]">
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columnOrder.filter(Boolean)} // Extra safety to filter out null/undefined
                strategy={horizontalListSortingStrategy}
              >
                <Table className="w-full">
                  <TableBody>
                    <TableFallback 
                      columns={columns}
                      loading={loading}
                      filteredData={filteredData}
                      debouncedSearchTerm={debouncedSearchTerm}
                      filters={filters}
                      handleClearFilters={handleClearFilters}
                      handleRefresh={handleRefresh}
                    />
                    
                    {!loading && filteredData.length > 0 && table.getRowModel().rows.map((row, index) => {
                      // Access the id once outside JSX to avoid potential issues
                      const productId = row.original.id;
                      
                      return (
                        <TableRow 
                          key={row.id} 
                          data-state={row.getIsSelected() && "selected"}
                          className={cn(
                            "border-b border-gray-200 transition-colors hover:bg-gray-50",
                            row.getIsSelected() ? "bg-slate-50" : index % 2 === 0 ? "bg-white" : "bg-gray-50",
                            "cursor-pointer"
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
                          {row.getVisibleCells().map((cell) => {
                            // Add mobile responsiveness to table cells
                            const columnId = cell.column.id;
                            const hideOnMobileClass = ['brand', 'barcode', 'created_at', 'tags'].includes(columnId) ? 'hidden md:table-cell' : '';
                            
                            // Add background color for the actions column
                            const isActionsColumn = columnId === 'actions';
                            const actionsClass = isActionsColumn ? 'sticky right-0 z-20 shadow-sm border-l border-gray-200' : '';
                            const cellBgClass = isActionsColumn ? (row.getIsSelected() ? 'bg-slate-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50') : '';
                            
                            // Add icon to specific columns
                            if (columnId === 'brand' && row.getValue('brand')) {
                              return (
                                <TableCell 
                                  key={cell.id} 
                                  className={`px-2 py-1 ${hideOnMobileClass} ${actionsClass} ${cellBgClass}`}
                                  data-column-id={columnId}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500"><TagIcon className="h-3.5 w-3.5" /></span>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                </TableCell>
                              );
                            }
                            
                            if (columnId === 'category' && row.getValue('category')) {
                              return (
                                <TableCell 
                                  key={cell.id} 
                                  className={`px-2 py-1 ${hideOnMobileClass} ${actionsClass} ${cellBgClass}`}
                                  data-column-id={columnId}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500"><FolderIcon className="h-3.5 w-3.5" /></span>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                </TableCell>
                              );
                            }
                            
                            if (columnId === 'is_active') {
                              const isActive = row.getValue('is_active') as boolean;
                              return (
                                <TableCell 
                                  key={cell.id} 
                                  className={`px-2 py-1 ${hideOnMobileClass} ${actionsClass} ${cellBgClass}`}
                                  data-column-id={columnId}
                                >
                                  <div className="flex items-center gap-1">
                                    {isActive ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                </TableCell>
                              );
                            }
                            
                            return (
                              <TableCell 
                                key={cell.id} 
                                className={`px-2 py-1 ${hideOnMobileClass} ${actionsClass} ${cellBgClass}`}
                                data-column-id={columnId}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {/* PAGINATION */}
                <div className="flex items-center justify-between p-2 border-t bg-white">
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                      <ChevronLeft />
                    </Button>
                    <Button size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                      <ChevronRight />
                    </Button>
                  </div>

                  <span className="text-sm">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Show</span>
                    <Select
                      value={String(table.getState().pagination.pageSize)}
                      onValueChange={v => table.setPageSize(Number(v))}
                    >
                      <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
      
      {/* Add modals at the end */}
      <BulkCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        selectedIds={getSelectedProductIds()}
        onSuccess={() => {
          setRowSelection({});
          fetchData();
        }}
      />
      
      <BulkTagModal
        open={showTagModal}
        onOpenChange={setShowTagModal}
        selectedIds={getSelectedProductIds()}
        onSuccess={() => {
          setRowSelection({});
          fetchData();
        }}
      />
    </React.Fragment>
  );
}

// Add CSS for header shadow
// @ts-ignore - Ignore CSS properties in string literal
const headerShadowStyle: string = `
.shadow-header {
  // @ts-ignore
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

th[data-column-id="actions"],
td[data-column-id="actions"] {
  // @ts-ignore
  position: sticky;
  right: 0;
  z-index: 20;
  background-color: inherit;
  // @ts-ignore
  box-shadow: -2px 0 4px rgba(0,0,0,0.05);
}
`;

// Inject the CSS style into the document head if it doesn't already exist
if (typeof document !== 'undefined') {
  const styleId = 'products-table-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = headerShadowStyle;
    document.head.appendChild(style);
  }
}
