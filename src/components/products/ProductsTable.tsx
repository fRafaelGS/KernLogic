import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Product, productService, ProductImage } from "@/services/productService";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// Define filter state type
interface FilterState {
  category: string;
  status: 'all' | 'active' | 'inactive';
  minPrice: string;
  maxPrice: string;
  minStock: string;
  maxStock: string;
}

export function ProductsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    status: 'all',
    minPrice: '',
    maxPrice: '',
    minStock: '',
    maxStock: '',
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    // Hide some columns by default for better initial UX
    type: false,
    barcode: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [editingCell, setEditingCell] = useState<{ rowId: string, columnId: string } | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Function to fetch products
  const fetchProducts = async () => {
    if (!isAuthenticated) {
        console.warn('[fetchProducts] Called when not authenticated. Aborting.');
        setProducts([]);
        setLoading(false); 
        return;
    }
    console.log('[fetchProducts] Attempting fetch...');
    try {
      const data = await productService.getProducts();
      // --- DEBUG LOGS ---
      console.log('[ProductsTable.fetchProducts] Data received from service:', data);
      console.log('[ProductsTable.fetchProducts] Is data an array?:', Array.isArray(data));
      // --- END DEBUG LOGS ---
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products via service:', error);
      if (error.response?.status === 401) {
         toast.error('Authentication error. Please log in again.');
      } else {
        toast.error(error.message || 'Failed to load products');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load products *only* when authenticated
  useEffect(() => {
    console.log('[ProductsTable Effect] Running. IsAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      setLoading(true);
      console.log('[ProductsTable Effect] Authenticated, fetching products...');
      fetchProducts();
    } else {
      console.log('[ProductsTable Effect] Not authenticated, clearing products and stopping load.');
      setProducts([]);
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  // Handle refresh button click
  const handleRefresh = () => {
    if (isAuthenticated) {
        console.log('Manually refreshing products list');
        setLoading(true);
        fetchProducts();
    } else {
        console.log('Manual refresh skipped, not authenticated.');
        toast.info('Please log in to refresh products.');
    }
  };
  
  const handleEdit = (productId: number) => {
    navigate(`/app/products/${productId}/edit`);
  };

  const handleDelete = async (productId: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(productId);
        toast.success('Product marked as inactive successfully');
        fetchProducts();
      } catch (error: any) {
        console.error('Error deleting product via service:', error);
        toast.error(error.message || 'Failed to delete product');
      }
    }
  };

  const handleFilterToggle = () => {
    setIsFilterOpen(prev => !prev);
  };

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      category: 'all',
      status: 'all',
      minPrice: '',
      maxPrice: '',
      minStock: '',
      maxStock: '',
    });
    // Optionally close the filter panel on clear
    // setIsFilterOpen(false);
  };

  // --- ADD Bulk Action Handlers (Placeholder/Assumed API) ---
  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection)
      .map(index => filteredProducts[parseInt(index, 10)]?.id)
      .filter((id): id is number => typeof id === 'number');
      
    if (selectedIds.length === 0) {
        toast.error("No products selected for deletion.");
        return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} product(s)? This action might be irreversible.`)) {
      console.log("Attempting bulk delete for IDs:", selectedIds);
      try {
        // Placeholder: Replace with actual API call
        // await productService.deleteBulkProducts(selectedIds);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        toast.success(`${selectedIds.length} product(s) deleted successfully (simulated).`);
        setRowSelection({}); // Clear selection
        fetchProducts(); // Refresh data
      } catch (error: any) {
        console.error("Bulk delete error:", error);
        toast.error(error.message || "Failed to delete selected products.");
      }
    }
  };

  const handleBulkSetStatus = async (isActive: boolean) => {
    const selectedIds = Object.keys(rowSelection)
      .map(index => filteredProducts[parseInt(index, 10)]?.id)
      .filter((id): id is number => typeof id === 'number');

    if (selectedIds.length === 0) {
        toast.error(`No products selected to mark as ${isActive ? 'active' : 'inactive'}.`);
        return;
    }
    
    const actionText = isActive ? 'active' : 'inactive';
    console.log(`Attempting to set status (${actionText}) for IDs:`, selectedIds);
    try {
      // Placeholder: Replace with actual API call
      // await productService.updateBulkProductStatus(selectedIds, isActive);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success(`${selectedIds.length} product(s) marked as ${actionText} (simulated).`);
      setRowSelection({}); // Clear selection
      fetchProducts(); // Refresh data
    } catch (error: any) {
      console.error("Bulk status update error:", error);
      toast.error(error.message || `Failed to update status for selected products.`);
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
        return ['all']; // Return default value if not an array
    }
    const categories = new Set(products.map(p => p.category));
    return ['all', ...Array.from(categories)];
  }, [products]);

  // Filter products based on search term AND filters
  const filteredProducts = useMemo(() => {
    // --- DEBUG LOGS ---
    console.log('[ProductsTable.useMemo filteredProducts] Products value:', products);
    console.log('[ProductsTable.useMemo filteredProducts] Is products an array?:', Array.isArray(products));
    // --- END DEBUG LOGS ---
    if (!Array.isArray(products)) {
        console.error('[ProductsTable.useMemo filteredProducts] products is not an array!', products);
        return []; // Return empty array if not an array
    }
    return products.filter(product => {
      // Search term check (existing logic)
      const searchMatch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())); // Added check for category existence

      // Filter checks
      const categoryMatch = filters.category === 'all' || product.category === filters.category;
      const statusMatch = filters.status === 'all' || (filters.status === 'active' ? product.is_active : !product.is_active);
      
      const minPrice = parseFloat(filters.minPrice);
      const maxPrice = parseFloat(filters.maxPrice);
      const productPrice = parseFloat(product.price.toString()); // Ensure product price is number
      const priceMatch =
        (isNaN(minPrice) || productPrice >= minPrice) &&
        (isNaN(maxPrice) || productPrice <= maxPrice);

      const minStock = parseInt(filters.minStock, 10);
      const maxStock = parseInt(filters.maxStock, 10);
      const productStock = parseInt(product.stock.toString(), 10); // Ensure product stock is number
      const stockMatch =
        (isNaN(minStock) || productStock >= minStock) &&
        (isNaN(maxStock) || productStock <= maxStock);

      return searchMatch && categoryMatch && statusMatch && priceMatch && stockMatch;
    });
  }, [products, searchTerm, filters]);

  // --- UPDATE Product Data Function (passed via meta) ---
  const updateData = async (rowIndex: number, columnId: string, value: any) => {
    const productToUpdate = filteredProducts[rowIndex];
    if (!productToUpdate || !productToUpdate.id) return;

    // Optimistic update (optional but good UX)
    // setProducts(old => \n    //   old.map((row, index) => {\n    //     if (index === rowIndex) {\n    //       return { ...old[rowIndex]!, [columnId]: value };\n    //     }\n    //     return row;\n    //   })\n    // );\n

    try {
      // Ensure value is correctly typed for API (esp. numbers)
      let formattedValue = value;
      if (columnId === 'price' || columnId === 'stock') {
        formattedValue = Number(value);
        if (isNaN(formattedValue)) {
           toast.error(`Invalid ${columnId} value.`);
           fetchProducts(); // Revert optimistic update if needed
           return;
        }
      }

      await productService.updateProduct(productToUpdate.id, { [columnId]: formattedValue });
      toast.success(`${columnId.charAt(0).toUpperCase() + columnId.slice(1)} updated.`);
      // Refresh data to ensure consistency after successful API call
      fetchProducts(); 
    } catch (error: any) {
      console.error(`Error updating ${columnId}:`, error);
      toast.error(error.message || `Failed to update ${columnId}.`);
      // Revert optimistic update on error
      fetchProducts(); 
    } finally {
        setEditingCell(null); // Exit editing mode
    }
  };

  // --- Table Columns Definition ---
  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "image",
      header: () => <span className="pl-2">Image</span>,
      cell: ({ row }) => <ProductThumbCell product={row.original} />,
      enableSorting: false,
      enableHiding: true,
      size: 100, // Wider column for thumbnails
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium text-enterprise-900">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "sku",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          SKU
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-enterprise-600">{row.getValue("sku")}</div>,
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-enterprise-600">{row.getValue("category")}</div>,
    },
    {
      accessorKey: "brand",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Brand
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-enterprise-600">{row.getValue("brand") || "-"}</div>,
      enableHiding: true,
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-enterprise-600">{row.getValue("type") || "-"}</div>,
      enableHiding: true,
    },
    {
      accessorKey: "tags",
      header: () => <span className="pl-2">Tags</span>,
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[] | undefined;
        if (!tags || tags.length === 0) return <div className="text-muted-foreground text-sm">-</div>;
        
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="bg-enterprise-50 text-enterprise-600">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: "barcode",
      header: () => <span className="pl-2">Barcode</span>,
      cell: ({ row }) => <div className="text-enterprise-600 font-mono text-xs">{row.getValue("barcode") || "-"}</div>,
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row, column, table }) => {
        const initialValue = parseFloat(row.getValue("price")) || 0;
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
        const [value, setValue] = useState(initialValue.toFixed(2));

        useEffect(() => {
          // Update local state if initial value changes (e.g., after successful update)
          setValue(initialValue.toFixed(2));
        }, [initialValue]);

        const onBlur = () => {
          if (value !== initialValue.toFixed(2)) {
            (table.options.meta as any)?.updateData(row.index, column.id, value);
          } else {
              setEditingCell(null); // Exit editing if value didn't change
          }
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur(); // Trigger blur to save
          } else if (e.key === 'Escape') {
            setValue(initialValue.toFixed(2)); // Revert
            setEditingCell(null);
          }
        };

        return isEditing ? (
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            autoFocus // Focus input when editing starts
            className="h-8 px-2 py-1 text-sm"
          />
        ) : (
          <div 
            className="text-enterprise-700 cursor-pointer px-2 py-1 rounded hover:bg-slate-100 min-h-[32px]" // Make clickable
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
           >
            ${value}
          </div>
        );
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row, column, table }) => {
        const initialValue = parseInt(row.getValue("stock"), 10) || 0;
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
        const [value, setValue] = useState(String(initialValue));

        useEffect(() => {
          setValue(String(initialValue));
        }, [initialValue]);

        const onBlur = () => {
          if (value !== String(initialValue)) {
            (table.options.meta as any)?.updateData(row.index, column.id, value);
          } else {
             setEditingCell(null);
          }
        };
       
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setValue(String(initialValue));
            setEditingCell(null);
          }
        };

        return isEditing ? (
          <Input
            type="number"
            step="1"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            autoFocus
             className="h-8 px-2 py-1 text-sm"
          />
        ) : (
          <div 
            className="text-enterprise-700 cursor-pointer px-2 py-1 rounded hover:bg-slate-100 min-h-[32px]"
            onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
          >
            {value}
          </div>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("is_active");
        return (
          <Badge
            className={
              isActive
                ? "bg-success-50 text-success-700 border border-success-200 font-medium"
                : "bg-danger-50 text-danger-700 border border-danger-200 font-medium"
            }
            variant="outline"
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-enterprise-500 hover:text-enterprise-700 hover:bg-enterprise-100 h-8 w-8">
                <span className="sr-only">Open menu</span>
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => handleEdit(product.id!)}
                className="cursor-pointer text-enterprise-700 focus:text-enterprise-800 focus:bg-enterprise-50"
              >
                <EditIcon className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-danger-600 focus:text-danger-700 focus:bg-danger-50"
                onClick={() => handleDelete(product.id!)}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [filteredProducts, editingCell]); // Add editingCell dependency

  // --- Table Instance ---
  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10, // Default page size
      },
    },
    meta: {
      updateData,
    },
  });
  
  // --- Render ---
  
  // --- DEBUGGING LOGS ---
  console.log('[ProductsTable Render] Loading:', loading);
  console.log('[ProductsTable Render] Products State:', products);
  console.log('[ProductsTable Render] Filtered Products:', filteredProducts);
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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFilterToggle}
            className={cn(
              "border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50",
              isFilterOpen && "bg-enterprise-100 border-primary-300 text-primary-700"
            )}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Filter {isFilterOpen ? '(Hide)' : '(Show)'}
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
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize cursor-pointer"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace('_', ' ')}
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
                disabled={Object.keys(rowSelection).length === 0} // Disable if no rows selected
               >
                Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuLabel>Actions ({Object.keys(rowSelection).length} selected)</DropdownMenuLabel>
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

      {/* Filter Panel (Animated) */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isFilterOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="bg-enterprise-50 border border-enterprise-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-category" className="text-xs font-medium text-enterprise-700">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger id="filter-category" className="bg-white border-enterprise-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs font-medium text-enterprise-700">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value as FilterState['status'])}
              >
                <SelectTrigger id="filter-status" className="bg-white border-enterprise-200">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-enterprise-700">Price Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="filter-min-price"
                  type="number"
                  placeholder="Min Price"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="bg-white border-enterprise-200"
                  min="0"
                />
                <span className="text-enterprise-400">-</span>
                <Input
                  id="filter-max-price"
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="bg-white border-enterprise-200"
                  min="0"
                />
              </div>
            </div>

            {/* Stock Range Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-enterprise-700">Stock Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="filter-min-stock"
                  type="number"
                  placeholder="Min Stock"
                  value={filters.minStock}
                  onChange={(e) => handleFilterChange('minStock', e.target.value)}
                  className="bg-white border-enterprise-200"
                  min="0"
                />
                <span className="text-enterprise-400">-</span>
                <Input
                  id="filter-max-stock"
                  type="number"
                  placeholder="Max Stock"
                  value={filters.maxStock}
                  onChange={(e) => handleFilterChange('maxStock', e.target.value)}
                  className="bg-white border-enterprise-200"
                  min="0"
                />
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
      <div className="bg-white border border-enterprise-200 rounded-lg overflow-hidden shadow-sm">
        {/* Selected Row Count Info */}         
        {Object.keys(rowSelection).length > 0 && (
           <div className="px-4 py-2 text-sm text-enterprise-600 border-b bg-enterprise-50">
               {table.getFilteredSelectedRowModel().rows.length} of{" "}
               {table.getFilteredRowModel().rows.length} row(s) selected.
           </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-enterprise-50 border-b border-enterprise-200 hover:bg-enterprise-100">
                  {headerGroup.headers.map((header) => (
                    <TableHead 
                      key={header.id} 
                      className="px-4 py-3 font-medium text-enterprise-600"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton Loading Rows
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} className="border-b border-enterprise-100">
                    {columns.map((column, colIndex) => (
                      // Use a simpler key for skeleton cells
                      <TableCell key={`skeleton-${index}-${column.id || colIndex}`} className="px-4 py-4">
                        <Skeleton className="h-4 w-4/5" /> 
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredProducts.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-enterprise-50 border-b border-enterprise-100 transition-colors min-h-[72px]" // Add min-height to accommodate thumbnails
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                // No Results Row
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                      <p className="text-enterprise-500">No products found</p>
                      {/* Optional: Add a button to clear filters if filters are active */}
                      {/* {Object.values(filters).some(v => v !== 'all' && v !== '') && ( */}
                      {/*   <Button variant="link" size="sm" onClick={handleClearFilters}>Clear Filters</Button> */}
                      {/* )} */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={loading} // Keep disabled check
                        className="border-enterprise-200 text-enterprise-700"
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
        </div>
        {filteredProducts.length > 0 && (
          <div className="px-4 py-3 border-t border-enterprise-200 bg-enterprise-50">
            <div className="flex items-center justify-between text-sm text-enterprise-600">
              <div>
                Showing <span className="font-medium">{Math.min(1, filteredProducts.length)}</span> to{" "}
                <span className="font-medium">{Math.min(filteredProducts.length, 10)}</span> of{" "}
                <span className="font-medium">{filteredProducts.length}</span> results
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-enterprise-200 text-enterprise-700" disabled>
                  Previous
                </Button>
                <Button size="sm" variant="outline" className="border-enterprise-200 text-enterprise-700">
                  Next
                </Button>
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
              decoding="async"
              className="h-16 w-16 rounded-md object-cover cursor-pointer"
            />
          ) : (
            <div className="h-16 w-16 rounded-md bg-enterprise-100 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-enterprise-400" />
            </div>
          )}
        </div>
      </HoverCardTrigger>
      
      {thumbUrl && (
        <HoverCardContent
          side="right"
          sideOffset={8}
          className="w-[240px] p-2"
        >
          <img
            src={largeUrl}
            alt={product.name}
            className="h-[220px] w-full object-contain rounded"
          />
        </HoverCardContent>
      )}
    </HoverCard>
  );
};
