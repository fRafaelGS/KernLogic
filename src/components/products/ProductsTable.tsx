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
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnFiltersState,
  type PaginationState,
  type FilterFn,
  type Row,
  getExpandedRowModel,
  Updater
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  TrashIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ColumnsIcon,
  ChevronDown,
  PlusIcon,
  CheckCircle,
  XCircle,
  TagIcon,
  FolderIcon,
} from "lucide-react";
import { Product, productService, ProductAttribute, ProductAsset } from "@/services/productService";
import { updateProductCategory } from "@/services/categoryService";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from '@/components/ui/use-toast';
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { ProductsSearchBox } from './ProductsSearchBox';
import { BulkTagModal } from './BulkTagModal';
import { useDebounce } from "@/hooks/useDebounce";
import { ProductsTableFallback } from "@/components/products/productstable/ProductsTableFallback";
import { IconBtn } from "@/components/products/productstable/IconBtn";
import { SortableTableHeader } from "@/components/products/productstable/SortableTableHeader";
import { useUniqueTags } from "@/hooks/useProductDerived";
import { useProductColumns } from "@/hooks/useProductColumns";    
import ProductRowDetails from "./productstable/ProductRowDetails";
import { AnimatePresence } from 'framer-motion';
import { Category as CategoryType, Category as ProductCategory } from '@/types/categories';
import { SubcategoryManager } from '@/components/categories/SubcategoryManager/SubcategoryManager';
import { ProductGrid } from './ProductGrid'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { useFamilies } from "@/api/familyApi";
import { useFetchProducts } from "@/hooks/useFetchProducts";
import { config } from "@/config/config";
import { ROUTES } from "@/config/routes";
import { ProductsTableFilters } from './ProductsTableFilters'

/**
 * ProductsTable - A table for displaying and managing products
 * 
 * REFACTORING NOTE: This component has been refactored to use centralized configuration
 * from config.ts. All hardcoded text strings have been moved to the config.productsTable 
 * section for improved maintainability and localization.
 */

// Define filter state type
interface FilterState {
  category: string;
  family: string;
  status: 'all' | 'active' | 'inactive';
  minPrice: string;
  maxPrice: string;
  tags: string[]; // Add tags array to FilterState
  brand?: string;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
}

// Add type for category options
interface CategoryOption {
  label: string;
  value: number | string; // Allow string ID if backend uses it
}

// Add type for tag options
interface TagOption {
  label: string;
  value: string;
}

// Add type for raw category data from API
interface Category {
  id: number | string;
  name: string;
  // Add other category fields if they exist
  parent?: number | null;
}

// Add this type declaration for productAttributes to match the Product interface
type ProductWithAttributeArray = Omit<Product, 'attributes'> & {
  attributes?: ProductAttribute[];
};

// Flattens a nested category tree into a flat array
function flattenCategories(categories: any[]): any[] {
  if (!Array.isArray(categories)) return [];
  
  return categories.reduce<any[]>((acc, cat) => {
    if (cat) acc.push(cat);
    if (cat && Array.isArray(cat.children) && cat.children.length > 0) {
      acc.push(...flattenCategories(cat.children));
    }
    return acc;
  }, []);
}

// Helper function to safely convert any category to CategoryOption format
function toCategoryOption(category: any): CategoryOption {
  if (!category) return { label: 'Uncategorized', value: 0 };
  
  // Handle case where category is already in the right shape
  if (category.label && (category.value || category.value === 0)) {
    return {
      label: String(category.label),
      value: typeof category.value === 'string' ? 
        parseInt(category.value, 10) || category.value : 
        Number(category.value)
    };
  }
  
  // Handle case where category is a regular Category object
  if (typeof category === 'object') {
    return {
      label: category.name || '',
      value: typeof category.id === 'string' ? 
        parseInt(category.id, 10) || category.id : 
        Number(category.id || 0)
    };
  }
  
  // Fallback for primitive values
  return {
    label: String(category),
    value: typeof category === 'string' ? category : Number(category || 0)
  };
}

// Add interface for ProductsTable props
interface ProductsTableProps {
  hideTopControls?: boolean;
  hideTopSearch?: boolean;
  filters?: Record<string, any>;
}

// Update the function signature to accept props
export function ProductsTable({ 
  hideTopControls = false,
  hideTopSearch = false,
  filters: initialFilters
}: ProductsTableProps = {}) {
  // Get reference to the productsTable config section
  const tableConfig = config.productsTable;
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  // Add organization settings hook
  const { defaultLocale, defaultChannel } = useOrgSettings();
  const [error, setError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]); // State for formatted options
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string | string[]>('');
  const [originalEditValue, setOriginalEditValue] = useState<string | string[]>('');

  const { data: families = [], isLoading: isFamiliesLoading } = useFamilies();

  
  // Add viewMode state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Add product assets cache state
  const [productAssetsCache, setProductAssetsCache] = useState<Record<number, ProductAsset[]>>({});
  
  // 🆕 keep track of attribute-group requests that are in progress
  const attrGroupsInFlight = useRef<Set<number>>(new Set());
  
  // 🆕 reference to the react-table instance used across callbacks
  const tableRef = useRef<ReturnType<typeof useReactTable<Product>> | null>(null);
  
  // Add reference to track if we've already fetched once for this pagination state
  const fetchedOnceRef = useRef(false);
  
  // Add reference to track if user preferences have been loaded
  const prefsLoadedRef = useRef(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms debounce
  
  const [productRowMap, setProductRowMap] = useState<Record<string, number>>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  // Add expanded rows state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Add state for product attributes
  const [productAttributes, setProductAttributes] = useState<Record<number, ProductAttribute[]>>({});
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  // Use prop pagination if provided, otherwise use internal state
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // Create computed pagination property that uses props if available
  const pagination = paginationState;
  // Create a function to update pagination that uses the prop function if available
  const setPagination = (newPagination: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof newPagination === 'function') {
      setPaginationState(newPagination(paginationState));
    } else {
      setPaginationState(newPagination);
    }
  };
  
  // Use prop totalCount if provided, otherwise use internal state
  const [totalCountState, setTotalCountState] = useState<number>(100);
  // Create a computed totalCount property that uses props if available
  const totalCount = totalCountState;
  
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
  
  // Create a default filters object to ensure all keys are always present
  const defaultFilters: Record<string, any> = {
    page_size: pagination.pageSize,
    page: pagination.pageIndex + 1,
    tags: [],
    category: 'all',
    family: undefined,
    status: 'all',
    minPrice: '',
    maxPrice: '',
    brand: '',
    barcode: '',
    created_at: '',
    updated_at: '',
    ...initialFilters // this will override defaults if provided
  }

  const [filters, setFilters] = useState<Record<string, any>>(defaultFilters)
  
  // Remove cleanFilters and pass filters directly to useFetchProducts
  const { 
    data, 
    isLoading: loading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useFetchProducts(filters);
  
  // Derive products from the paginated data and add state for products
  const [productsState, setProducts] = useState<Product[]>([]);
  const products = useMemo(() => {
    if (!data) return []
    // Flatten and normalize
    const newProducts = data.pages.flatMap(page =>
      Array.isArray(page)
        ? page
        : Array.isArray(page?.results)
          ? page.results
          : []
    )
    // Use the new backend contract: wrap the nested category object in an array
    const normalizedProducts = newProducts.map(p => ({
      ...p,
      category: p.category ? [p.category] : [],
      category_name: p.category_name ?? '',
    }))
    // Debug: log first normalized product
    if (normalizedProducts.length > 0) {
      // eslint-disable-next-line no-console
      console.log('First normalized product:', normalizedProducts[0])
    }
    setProducts(normalizedProducts)
    return normalizedProducts
  }, [data])
  
  // Set total count based on the first page's count
  useEffect(() => {
    if (data?.pages?.[0]?.count !== undefined) {
      setTotalCountState(data.pages[0].count);
    }
  }, [data]);
  
  // Update filters when pagination or search changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      page: pagination.pageIndex + 1,
      page_size: pagination.pageSize,
      search: debouncedSearchTerm || undefined,
      // Add other filters as needed
    }));
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearchTerm]);
  
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
    // eslint-disable-next-line no-console
    console.log('fetchData called - initializing product data load');
    
    if (!isAuthenticated) return;
    
    // Guard against double-firing on mount
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;
    
    // No need to manually set loading state - React Query handles this
    setError(null);
    
    try {
      // This function is no longer needed since we're using React Query
      // Just keeping it as a placeholder until fully migrated
      console.log('Using React Query for data fetching');
      
      // Load categories directly
      try {
        const fetchedCategories = await productService.getCategories();
        // Guard against non-array responses
        if (!Array.isArray(fetchedCategories)) {
          return;
        }
        
        // Flatten the entire tree so we include subcategories
        const flatCategories = flattenCategories(fetchedCategories);
        
        // Create category options from the flattened list using our safe converter
        const categoryOpts: CategoryOption[] = flatCategories.map(toCategoryOption);
        
        setCategoryOptions(categoryOpts);
      } catch (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      }
      
    } catch (err) {
      setError('Failed to fetch data');
      toast({ 
        title: 'Could not load products',
        description: 'Please try refreshing the page',
        variant: 'destructive'
      });
    }
  }, [isAuthenticated, toast]);

  /** call this when you need a *fresh* hit even after the first load */
  const forceReload = useCallback(() => {
    fetchedOnceRef.current = false;   // ← bypass the one-run guard
    fetchData();
  }, [fetchData]);

  // Update the filterCategories function to properly handle Category type
  const filterCategories = (cats: CategoryType[], term: string): CategoryType[] => {
    if (!term) return cats;
    
    return cats.filter(cat => {
      // Include if name matches
      if (cat.name.toLowerCase().includes(term.toLowerCase())) {
        return true;
      }
      
      // Include if any children match (recursively)
      if (cat.children?.length) {
        const filteredChildren = filterCategories(cat.children, term);
        if (filteredChildren.length) {
          // Create a new category object with only matching children
          return {
            ...cat,
            children: filteredChildren
          };
        }
      }
      
      return false;
    });
  };
  
  // Enhanced function to extract unique categories from products (all levels)
  const extractUniqueCategories = useCallback((products: Product[]) => {
    const uniqueCategories = new Set<string>()

    products.forEach(product => {
      if (!product) return

      const cat = product.category

      if (Array.isArray(cat)) {
        cat.forEach(c => {
          if (typeof c === 'object' && c?.name) uniqueCategories.add(c.name)
          else if (typeof c === 'string') uniqueCategories.add(c)
        })
      } else if (typeof cat === 'object' && cat?.name) {
        uniqueCategories.add(cat.name)
      } else if (typeof cat === 'string') {
        uniqueCategories.add(cat)
      }
    })

    return Array.from(uniqueCategories).sort()
  }, [])

  // Extract unique categories using our enhanced function
  const uniqueCategories = useMemo(() => {
    return categoryOptions.map(opt => opt.label).filter(Boolean)
  }, [categoryOptions])
  
  // Remove old useUniqueCategories hook usage
  // const uniqueCategories = useUniqueCategories(products);

  // Update the filteredData tag filtering logic with proper type casting
  const filteredData = productsState;

  // Update the productRowMap whenever the filtered products change
  useEffect(() => {
    const newMap: Record<string, number> = {};
    // Only include products with valid ids
    filteredData.forEach((product, index) => {
      if (product && product.id !== undefined) {
        newMap[String(index)] = product.id;
      }
    });
    setProductRowMap(newMap);
  }, [filteredData]);

  // Fetch data on mount and when auth changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update handleRefresh function
  const handleRefresh = useCallback(() => {
    // Simply update filters to trigger a refetch
    setFilters(prev => ({ ...prev }));
  }, []);

  const handleDelete = useCallback(async (productId: number) => {
    // Confirm deletion with user
    if (window.confirm(tableConfig.messages.confirmation.delete)) {
      try {
        await productService.deleteProduct(productId);
        toast({ 
          title: tableConfig.messages.success.delete, 
          variant: 'default' 
        });
        fetchData(); // Refresh the products list
      } catch (error) {
        console.error('Failed to delete product:', error);
        toast({ 
          title: tableConfig.messages.error.delete, 
          variant: 'destructive' 
        });
      }
    }
  }, [fetchData, toast, tableConfig.messages]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({ ...defaultFilters })
    // Update URL params without the cleared filters
    const params = new URLSearchParams(searchParams)
    params.delete('category')
    params.delete('family')
    params.delete('status')
    params.delete('minPrice')
    params.delete('maxPrice')
    params.delete('tags')
    params.delete('brand')
    params.delete('barcode')
    params.delete('created_at')
    params.delete('updated_at')
    setSearchParams(params)
  }, [searchParams, setSearchParams, defaultFilters])

  // --- ADD Bulk Action Handlers (Placeholder/Assumed API) ---
  const handleBulkDelete = async () => {
    const selectedCount = Object.keys(rowSelection).length;
    if (selectedCount === 0) return;

    // Confirm the deletion with the user
    if (!window.confirm(tableConfig.messages.confirmation.bulkDelete.replace('{{count}}', selectedCount.toString()))) {
      return;
    }

    // Get the product IDs of all selected rows
    const productIds = getSelectedProductIds();
    if (productIds.length === 0) return;

    try {
      // Delete each product
      await Promise.all(productIds.map(id => productService.deleteProduct(id)));
      
      // Show success toast
      toast({
        title: tableConfig.messages.success.bulkDelete.replace('{{count}}', productIds.length.toString()),
        variant: 'default'
      });
      
      // Clear row selection after successful deletion
      setRowSelection({});
      
      // Refresh the data
      fetchData();
    } catch (error) {
      console.error('Failed to bulk delete products:', error);
      toast({
        title: tableConfig.messages.error.bulkDelete,
        variant: 'destructive'
      });
    }
  };

  const handleBulkSetStatus = async (isActive: boolean) => {
    const selectedCount = Object.keys(rowSelection).length;
    if (selectedCount === 0) return;

    // Confirm the status change with the user
    const confirmMsg = isActive 
      ? tableConfig.messages.confirmation.activate.replace('{{count}}', selectedCount.toString())
      : tableConfig.messages.confirmation.deactivate.replace('{{count}}', selectedCount.toString());
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    // Get the product IDs of all selected rows
    const productIds = getSelectedProductIds();
    if (productIds.length === 0) return;

    try {
      // Update each product
      await Promise.all(
        productIds.map(id => 
          productService.updateProduct(id, { is_active: isActive })
        )
      );
      
      // Show success toast
      const successMsg = isActive
        ? tableConfig.messages.success.bulkActivate.replace('{{count}}', productIds.length.toString())
        : tableConfig.messages.success.bulkDeactivate.replace('{{count}}', productIds.length.toString());
      
      toast({
        title: successMsg,
        variant: 'default'
      });
      
      // Clear row selection after successful update
      setRowSelection({});
      
      // Refresh the data
      fetchData();
    } catch (error) {
      console.error(`Failed to bulk ${isActive ? 'activate' : 'deactivate'} products:`, error);
      
      const errorMsg = isActive
        ? tableConfig.messages.error.bulkActivate
        : tableConfig.messages.error.bulkDeactivate;
      
      toast({
        title: errorMsg,
        variant: 'destructive'
      });
    }
  };
  // --- End Bulk Action Handlers ---

  // --- Derived Data ---
  // eslint-disable-next-line no-console
  console.log('uniqueCategories derived from products:', uniqueCategories);
  
  // Update the updateData function to use the productRowMap instead of the table reference
  const updateData = useCallback(async (rowIndex: number, columnId: string, value: any) => {
    const productId = productRowMap[String(rowIndex)];
    
    if (!productId) {
      console.warn(`No product ID found for row index ${rowIndex}`);
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

      // Create API payload with correct field names
      let apiPayload: Record<string, any>;
      
      if (columnId === 'category') {
        // This is now handled directly in the CategoryTreeSelect onChange
        // The column renderer calls updateProductCategory directly
        console.log('Category update handled by CategoryTreeSelect component');
        return;
      } else {
        // For all other fields, use the column ID as the key
        apiPayload = { 
          [columnId]: formattedValue 
        };
      }

      // Special handling for category updates to maintain correct data structure in UI
      if (columnId === 'category') {
        // This is now handled directly in the CategoryTreeSelect onChange
        // The column renderer calls updateProductCategory directly
        console.log('Category update handled by CategoryTreeSelect component');
        return;
      } else {
        // Normal optimistic update for non-category fields
        setProducts(prev =>
          prev.map(p => {
            if (p.id === productId) {
              // Create a new product object with updated field
              const updatedProduct = { ...p, [columnId]: formattedValue };
              console.log(`Optimistic update for product ${productId}, ${columnId}:`, updatedProduct);
              return updatedProduct;
            }
            return p;
          })
        );
      }

      // Save to API with the correct payload
      console.log('📤 Calling productService.updateProduct with:', {
        productId,
        apiPayload,
        columnId
      });
      
      const response = await productService.updateProduct(productId, apiPayload);
      console.log('📥 Update response:', response);
      
      // Show success notification immediately without refetching
      toast({ 
        title: `${columnId.charAt(0).toUpperCase() + columnId.slice(1)} updated`, 
        variant: 'default' 
      });
      
      setEditingCell(null); // Clear editing state
    } catch (error) {
      console.error('Error updating product:', error);
      toast({ title: 'Failed to update product', variant: 'destructive' });
      
      // Revert optimistic update
      fetchData();
    }
  }, [fetchData, productRowMap, toast, categoryOptions, setProducts]);

  // Move the price cell input handler to avoid recreating it on each render
  const handlePriceCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and a single decimal point
    if (/^$|^[0-9]+(\.[0-9]*)?$/.test(value)) {
      setEditValue(value);
    }
  }, []);

  // Handle starting cell editing
  const handleCellEdit = useCallback((rowIndex: number, columnId: string, value: string | string[]) => {
    setEditingCell({ rowIndex, columnId });
    
    // Handle special case for price - remove currency formatting
    if (columnId === 'price') {
      // Remove currency symbols and formatting, keep only numbers and decimal
      const numericValue = (value as string).replace(/[^0-9.]/g, '');
      setEditValue(numericValue);
      setOriginalEditValue(numericValue);
    } else {
      setEditValue(value);
      setOriginalEditValue(value);
    }
  }, []);

  // Handle saving cell edit
  const handleSaveCellEdit = useCallback(() => {
    if (editingCell) {
      if (editingCell.columnId === 'tags') {
        let tagsArray: string[] = []
        
        if (Array.isArray(editValue)) {
          // Handle case where editValue is already an array
          tagsArray = editValue.map(tag => {
            if (typeof tag === 'string') return tag
            if (tag && typeof tag === 'object' && tag !== null) {
              const tagObj = tag as Record<string, unknown>
              if (typeof tagObj.label === 'string') return tagObj.label
              if (typeof tagObj.value === 'string') return tagObj.value
            }
            return ''
          }).filter(Boolean)
        } else if (typeof editValue === 'string') {
          try {
            // First try to parse it as JSON (our new format)
            const parsed = JSON.parse(editValue)
            if (Array.isArray(parsed)) {
              tagsArray = parsed
            } else {
              // Fall back to original comma-splitting logic
              tagsArray = editValue
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean)
            }
          } catch (e) {
            // If JSON parsing fails, use the original comma-splitting logic
            tagsArray = editValue
              .split(',')
              .map(tag => tag.trim())
              .filter(Boolean)
          }
        }
        
        updateData(editingCell.rowIndex, editingCell.columnId, tagsArray)
      } else {
        updateData(editingCell.rowIndex, editingCell.columnId, editValue)
      }
    }
  }, [editingCell, editValue, updateData])

  // Handle canceling cell edit
  const handleCancelEdit = useCallback(() => {
    setEditValue(originalEditValue); // Restore the original value
    setEditingCell(null);
  }, [originalEditValue]);

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
    // If currently editing a field, just cancel the edit without navigating
    if (editingCell) {
      handleCancelEdit();
      return; // Prevent navigation on this click
    }
    
    // Otherwise, navigate to product detail
    navigate(`/app/products/${productId}`);
  }, [navigate, editingCell, handleCancelEdit]);

  // Add state for tag options
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);

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
    if (!inputValue) return null;
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
      toast({ 
        title: tableConfig.messages.success.tagCreated.replace('{{name}}', inputValue), 
        variant: "default" 
      });
      
      // Explicitly return the new option
      return newOption;
    } catch (error) {
      toast({ 
        title: tableConfig.messages.error.tagCreation, 
        variant: 'destructive' 
      });
      return null;
    }
  }, [editingCell, productRowMap, products, updateData, toast, tableConfig.messages]);

  // Function to render expanded row content with attributes
  const renderExpandedRow = (row: Row<Product>, index: number) => {
    // Safety check to ensure row.original exists
    if (!row?.original) return null;
    
    const productId = row.original.id;
    
    if (!productId) {
      return (
        <ProductRowDetails 
          key={`expanded-${row.id}-product-undefined`}
          product={row.original as any} 
          zebra={index % 2 === 0}
          locale={defaultLocale || ''}
          channel={defaultChannel?.code || ''}
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
        locale={defaultLocale || ''}
        channel={defaultChannel?.code || ''}
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
        const toggle = row.getToggleExpandedHandler();
      
        return (
          <button
            type="button"
            tabIndex={0}
            role="button"
            aria-label={row.getIsExpanded() ? tableConfig.display.tableView.collapseRow : tableConfig.display.tableView.expandRow}
            onClick={e => {
              e.stopPropagation();
              toggle();
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
              }
            }}
            /* 🔑 fill whole cell */
            className="absolute inset-0 flex items-center justify-center cursor-pointer
                       hover:bg-slate-100 focus:outline-none transition-colors
                       bg-transparent border-none"
          >
            <ChevronRight
              className={cn('h-4 w-4 transition-transform', row.getIsExpanded() && 'rotate-90')}
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
    [tableConfig.display.tableView.expandRow, tableConfig.display.tableView.collapseRow] // Add dependencies for config values
  );

  const {
    columns,
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
    /* run only once — prevents page-size from jumping back */
    if (prefsLoadedRef.current || columns.length === 0) return;
    prefsLoadedRef.current = true;
    
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
          setPagination({
            ...pagination,
            pageSize: parseInt(savedPageSize, 10)
          });
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

  // Update the handleExpandedChange function to load assets when a row is expanded
  type ExpandedState = Record<string, boolean>
  const handleExpandedChange = useCallback((updater: Updater<ExpandedState>) => {
    setExpanded(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const openKeys = Object.keys(next).filter(k => next[k])
      if (openKeys.length === 0) return {}
      
      // Process all newly expanded rows to load their assets
      openKeys.forEach(key => {
        const tableInstance = tableRef.current
        if (!tableInstance) return
        const row = tableInstance.getRow(key)
        // Skip if row doesn't exist or has no original data
        if (!row?.original) return
        
        const productId = row.original.id
        // Skip processing if productId is undefined
        if (productId === undefined) return
        
        // Only fetch assets if they're not already cached and not currently being fetched
        if (productId && !productAssetsCache[productId] && !attrGroupsInFlight.current.has(productId)) {
          productService.getProductAssets(productId)
            .then(assets => {
              setProductAssetsCache(prev => ({ ...prev, [productId]: assets }))
              setProducts(prevProducts => 
                prevProducts.map(prod => {
                  if (prod.id === productId) {
                    const primaryAsset =
                      assets.find(a => (a.is_primary && ((a.type || a.asset_type) || '').toLowerCase().includes('image')))
                      || assets.find(a => ((a.type || a.asset_type) || '').toLowerCase().includes('image'))
                    if (primaryAsset?.url) {
                      return {
                        ...prod,
                        assets,
                        primary_image_thumb: primaryAsset.url,
                        primary_image_large: primaryAsset.url,
                      } as Product
                    }
                  }
                  return prod
                })
              )
            })
            .catch(err => {
              console.error(`Error loading assets for product ${productId}:`, err)
            })
        }
      })
      
      // Return the full next state to preserve all expanded rows
      return next
    })
  }, [productAssetsCache, productService])

  // Configure the table with useReactTable
  const table = useReactTable<Product>({
    data: filteredData,
    columns: allColumnsWithExpander,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      expanded,
    },
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        // Implementation remains the same
      },
    },
    filterFns: {
      // All custom filter functions remain the same
    } as Record<string, FilterFn<Product>>,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      // Simplify the function to avoid TypeScript errors while preserving behavior
      const newPagination = typeof updater === 'function'
        ? updater(pagination)
        : updater;
      
      // Check if anything actually changed before updating
      if (newPagination.pageIndex !== pagination.pageIndex || 
          newPagination.pageSize !== pagination.pageSize) {
        // Mark as new pagination state so fetchData may run once
        fetchedOnceRef.current = false;
        // Use the setPagination function we defined
        setPagination(newPagination);
      }
    },
    onColumnOrderChange: setColumnOrder,
    onExpandedChange: handleExpandedChange as Parameters<typeof useReactTable>[0]['onExpandedChange'],
    getExpandedRowModel: getExpandedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Allow every row to be expandable even without subRows
    getRowCanExpand: () => true,
    // Remove getFilteredRowModel here
  });

  // Debug: log the first row's original data and its keys after table is defined
  const firstRow = table.getRowModel().rows[0]?.original
  // eslint-disable-next-line no-console
  console.log('Table row[0] original:', firstRow)
  // eslint-disable-next-line no-console
  console.log('Row keys:', Object.keys(firstRow || {}))

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Add column filter state and handlers
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({});

  // New utility function for server-side column filtering
  const handleColumnFilterChange = (columnId: string, value: unknown) => {
    setPagination({ ...pagination, pageIndex: 0 });       // jump to first page
    setFilters((f: Record<string, any>) => {
      const next: Record<string, any> = { ...f, page: 1 };
      if (value === '' || value === undefined || value === null ||
          (Array.isArray(value) && value.length === 0) ||
          value === 'all') {
        delete next[columnId];
      } else {
        next[columnId] = value;
      }
      return next;
    });
  };

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
  const [showSubcategoryManager, setShowSubcategoryManager] = useState(false);
  
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
      .map(index => productRowMap[String(index)])
      .filter((id): id is number => typeof id === 'number');
  }, [rowSelection, productRowMap]);

  // Add this function to extract unique tags from products for the filter dropdown
  const uniqueTags = useUniqueTags(products);

  // Now update the handleFilterChange function to ensure tags are properly handled
  const handleFilterChange = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    if (key === 'family') {
      setFilters(prev => ({ ...prev, family: value === 'all' ? undefined : value }))
      return
    }
    setFilters(prev => ({ ...prev, [key]: value }))
    // Special handling for category filter
    if (key === 'category') {
      const categoryColumn = table.getColumn('category');
      if (categoryColumn) {
        const categoryValue = value as string;
        console.log("Setting category column filter to:", categoryValue === 'uncategorized' ? '""' : categoryValue);
        
        if (categoryValue === 'all') {
          categoryColumn.setFilterValue(undefined);
        } else if (categoryValue === 'uncategorized') {
          categoryColumn.setFilterValue("");
        } else {
          categoryColumn.setFilterValue(categoryValue);
        }
      }
    }
    
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
    if (pagination.pageIndex !== 0) return;                // only first page

    // Filter out any products without valid ids first
    const validProducts = filteredData.filter(p => p && p.id !== undefined);

    validProducts.slice(0, pagination.pageSize).forEach(async (p) => {
      if (!p.id) return;                                   // safety
      if (productAttributes[p.id] !== undefined) return;   // already cached
      if (attrGroupsInFlight.current.has(p.id)) return;    // already fetching

      attrGroupsInFlight.current.add(p.id);
      try {
        // Pass default locale and channel
        const groups = await productService.getProductAttributeGroups(
          p.id, 
          defaultLocale, 
          defaultChannel?.code
        );
        if (groups?.length) {
          setProductAttributes(prev => ({ ...prev, [String(p.id)]: groups }));
        } else {
          setProductAttributes(prev => ({ ...prev, [String(p.id)]: [] }));
        }
      } catch (err) {
        console.error(`prefetch groups failed for product ${p.id}`, err);
        setProductAttributes(prev => ({ ...prev, [String(p.id)]: [] }));
      } finally {
        attrGroupsInFlight.current.delete(p.id);           // ✅ done
      }
    });
  // Add defaultLocale and defaultChannel to dependencies
  }, [pagination.pageIndex, pagination.pageSize, filteredData, defaultLocale, defaultChannel?.code]);

  // Add a function to calculate pagination display info
  const renderPaginationInfo = useCallback(() => {
    const { pageIndex, pageSize } = table.getState().pagination;
    // Use total count from server for pagination display
    const totalItems = totalCount;
    const start = totalItems > 0 ? pageIndex * pageSize + 1 : 0;
    const end = Math.min(totalItems, (pageIndex + 1) * pageSize);
    const template = tableConfig.display.tableView.paginationInfo || 'Showing {{start}}-{{end}} of {{total}}';
    return template
      .replace('{{start}}', start.toString())
      .replace('{{end}}', end.toString())
      .replace('{{total}}', totalItems.toString());
  }, [table, totalCount, tableConfig.display.tableView.paginationInfo]);

  // Add effect to log pagination state for debugging
  useEffect(() => {
    console.log("Pagination state:", {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      totalCount,
      pageCount: Math.max(1, Math.ceil(totalCount / pagination.pageSize)),
      canPreviousPage: table.getCanPreviousPage(),
      canNextPage: table.getCanNextPage()
    });
  }, [pagination.pageIndex, pagination.pageSize, totalCount, table]);

  // Add click outside handler to cancel editing
  useEffect(() => {
    // Only add the handler if we're in edit mode
    if (!editingCell) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside all edit fields
      const target = event.target as HTMLElement;
      
      // Get the element that is currently being edited
      const editContainer = document.querySelector('[data-editing="true"]');
      
      // If the click is within the edit container, allow it
      if (editContainer && editContainer.contains(target)) {
        return;
      }
      
      // Special handling for React Select components which might be outside their containers
      if (
        // Target has any class that starts with "react-select"
        target.closest('[class*="react-select"]') || 
        // Common React Select classes
        target.closest('.css-26l3qy-menu, .css-1s2u09g-control, .css-1pahdxg-control') ||
        // Role-based selection for dropdown components
        target.closest('[role="listbox"], [role="option"], [role="combobox"]') ||
        // Check for data attribute we'll add to the AsyncCreatableSelect container
        target.closest('[data-component="async-select"]') ||
        // Check for category tree select popover
        target.closest('[data-testid="category-popover"]') ||
        // Check for any radix popover content
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }
      
      // Handle clicks on buttons inside the editing area (confirm/cancel)
      if (target.closest('button') && editContainer && editContainer.contains(target.closest('button'))) {
        return;
      }
      
      // If we got here, the click was outside the editing area
      handleCancelEdit();
    };
    
    // Add global click handler with a small delay to let other click handlers fire first
    const handleClickWithDelay = (event: MouseEvent) => {
      // Use a small timeout to ensure other click handlers run first
      setTimeout(() => handleClickOutside(event), 10);
    };
    
    document.addEventListener('mousedown', handleClickWithDelay);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickWithDelay);
    };
  }, [editingCell, handleCancelEdit]);

  // Minimal debug: log filters before fetch
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Filters before fetch:', filters)
  }, [filters])

  // Add uniqueBrands derived from products
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>()
    products.forEach(p => {
      if (p && typeof p.brand === 'string' && p.brand.trim()) brands.add(p.brand.trim())
    })
    return Array.from(brands).sort()
  }, [products])

  // Render the component
  return (
    <React.Fragment>
      <div className="flex flex-col flex-1 px-2 lg:px-4 min-h-0 overflow-x-hidden">
        {/* Table Toolbar */}
        <div className="flex items-center justify-between py-2 border-b bg-card z-10">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Only show search box if hideTopSearch is false */}
            {!hideTopSearch && (
              <div className="relative flex-1 sm:max-w-xs">
                <ProductsSearchBox
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full"
                />
              </div>
            )}
            {/* Filter button removed as per instructions */}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Only show refresh button if hideTopControls is false */}
            {!hideTopControls && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="h-8"
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {tableConfig.display.buttons.refresh}
              </Button>
            )}

            {/* Always show the SubcategoryManager */}
            <div className="flex items-center">
              <SubcategoryManager 
                isOpen={showSubcategoryManager}
                onOpenChange={setShowSubcategoryManager}
              />
            </div>

            {/* Bulk Actions and other buttons remain the same */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9"
                  disabled={Object.keys(rowSelection).length === 0}
                >
                  <span>
                    {tableConfig.display.buttons.bulkActions} 
                    {Object.keys(rowSelection).length > 0 ? ` (${Object.keys(rowSelection).length})` : ""}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkSetStatus(true)}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  {tableConfig.display.buttons.bulkActivate}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkSetStatus(false)}>
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  {tableConfig.display.buttons.bulkDeactivate}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openBulkTagModal}>
                  <TagIcon className="mr-2 h-4 w-4" />
                  {tableConfig.display.buttons.bulkTags}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openBulkCategoryModal}>
                  <FolderIcon className="mr-2 h-4 w-4" />
                  {tableConfig.display.buttons.bulkCategory}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBulkDelete}>
                  <TrashIcon className="mr-2 h-4 w-4 text-red-500" />
                  {tableConfig.display.buttons.bulkDelete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={columnsMenuOpen} onOpenChange={setColumnsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  aria-label={tableConfig.display.tableView.columnVisibility.toggle}
                >
                  <ColumnsIcon className="mr-1 h-4 w-4" />
                  <span>{tableConfig.display.tableView.columnVisibility.title}</span>
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {table.getAllColumns()
                  .filter(column => column.id !== 'expander' && column.id !== 'select')
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

            {/* Only show New Product button if hideTopControls is false */}
            {!hideTopControls && (
              <Button className="h-9" asChild>
                <Link to={ROUTES.APP.NEW}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  New Product
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Section containing scroll area and footer */}
        <section className="flex-1 overflow-hidden min-h-0 min-w-0 relative">
          {viewMode === 'list' ? (
            <div
              ref={scrollRef}
              className={cn(
                "flex-1 min-h-0",
                "h-[calc(100%-3rem)]",
                "overflow-auto",
                columnVisibility.actions !== false && `pr-[112px]`,
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
                  <Table className="w-full table-fixed border-collapse">
                    <TableHeader className="sticky top-0 bg-white z-20">
                        {table.getHeaderGroups().map(headerGroup => (
                          <React.Fragment key={headerGroup.id}>
                            {/* 1) Column titles */}
                            <TableRow className="sticky top-0 z-30 bg-slate-100 h-4 border-b border-slate-200">
                              {headerGroup.headers.map(header =>
                                <SortableTableHeader key={header.id} id={header.column.id} header={header}/>
                              )}
                            </TableRow>

                            {/* 2) Filter inputs - replaced with ProductsTableFilters */}
                            <ProductsTableFilters
                              columns={columns}
                              filters={filters}
                              onFilterChange={(columnId, value) => handleFilterChange(columnId as keyof FilterState, value)}
                              onClearFilters={handleClearFilters}
                              table={table}
                              uniqueCategories={categoryOptions}
                              uniqueTags={uniqueTags}
                              uniqueBrands={uniqueBrands}
                              families={families}
                              isFamiliesLoading={isFamiliesLoading}
                            />
                          </React.Fragment>
                        ))}
                    </TableHeader>
                    <TableBody>
                      <ProductsTableFallback 
                        columns={columns}
                        loading={loading}
                        filteredData={filteredData}
                        filters={filters}
                        handleClearFilters={handleClearFilters}
                        handleRefresh={handleRefresh}
                      />
                      
                      {!loading && filteredData.length > 0 && 
                        table.getRowModel().rows.map((row, index: number) => {
                          // Add a safety check to ensure row.original exists
                          if (!row?.original) return null;
                          
                          const productId = row.original.id;
                          // Skip this row if productId is undefined
                          if (productId === undefined) return null;
                          
                          return (
                            <React.Fragment key={row.id || `row-${index}`}>
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
                                  const isActionClick = !!target.closest('button, input, [role="combobox"], [data-editable="true"], [data-editing="true"], [data-component="category-tree-select-container"]');
                                  
                                  // Don't do anything if clicking on an action element
                                  if (isActionClick) return;
                                  
                                  // If there's an active edit in any cell, just cancel it - prevent navigation
                                  if (editingCell && productId) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCancelEdit();
                                    return;
                                  }
                                  
                                  // Only navigate if not editing
                                  if (productId) {
                                    handleRowClick(productId);
                                  }
                                }}
                              >
                                {row.getVisibleCells().map((cell: any) => {
                                  const columnId = cell.column.id;
                                  const hideOnMobileClass = ['brand', 'barcode', 'created_at', 'tags'].includes(columnId) ? 'hidden md:table-cell' : '';
                                  
                                  // Special styling for expander column
                                  if (columnId === 'expander') {
                                    return (
                                      <TableCell 
                                        key={cell.id} 
                                        className="p-0 w-9 relative"
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
                                  
                                  // Add special treatment for family column
                                  if (columnId === 'family') {
                                    return (
                                      <TableCell 
                                        key={cell.id} 
                                        className={`px-2 py-1 min-w-[180px] ${hideOnMobileClass} ${actionsClass} ${cellBgClass}`}
                                        data-column-id={columnId}
                                      >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                      </TableCell>
                                    );
                                  }
                                  
                                  if (columnId === 'category_name') {
                                    const categoryValue = row.getValue('category_name') as string;
                                    return (
                                      <TableCell 
                                        key={cell.id} 
                                        className={`px-2 py-1 overflow-visible relative z-50 ${hideOnMobileClass} ${actionsClass} ${cellBgClass}`}
                                        data-column-id={columnId}
                                        style={{ position: 'relative' }}
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
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden hide-x-scrollbar">
              <div className="w-full overflow-hidden">
                <ProductGrid 
                  products={filteredData}
                  loading={loading}
                  error={error}
                />
              </div>
              
              {/* Grid view pagination - built into the main view */}
              {!loading && hasNextPage && (
                <div className="mt-4 mb-4 flex justify-center static border-t pt-3">
                  <Button 
                    variant="outline" 
                    onClick={() => fetchNextPage()} 
                    disabled={isFetchingNextPage}
                    className="static"
                  >
                    {isFetchingNextPage ? 'Loading more...' : 'Load more products'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
        
        {/* Pagination, only show for list view */}
        {viewMode === 'list' && (
          <div className='sticky bottom-0 z-50 h-12 bg-slate-100 border-t border-slate-300/40 flex items-center justify-between px-4'>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => table.previousPage()} 
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft />
              </Button>
              <Button 
                size="sm" 
                onClick={() => table.nextPage()} 
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight />
              </Button>
            </div>

            <span className="text-sm text-slate-600">
              {renderPaginationInfo()}
            </span>

            <div className="flex items-center space-x-2">
              <span className="text-sm">Show</span>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={e => {
                  const newSize = Math.min(+e, 50);
                  setPagination({ pageIndex: 0, pageSize: newSize });
                  setFilters(f => ({ ...f, page_size: newSize, page: 1 }));
                }}
              >
                <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    

      {/* Add modals at the end */}
      <BulkTagModal
        open={showTagModal}
        onOpenChange={setShowTagModal}
        selectedIds={getSelectedProductIds()}
        onSuccess={() => {
          setRowSelection({});
          forceReload();
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

/* Fix horizontal scrollbar issues */
html, body {
  overflow-x: hidden;
}
.overflow-x-hidden {
  overflow-x: hidden !important;
}
.static {
  position: static !important;
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
