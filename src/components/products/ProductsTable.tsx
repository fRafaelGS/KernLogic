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
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
} from "lucide-react";
import { Product, productService } from "@/services/productService";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { API_URL } from "@/config";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

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
  const navigate = useNavigate();
  
  // Function to fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Debug log the API URL and token
      console.log('API URL:', API_URL);
      const token = localStorage.getItem('access_token');
      console.log('Current access token:', token ? `${token.substring(0, 15)}...` : 'none');
      
      if (!token) {
        console.log('No access token found, redirecting to login');
        navigate('/login');
        return;
      }
      
      console.log('Fetching products with authentication header');
      
      // Make a direct fetch call with the token to bypass any axios issues
      const response = await fetch(`${API_URL}/products/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        console.log('Unauthorized, attempting to refresh token');
        
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          console.log('No refresh token available, redirecting to login');
          navigate('/login');
          return;
        }
        
        const refreshResponse = await fetch(`${API_URL}/auth/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh: refreshToken
          })
        });
        
        if (!refreshResponse.ok) {
          console.log('Token refresh failed, redirecting to login');
          navigate('/login');
          return;
        }
        
        const refreshData = await refreshResponse.json();
        const newToken = refreshData.access;
        localStorage.setItem('access_token', newToken);
        console.log('Token refreshed, retrying with new token');
        
        // Retry the request with the new token
        const retryResponse = await fetch(`${API_URL}/products/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`
          }
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Failed to fetch products after token refresh: ${retryResponse.status}`);
        }
        
        const data = await retryResponse.json();
        console.log('Fetched products after token refresh:', data);
        setProducts(data || []);
      } else if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      } else {
        const data = await response.json();
        console.log('Fetched products successfully:', data);
        setProducts(data || []);
        
        if (data && data.length > 0) {
          toast.success(`Loaded ${data.length} products`);
        } else {
          toast.success('No products found');
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };
  
  // Load products on mount
  useEffect(() => {
    console.log('ProductsTable component mounted');
    fetchProducts();
  }, []);
  
  // Handle refresh button click
  const handleRefresh = () => {
    console.log('Manually refreshing products list');
    fetchProducts();
  };
  
  const handleEdit = (productId: number) => {
    navigate(`/app/products/${productId}/edit`);
  };

  const handleDelete = async (productId: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(productId);
        toast.success('Product deleted successfully');
        // Refresh products list
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
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

  // --- Derived Data ---
  const uniqueCategories = useMemo(() => {
    const categories = new Set(products.map(p => p.category));
    return ['all', ...Array.from(categories)];
  }, [products]);

  // Filter products based on search term AND filters
  const filteredProducts = useMemo(() => {
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

  // --- Table Columns ---
  const columns = useMemo<ColumnDef<Product>[]>(() => [
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
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price")) || 0;
        return <div className="text-enterprise-700">${price.toFixed(2)}</div>;
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
      cell: ({ row }) => <div className="text-enterprise-700">{row.getValue("stock")}</div>,
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
  ], []);

  // --- Table Instance ---
  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10, // Default page size
      },
    },
  });
  
  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
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

        <div className="flex flex-wrap gap-3 items-center">
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-enterprise-50 border-b border-enterprise-200 hover:bg-enterprise-100">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-4 py-3 font-medium text-enterprise-600">
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
                  <TableRow key={index} className="border-b border-enterprise-100">
                    {columns.map((column) => (
                      <TableCell key={column.id} className="px-4 py-4">
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-enterprise-50 border-b border-enterprise-100 transition-colors"
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={loading}
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
          <p>API URL: {API_URL}/products/</p>
        </div>
      )}
    </div>
  );
}
