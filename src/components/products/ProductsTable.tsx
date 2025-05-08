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
  type FilterFn,
  type Row,
  Header,
  getExpandedRowModel,
  Updater
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FilterIcon,
  TrashIcon,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ColumnsIcon,
  ChevronDown,
  ImageIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  EyeIcon,
  PencilIcon,
  TagIcon,
  FolderIcon,
  LucideIcon
} from "lucide-react";
import { Product, productService, ProductImage, ProductAttribute } from "@/services/productService";
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
import { useDebounce } from "@/hooks/useDebounce";
import { ProductsTableFallback } from "@/components/products/productstable/ProductsTableFallback";
import { IconBtn } from "@/components/products/productstable/IconBtn";
import { SortableTableHeader } from "@/components/products/productstable/SortableTableHeader";
import { formatPrice } from "@/utils/formatPrice";
import { useUniqueCategories, useUniqueTags } from "@/hooks/useProductDerived";
import { useProductColumns } from "@/hooks/useProductColumns";    
import ProductRowDetails from "./productstable/ProductRowDetails";
import { motion, AnimatePresence } from 'framer-motion';

// Define constants for fixed widths
const ACTION_W = 112; // Width of action column in pixels
const FOOTER_H = 48; // Height of footer in pixels

// Define filter state type
interface FilterState {
  category: string;
  status: 'all' | 'active' | 'inactive';
  minPrice: string;
  maxPrice: string;
  tags: string[]; // Add tags array to FilterState
}

// SortableTableHeader component for handling sorting
interface SortableTableHeaderProps {
  id: string;
  header: Header<Product, unknown>;
}

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

// Add a type for tag objects that might be in the product.tags array
// Add this near the other interfaces at the top of the file (after line 310)
interface TagObject {
  id?: string | number;
  name?: string;
  value?: string | number;
  label?: string;
  [key: string]: any; // Allow other properties
}

// Add this type declaration for productAttributes to match the Product interface
type ProductWithAttributeArray = Omit<Product, 'attributes'> & {
  attributes?: ProductAttribute[];
};

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
  
  // Add expanded rows state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Add state for product attributes
  const [productAttributes, setProductAttributes] = useState<Record<number, ProductAttribute[]>>({});
  
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
  
  // Add scroll container ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // Effect to handle action column visibility
  useEffect(() => {
    if (!columnVisibility.actions) {
      scrollRef.current?.classList.remove("pr-[112px]");
    } else {
      scrollRef.current?.classList.add("pr-[112px]");
    }
  }, [columnVisibility.actions]);
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get('category') || 'all',
    status: (searchParams.get('status') as 'all' | 'active' | 'inactive') || 'all',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    tags: [], // Initialize empty tags array
  });

  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  // State to control visibility of the Columns selector dropdown
  const [columnsMenuOpen, setColumnsMenuOpen] = useState<boolean>(false);
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
      // Make the requests one at a time to avoid race conditions
      let fetchedProducts: Product[] = [];
      let fetchedCategories: Category[] = [];
      
      try {
        // Explicitly set fetchAll to true to get all products across all pages
        fetchedProducts = await productService.getProducts({}, true);
        // Guard against non-array responses
        if (!Array.isArray(fetchedProducts)) {
          fetchedProducts = [];
        }
      } catch (productsError) {
        // Don't throw, continue to fetch categories
        fetchedProducts = [];
      }
      
      try {
        fetchedCategories = await productService.getCategories();
        // Guard against non-array responses
        if (!Array.isArray(fetchedCategories)) {
          fetchedCategories = [];
        }
      } catch (categoriesError) {
        // Don't throw, continue with empty categories
        fetchedCategories = [];
      }
      
      // ------------------------------------------------------------------
      // NEW: Enrich products with their primary image if not already present
      // ------------------------------------------------------------------
      const enrichedProducts = await Promise.all(
        fetchedProducts.map(async (prod) => {
          // If we already have a thumbnail or images, keep it as-is
          if (
            prod.primary_image_thumb ||
            (Array.isArray(prod.images) && prod.images.length > 0)
          ) {
            return prod;
          }

          // Otherwise try to fetch assets to derive a thumbnail
          try {
            if (!prod.id) return prod;
            const assets = await productService.getProductAssets(prod.id);
            if (Array.isArray(assets) && assets.length > 0) {
              // Find primary image first, else first image
              const primaryAsset =
                assets.find(
                  (a) =>
                    (a.is_primary &&
                      ((a.type || a.asset_type) || '').toLowerCase().includes('image'))
                ) ||
                assets.find((a) =>
                  ((a.type || a.asset_type) || '').toLowerCase().includes('image')
                );

              if (primaryAsset?.url) {
                // Build images array for consistency
                const images = assets
                  .filter((a) =>
                    ((a.type || a.asset_type) || '')
                      .toLowerCase()
                      .includes('image')
                  )
                  .map((a, idx) => ({
                    id: typeof a.id === 'string' ? parseInt(a.id, 10) : Number(a.id),
                    url: a.url,
                    order: idx,
                    is_primary: a.id === primaryAsset.id,
                  }));

                return {
                  ...prod,
                  assets,
                  images,
                  primary_image_thumb: primaryAsset.url,
                  primary_image_large: primaryAsset.url,
                } as Product;
              }
            }
          } catch (assetErr) {
            // Continue with the original product
          }

          return prod; // return original if enrichment fails
        })
      );

      setProducts(enrichedProducts);
      const categoryOpts = fetchedCategories.map(c => ({ 
        label: typeof c === 'object' ? c.name : c,
        value: typeof c === 'object' ? c.id : c
      }));
      setCategoryOptions(categoryOpts);
      
    } catch (err) {
      setError('Failed to fetch data');
      toast({ 
        title: 'Could not load products',
        description: 'Please try refreshing the page',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Update the filteredData tag filtering logic with proper type casting
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
    
    // SIMPLIFIED TAG FILTERING LOGIC - using AND logic
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(product => {
        // Handle missing tags case
        if (!product.tags || !Array.isArray(product.tags) || product.tags.length === 0) {
          return false;
        }
        
        // Check if ALL filter tags match (AND logic instead of OR)
        const hasAllTags = filters.tags.every(filterTag => {
          const found = product.tags.some(productTag => {
            // String comparison
            if (typeof productTag === 'string') {
              return productTag === filterTag;
            }
            
            // Object comparison with type safety
            if (productTag && typeof productTag === 'object') {
              // Safe access with type assertion
              const tag = productTag as any;
              return (
                (tag.id !== undefined && String(tag.id) === filterTag) || 
                (tag.name !== undefined && String(tag.name) === filterTag) ||
                (tag.value !== undefined && String(tag.value) === filterTag) ||
                (tag.label !== undefined && String(tag.label) === filterTag)
              );
            }
            
            return false;
          });
          
          return found;
        });
        
        return hasAllTags;
      });
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
        setLoading(true);
        fetchData();
    } else {
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
  }, [filtersVisible]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      category: 'all',
      status: 'all',
      minPrice: '',
      maxPrice: '',
      tags: [], // Clear tags array
    });
    
    // Update URL params without the cleared filters
    const params = new URLSearchParams(searchParams);
    params.delete('category');
    params.delete('status');
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('tags'); // Remove tags parameter if it exists
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // --- ADD Bulk Action Handlers (Placeholder/Assumed API) ---
  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection)
      .map(index => productRowMap[parseInt(index, 10)])
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
      .map(index => productRowMap[parseInt(index, 10)])
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
      toast({ 
        title: `Failed to update status for selected products.`,
        description: error.message || "An unexpected error occurred.",
        variant: 'destructive' 
      });
    }
  };
  // --- End Bulk Action Handlers ---

  // --- Derived Data ---
  const uniqueCategories = useUniqueCategories(products);
  
  // Update the updateData function to use the productRowMap instead of the table reference
  const updateData = useCallback(async (rowIndex: number, columnId: string, value: any) => {
    const productId = productRowMap[rowIndex];
    
    if (!productId) {
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

      // Save to API
      await productService.updateProduct(productId, updateData);
      
      toast({ title: `${columnId.charAt(0).toUpperCase() + columnId.slice(1)} updated`, variant: 'default' });
      setEditingCell(null); // Clear editing state
    } catch (error) {
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
      toast({ title: 'Failed to create tag', variant: 'destructive' });
    }
  }, [editingCell, productRowMap, products, updateData, toast]);

  // Function to render expanded row content with attributes
  const renderExpandedRow = (row: Row<Product>, index: number) => {
    const productId = row.original.id;
    
    if (!productId) {
      return (
        <ProductRowDetails 
          key={`expanded-${row.id}-product-undefined`}
          product={row.original as any} 
          zebra={index % 2 === 0}
        />
      );
    }
    
    // Create product with attributes if they've been loaded
    const productWithAttributes: ProductWithAttributeArray = {
      ...row.original,
      attributes: productAttributes[productId] || []
    };
    
    return (
      <ProductRowDetails 
        key={`expanded-${row.id}-product-${productId}`}
        product={productWithAttributes as any} 
        zebra={index % 2 === 0}
      />
    );
  };

  // ROW EXPANSION
  // Create the expander column with proper memoization
  const expanderColumn = useMemo<ColumnDef<Product>>(
    () => ({
      id: 'expander',
      // Keep header minimal
      header: () => <div className="w-9"></div>,
      cell: ({ row }) => {
        return (
          <button
            type="button"
            onClick={row.getToggleExpandedHandler()}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                row.getToggleExpandedHandler()();
              }
            }}
            aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
            className="rounded-full h-6 w-6 inline-flex items-center justify-center hover:bg-slate-100 transition-transform duration-200"
          >
            <ChevronRight 
              className={cn(
                "h-4 w-4",
                row.getIsExpanded() && "rotate-90"
              )} 
            />
          </button>
        );
      },
      enableSorting: false,
      enableHiding: false, // Make sure it can't be hidden
      size: 36,
      minSize: 36, // Ensure minimum width
      maxSize: 36, // Ensure maximum width
    }),
    [] // No dependencies - stable reference
  );

  const {
    columns,
    actionColumn,
    allColumns,
  } = useProductColumns({
    /* state & refs */
    editingCell,
    editValue,
    tagOptions,
    categoryOptions,

    /* setters */
    setEditValue,
    setCategoryOptions,
    setProducts,

    /* handlers */
    handleKeyDown,
    handlePriceCellChange,
    handleSaveCellEdit,
    handleCancelEdit,
    handleCellEdit,
    handleCreateTagOption,
    updateData,

    /* nav / actions */
    navigate,
    handleRowClick,
    handleDelete,
    toast: (msg: { title: string; description?: string; variant?: "default" | "destructive"; }) => toast(msg),
    fetchData,
    IconBtn,
  });

  // Memoize derived column arrays to prevent re-creation on each render
  const columnsWithExpander = useMemo(
    () => [expanderColumn, ...columns],
    [expanderColumn, columns]
  );

  // Memoize allColumnsWithExpander to prevent re-creation on each render
  const allColumnsWithExpander = useMemo(() => {
    const selectColumn = allColumns.find(col => col.id === 'select');
    const restColumns = allColumns.filter(col => col.id !== 'select');
    
    if (selectColumn) {
      // If there's a select column, keep it first, then expander, then other columns
      return [selectColumn, expanderColumn, ...restColumns];
    } else {
      // If no select column, expander goes first
      return [expanderColumn, ...restColumns];
    }
  }, [expanderColumn, allColumns]);

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
              // Ensure expander column is first
              const orderWithExpander = ['expander'];
              parsedOrder.forEach(colId => {
                if (colId !== 'expander') {
                  orderWithExpander.push(colId);
                }
              });
              setColumnOrder(orderWithExpander);
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
          // Ensure expander column is always visible
          const visibilitySettings = JSON.parse(savedVisibility);
          setColumnVisibility({
            ...visibilitySettings,
            expander: true
          });
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
      // Initialize with default order, making sure expander is first
      const defaultOrder = ['expander'];
      
      columns
        .map((column) => {
          return column.id || 
            // @ts-ignore - handle accessorKey which may exist on some column types
            (column.accessorKey ? column.accessorKey.toString() : '');
        })
        .filter(Boolean) // Filter out any null or empty strings
        .forEach(colId => {
          if (colId !== 'expander') {
            defaultOrder.push(colId);
          }
        });
      
      setColumnOrder(defaultOrder);
    };
    
    loadUserPreferences();
  }, [columns]);

  // accordion: allow only one expanded row
  const handleExpandedChange = useCallback(
    (updater: Updater<Record<string, boolean>>) => {
      setExpanded(prev => {
        // normalise to an object
        const next =
          typeof updater === 'function' ? updater(prev) : updater;

        const openKeys = Object.keys(next).filter(k => next[k]);
        if (openKeys.length === 0) return {};             // none open

        const last = openKeys[openKeys.length - 1];       // keep newest
        return { [last]: true };
      });
    },
    []
  );

  // Configure the table with useReactTable
  const table = useReactTable({
    data: filteredData,
    columns: allColumnsWithExpander,
    defaultColumn: {
      minSize: 80,
      size: 150,
      maxSize: 500,
    },
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
      rowSelection,
      columnOrder,
      expanded, // Add expanded state
    },
    meta: {
      updateData,
    },
    // Tell the table that every row can be expanded
    getRowCanExpand: () => true,
    // Prevent auto-reset of expanded state when columns change
    autoResetExpanded: false,
    // Add custom filterFns for tags with proper typing
    filterFns: {
      tags: (row: Row<Product>, columnId: string, filterValue: any): boolean => {
        // Skip if no filter value
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) return true;
        
        // Get tags from the row
        const tags = row.getValue(columnId);
        
        // If no tags, no match
        if (!tags || !Array.isArray(tags) || tags.length === 0) return false;
        
        // Check if any of the filter tags exist in the row's tags
        return filterValue.some(filterTag => 
          tags.some((tag: any) => {
            // Handle tag as string
            if (typeof tag === 'string') {
              return tag === filterTag;
            }
            
            // Handle tag as object
            if (tag && typeof tag === 'object') {
              return (
                String(tag.id) === filterTag ||
                String(tag.name) === filterTag ||
                String(tag.value) === filterTag ||
                String(tag.label) === filterTag
              );
            }
            
            return false;
          })
        );
      }
    } as Record<string, FilterFn<Product>>,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onColumnOrderChange: setColumnOrder,
    onExpandedChange: handleExpandedChange,
    getExpandedRowModel: getExpandedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Add effect to fetch attributes when expanded state changes
  useEffect(() => {
    const expandedIds = Object.keys(expanded).filter(id => expanded[id]);

    expandedIds.forEach(async rowId => {
      const row = table.getRow(rowId);
      const pid = row?.original?.id;
      if (!pid || productAttributes[pid] !== undefined) return; // already cached

      try {
        console.log(`[ProductsTable] Loading attributes for product ${pid}`);
        // First fetch the detailed attributes
        const attrs = await productService.getProductAttributes(pid);
        // Then fetch the attribute groups structure
        const attrGroups = await productService.getProductAttributeGroups(pid);
        
        console.log(`[ProductsTable] Product ${pid} received ${attrs?.length || 0} attributes and ${attrGroups?.length || 0} attribute groups`);
        
        // Create a merged data structure with group information
        let mergedAttributes = [];
        
        // If we have attribute groups, use that structure as the primary data
        if (Array.isArray(attrGroups) && attrGroups.length > 0) {
          console.log(`[ProductsTable] Using attribute group structure for product ${pid}`);
          mergedAttributes = attrGroups;
        } 
        // Otherwise fall back to using the attributes with default grouping
        else if (Array.isArray(attrs) && attrs.length > 0) {
          console.log(`[ProductsTable] Falling back to individual attributes for product ${pid}`);
          // Process attributes into a group-compatible structure
          const groupMap = {};
          
          attrs.forEach(attr => {
            const groupName = attr.group || 'General';
            if (!groupMap[groupName]) {
              groupMap[groupName] = {
                id: Math.random(),
                name: groupName,
                items: []
              };
            }
            
            groupMap[groupName].items.push({
              ...attr,
              attribute_label: attr.name,
              value: attr.value
            });
          });
          
          mergedAttributes = Object.values(groupMap);
        }
        
        console.log(`[ProductsTable] Final merged attributes for product ${pid}:`, mergedAttributes);
        
        setProductAttributes(prev => {
          const newState = { ...prev, [pid]: mergedAttributes };
          return newState;
        });
      } catch (e) {
        console.error(`[ProductsTable] Attribute loading failed for ${pid}`, e);
        setProductAttributes(prev => ({ ...prev, [pid]: [] })); // cache failure too
      }
    });
  }, [expanded, productAttributes, table]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

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
      .map(index => productRowMap[parseInt(index, 10)])
      .filter((id): id is number => typeof id === 'number');
  }, [rowSelection, productRowMap]);

  // Add this function to extract unique tags from products for the filter dropdown
  const uniqueTags = useUniqueTags(products);

  // Now update the handleFilterChange function to ensure tags are properly handled
  const handleFilterChange = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    // Update the filters state
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Special handling for tags filter
    if (key === 'tags') {
      const tagsColumn = table.getColumn('tags');
      if (tagsColumn) {
        const tags = value as string[];
        
        // Set the column filter correctly based on whether there are tags or not
        if (tags.length > 0) {
          // Create a new array reference to ensure React detects the change
          tagsColumn.setFilterValue([...tags]);
        } else {
          tagsColumn.setFilterValue(undefined);
        }
      }
    }
  }, [table]);

  // 🚀 Pre-fetch attribute groups for the first visible rows
  useEffect(() => {
    // Only run for the first page
    if (pagination.pageIndex !== 0) return;

    const firstPage = filteredData.slice(0, pagination.pageSize);

    firstPage.forEach(async product => {
      if (!product.id || productAttributes[product.id] !== undefined) return;

      try {
        const groups = await productService.getProductAttributeGroups(product.id);
        if (groups && groups.length) {
          setProductAttributes(prev => ({ ...prev, [product.id]: groups }));
        }
      } catch (e) {
        console.error(`prefetch groups failed for product ${product.id}`, e);
        // Cache failure to avoid repeat hits
        setProductAttributes(prev => ({ ...prev, [product.id]: [] }));
      }
    });
  }, [filteredData, pagination, productAttributes]);

  // Render the component
  return (
    <React.Fragment>
      <div className="flex flex-col flex-1 w-full h-full mx-auto max-w-screen-2xl px-2 lg:px-4 min-h-0">
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

            <DropdownMenu open={columnsMenuOpen} onOpenChange={setColumnsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <ColumnsIcon className="mr-2 h-4 w-4" />
                  <span>Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onPointerDownOutside={() => setColumnsMenuOpen(false)}>
                {table.getAllColumns()
                  .filter(column => column.id !== 'select' && column.id !== 'actions')
                  .map(column => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onSelect={(e) => e.preventDefault()}
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

        {/* Section containing scroll area and footer */}
        <section className="flex flex-col flex-1 min-h-0">
          {/* Create ONE scroll container that handles both axes */}
          <div
            ref={scrollRef}
            className={cn(
              "flex-1 overflow-auto min-h-0",
              columnVisibility.actions !== false && `pr-[${ACTION_W}px]`,
              `pb-[${FOOTER_H}px]`          // space for the sticky footer
            )}
            id="products-scroll-area"
          >
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columnOrder.filter(Boolean)}
                strategy={horizontalListSortingStrategy}
              >
                <Table className="min-w-fit">
                  <TableHeader className="relative">
                      {table.getHeaderGroups().map(headerGroup => (
                        <React.Fragment key={headerGroup.id}>
                          {/* 1) Column titles */}
                          <TableRow className="sticky top-0 z-30 bg-slate-100 h-4 border-b border-slate-200">
                            {headerGroup.headers.map(header =>
                              <SortableTableHeader key={header.id} id={header.column.id} header={header}/>
                            )}
                          </TableRow>

                          {/* 2) Filter inputs - Always visible now */}
                          <TableRow className="sticky top-9 z-20 bg-slate-50 h-6 border-b border-slate-200">
                            {headerGroup.headers.map((header) => {
                              const column = header.column;
                              const columnId = column.id;
                              
                              // Skip filter UI for select column
                              if (columnId === 'select') {
                                return <TableHead key={`filter-${columnId}`} className="px-1 py-1" />;
                              }
                              
                              // Add Clear Filters button to thumbnail column 
                              // thumbnail column ➜ filter row
                              if (columnId === "thumbnail") {
                                return (
                                  <TableHead key={`filter-${columnId}`} className="px-1 py-1">
                                    <Button
                                      variant="outline"       // keeps the shadcn outline styling
                                      size="sm"
                                      onClick={() => {
                                        table.resetColumnFilters();
                                        setColumnFilterValues({});
                                        handleClearFilters();
                                      }}
                                      /* prettier, compact pill-style */
                                      className="
                                        h-6 px-3                   /* slimmer height & horizontal padding  */
                                        rounded-full               /* fully rounded pill                  */
                                        border-slate-300           /* subtle 1-px border                  */
                                        bg-white/90                /* soft white with a hint of opacity   */
                                        text-slate-600             /* medium-gray label                   */
                                        hover:bg-slate-100         /* light gray hover                    */
                                        hover:border-slate-400
                                        shadow-sm                  /* faint drop-shadow                   */
                                        transition-colors
                                      "
                                    >
                                      Clear&nbsp;filters
                                    </Button>
                                  </TableHead>
                                );
                              }

                              
                              // Use tailwind classes for mobile responsiveness
                              const hideOnMobileClass = ['brand', 'barcode', 'created_at', 'tags'].includes(columnId) ? 'hidden md:table-cell' : '';
                              
                              return (
                                <TableHead key={`filter-${columnId}`} className={`px-2 py-2 ${hideOnMobileClass}`}>
                                  {/* Using React.Fragment to properly wrap the IIFE result as a ReactNode */}
                                  <React.Fragment>
                                  {(() => {
                                    // Text input filter for text columns
                                    if (['name','sku','brand','barcode'].includes(columnId)) {
                                      return (
                                        <Input
                                          placeholder="Filter…"
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
                                            column.setFilterValue(value);
                                            handleColumnFilterChange(columnId, value === 'all' ? '' : value);
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder="Filter category" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                            {uniqueCategories.map((category) => (
                                              <SelectItem key={category} value={category}>
                                                {category}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      );
                                    }

                                    // Status filter for is_active
                                    if (columnId === 'is_active') {
                                      return (
                                        <Select
                                          value={(table.getColumn(columnId)?.getFilterValue() as string) ?? ''}
                                          onValueChange={(value) => {
                                            column.setFilterValue(value);
                                            handleColumnFilterChange(columnId, value === 'all' ? '' : value);
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder="Status" />
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
                                      return (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              className="h-7 text-xs w-full justify-start font-normal"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <span>Price Range</span>
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-60 p-3" align="start">
                                            <div className="space-y-2">
                                              <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                  <Label htmlFor="price-min">Min</Label>
                                                  <Input
                                                    id="price-min"
                                                    type="number"
                                                    placeholder="Min"
                                                    className="h-8"
                                                    value={columnFilterValues['price']?.min || ''}
                                                    onChange={(e) => {
                                                      const currentValues = columnFilterValues['price'] || {};
                                                      const newValues = { ...currentValues, min: e.target.value };
                                                      column.setFilterValue(newValues);
                                                      handleColumnFilterChange(columnId, newValues);
                                                    }}
                                                  />
                                                </div>
                                                <div>
                                                  <Label htmlFor="price-max">Max</Label>
                                                  <Input
                                                    id="price-max"
                                                    type="number"
                                                    placeholder="Max"
                                                    className="h-8"
                                                    value={columnFilterValues['price']?.max || ''}
                                                    onChange={(e) => {
                                                      const currentValues = columnFilterValues['price'] || {};
                                                      const newValues = { ...currentValues, max: e.target.value };
                                                      column.setFilterValue(newValues);
                                                      handleColumnFilterChange(columnId, newValues);
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="w-full text-xs"
                                                onClick={() => {
                                                  column.setFilterValue(undefined);
                                                  handleColumnFilterChange(columnId, undefined);
                                                }}
                                              >
                                                Reset
                                              </Button>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      );
                                    }

                                    // Date filters
                                    if (['created_at', 'updated_at'].includes(columnId)) {
                                      return (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              className="h-7 text-xs w-full justify-start font-normal"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <span>Date Range</span>
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-3" align="start">
                                            <div className="space-y-2">
                                              <div className="grid gap-2">
                                                <div>
                                                  <Label htmlFor={`${columnId}-from`}>From</Label>
                                                  <Input
                                                    id={`${columnId}-from`}
                                                    type="date"
                                                    className="h-8"
                                                    value={columnFilterValues[columnId]?.from || ''}
                                                    onChange={(e) => {
                                                      const currentValues = columnFilterValues[columnId] || {};
                                                      const newValues = { ...currentValues, from: e.target.value };
                                                      column.setFilterValue(newValues);
                                                      handleColumnFilterChange(columnId, newValues);
                                                    }}
                                                  />
                                                </div>
                                                <div>
                                                  <Label htmlFor={`${columnId}-to`}>To</Label>
                                                  <Input
                                                    id={`${columnId}-to`}
                                                    type="date"
                                                    className="h-8"
                                                    value={columnFilterValues[columnId]?.to || ''}
                                                    onChange={(e) => {
                                                      const currentValues = columnFilterValues[columnId] || {};
                                                      const newValues = { ...currentValues, to: e.target.value };
                                                      column.setFilterValue(newValues);
                                                      handleColumnFilterChange(columnId, newValues);
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="w-full text-xs"
                                                onClick={() => {
                                                  column.setFilterValue(undefined);
                                                  handleColumnFilterChange(columnId, undefined);
                                                }}
                                              >
                                                Reset
                                              </Button>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      );
                                    }

                                    // Tags filter 
                                    if (columnId === 'tags') {
                                      return (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              className="h-7 text-xs w-full justify-start font-normal"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <TagIcon className="mr-1 h-3 w-3" />
                                              <span>
                                                {filters.tags.length > 0 
                                                  ? `${filters.tags.length} Selected`
                                                  : "Filter Tags"}
                                              </span>
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-64 p-3" align="start">
                                            <div className="space-y-2">
                                              <div className="max-h-60 overflow-y-auto pr-2">
                                                {uniqueTags.length > 0 ? (
                                                  <div className="space-y-1">
                                                    {uniqueTags.map((tag) => (
                                                      <div key={tag} className="flex items-center">
                                                        <Checkbox 
                                                          id={`tag-${tag}`}
                                                          checked={filters.tags.includes(tag)}
                                                          onCheckedChange={(checked) => {
                                                            // Create new tags array
                                                            const newTags = checked 
                                                              ? [...filters.tags, tag] 
                                                              : filters.tags.filter(t => t !== tag);
                                                            
                                                            // Update the filters state directly
                                                            setFilters(prev => ({ ...prev, tags: newTags }));
                                                            
                                                            // Force refresh of filtered data via a direct table update
                                                            const tagsColumn = table.getColumn('tags');
                                                            if (tagsColumn) {
                                                              if (newTags.length > 0) {
                                                                // Important: create a new array reference to ensure React detects the change
                                                                tagsColumn.setFilterValue([...newTags]);
                                                              } else {
                                                                tagsColumn.setFilterValue(undefined);
                                                              }
                                                            }
                                                          }}
                                                        />
                                                        <Label 
                                                          htmlFor={`tag-${tag}`}
                                                          className="ml-2 text-sm cursor-pointer"
                                                        >
                                                          {tag}
                                                        </Label>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <p className="text-sm text-slate-500 text-center py-2">
                                                    No tags available
                                                  </p>
                                                )}
                                              </div>
                                              <div className="flex justify-between">
                                                <Button 
                                                  size="sm" 
                                                  variant="outline" 
                                                  className="text-xs"
                                                  onClick={() => {
                                                    // Clear the tags filter
                                                    setFilters(prev => ({ ...prev, tags: [] }));
                                                    
                                                    // Clear the table column filter
                                                    const tagsColumn = table.getColumn('tags');
                                                    if (tagsColumn) {
                                                      tagsColumn.setFilterValue(undefined);
                                                    }
                                                  }}
                                                  disabled={filters.tags.length === 0}
                                                >
                                                  Clear
                                                </Button>
                                                <Button 
                                                  size="sm" 
                                                  className="text-xs"
                                                  onClick={() => {
                                                    // Close the popover by simulating a click outside
                                                    const closeEvent = new MouseEvent('click', {
                                                      bubbles: true,
                                                      cancelable: true,
                                                      view: window
                                                    });
                                                    document.dispatchEvent(closeEvent);
                                                  }}
                                                >
                                                  Apply
                                                </Button>
                                              </div>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      );
                                    }

                                    // Default: no filter
                                    return null;
                                  })()}
                                  </React.Fragment>
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        </React.Fragment>
                      ))}
                  </TableHeader>
                  <TableBody>
                    <ProductsTableFallback 
                      columns={columns}
                      loading={loading}
                      filteredData={filteredData}
                      debouncedSearchTerm={debouncedSearchTerm}
                      filters={filters}
                      handleClearFilters={handleClearFilters}
                      handleRefresh={handleRefresh}
                    />
                    
                    {!loading && filteredData.length > 0 && 
                      table.getRowModel().rows.map((row, index) => {
                        const productId = row.original.id;
                        
                        return (
                          <React.Fragment key={row.id}>
                            <TableRow 
                              data-state={row.getIsSelected() && "selected"}
                              className={cn(
                                "border-b border-gray-200 transition-colors hover:bg-slate-950/15",
                                row.getIsSelected() ? "bg-slate-950/18" : index % 2 === 0 ? "bg-slate-950/5" : "bg-slate-950/11",
                                "cursor-pointer",
                                "h-0 leading-tight"
                              )}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                const isActionClick = !!target.closest('button, input, [role="combobox"], [data-editable="true"]');
                                if (!isActionClick && productId) {
                                  handleRowClick(productId);
                                }
                              }}
                            >
                              {row.getVisibleCells().map((cell) => {
                                const columnId = cell.column.id;
                                const hideOnMobileClass = ['brand', 'barcode', 'created_at', 'tags'].includes(columnId) ? 'hidden md:table-cell' : '';
                                
                                // Special styling for expander column
                                if (columnId === 'expander') {
                                  return (
                                    <TableCell 
                                      key={cell.id} 
                                      className="px-1 py-1 w-9"
                                      data-column-id={columnId}
                                    >
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                  );
                                }
                                
                                const isActionsColumn = columnId === 'actions';
                                const actionsClass = isActionsColumn ? 'sticky right-0 z-20 border-l border-slate-300/40' : '';
                                const cellBgClass = isActionsColumn ? (row.getIsSelected() ? 'bg-slate-950/18' : index % 2 === 0 ? 'bg-slate-950/5' : 'bg-slate-950/11') : '';
                                
                                // Special cell rendering for specific column types
                                if (columnId === 'brand' && row.getValue('brand')) {
                                  return (
                                    <TableCell 
                                      key={cell.id} 
                                      className={`px-2 py-0 ${hideOnMobileClass} ${actionsClass} ${cellBgClass}`}
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
                                
                                // Default cell rendering
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
                            
                            {/* Render expanded row content */}
                            <AnimatePresence initial={false}>
                              {row.getIsExpanded() && renderExpandedRow(row, index)}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })
                    }
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          </div>
        </section>

        {/* PAGINATION - Fixed to viewport bottom */}
        <div 
          className="fixed left-0 right-0 bottom-0 z-50 
                     h-12 bg-slate-100 border-t border-slate-300/40
                     flex items-center justify-between px-4"
        >
          <div className="flex space-x-2">
            <Button size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft />
            </Button>
            <Button size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight />
            </Button>
          </div>

          <span className="text-sm text-slate-600">
            {(() => {
              const { pageIndex, pageSize } = table.getState().pagination;
              const total = table.getFilteredRowModel().rows.length;
              const start = pageIndex * pageSize + 1;
              const end = Math.min(total, start + pageSize - 1);
              return `Showing ${start}-${end} of ${total}`;
            })()}
          </span>

          <div className="flex items-center space-x-2">
            <span className="text-sm">Show</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={v => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

// Updated CSS helper
// @ts-ignore - Ignore CSS properties in string literal
const headerShadowStyle = `
thead tr:first-child { 
  box-shadow: 0 2px 4px rgb(0 0 0 / .05); 
}
/* still keep the left-hand divider shadow */
[data-column-id="actions"] { background: transparent !important; }
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
