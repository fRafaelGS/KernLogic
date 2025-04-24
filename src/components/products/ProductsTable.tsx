import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { SearchIcon, FilterIcon, MoreHorizontalIcon, CheckIcon, EditIcon, TrashIcon, RefreshCw } from "lucide-react";
import { Product, productService } from "@/services/productService";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { API_URL } from "@/config";

export function ProductsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
  
  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
  
  return (
    <div className="space-y-6">
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
            className="border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50"
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Filter
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
      
      <div className="bg-white border border-enterprise-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-enterprise-50 border-b border-enterprise-200">
                <TableHead className="font-medium text-enterprise-600">Name</TableHead>
                <TableHead className="font-medium text-enterprise-600">SKU</TableHead>
                <TableHead className="font-medium text-enterprise-600">Category</TableHead>
                <TableHead className="font-medium text-enterprise-600">Price</TableHead>
                <TableHead className="font-medium text-enterprise-600">Stock</TableHead>
                <TableHead className="font-medium text-enterprise-600">Status</TableHead>
                <TableHead className="font-medium text-enterprise-600 w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex justify-center">
                      <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                          <div className="h-4 bg-enterprise-100 rounded w-3/4"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-enterprise-100 rounded"></div>
                            <div className="h-4 bg-enterprise-100 rounded w-5/6"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-enterprise-50 border-b border-enterprise-100">
                    <TableCell className="font-medium text-enterprise-900">{product.name}</TableCell>
                    <TableCell className="text-enterprise-600">{product.sku}</TableCell>
                    <TableCell className="text-enterprise-600">{product.category}</TableCell>
                    <TableCell className="text-enterprise-700">
                      ${typeof product.price === 'number' 
                        ? product.price.toFixed(2) 
                        : parseFloat(product.price).toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="text-enterprise-700">{product.stock}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          product.is_active
                            ? "bg-success-50 text-success-700 border border-success-200 font-medium"
                            : "bg-danger-50 text-danger-700 border border-danger-200 font-medium"
                        }
                        variant="outline"
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-enterprise-500 hover:text-enterprise-700 hover:bg-enterprise-100">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem 
                            onClick={() => product.id && handleEdit(product.id)}
                            className="cursor-pointer text-enterprise-700 focus:text-enterprise-800 focus:bg-enterprise-50"
                          >
                            <EditIcon className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="cursor-pointer text-danger-600 focus:text-danger-700 focus:bg-danger-50"
                            onClick={() => product.id && handleDelete(product.id)}
                          >
                            <TrashIcon className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                      <p className="text-enterprise-500">No products found</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefresh}
                        className="border-enterprise-200 text-enterprise-700"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {products.length > 0 && (
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
