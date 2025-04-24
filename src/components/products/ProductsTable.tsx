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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="relative w-64">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search products..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            title="Refresh Products"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <FilterIcon className="h-4 w-4" />
          </Button>
          <Button variant="default" asChild>
            <Link to="/app/products/new">Add Product</Link>
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>${typeof product.price === 'number' 
                    ? product.price.toFixed(2) 
                    : parseFloat(product.price).toFixed(2) || "0.00"}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        product.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                      variant="secondary"
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => product.id && handleEdit(product.id)}>
                          <EditIcon className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
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
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p>No products found</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
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
      
      {/* Debug info */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>Products count: {products.length}</p>
        <p>API URL: {API_URL}/products/</p>
      </div>
    </div>
  );
}
