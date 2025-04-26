import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Product, productService } from '@/services/productService';
import { ProductDetailLayout } from '@/components/products/ProductDetailLayout';
import { ProductDetailSidebar } from '@/components/products/ProductDetailSidebar';
import { ProductDetailTabs } from '@/components/products/ProductDetailTabs';
import { ProductDetailDescription } from '@/components/products/ProductDetailDescription';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Edit, Copy, Trash, Download } from 'lucide-react';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        console.warn('No product ID provided in URL params');
        setError('Product ID is missing from the URL');
        setLoading(false);
        return;
      }
      
      try {
        console.log(`Fetching product with ID: ${id}`);
        setLoading(true);
        const data = await productService.getProduct(Number(id));
        
        if (!data) {
          console.error('API returned empty product data');
          setError('Product not found or returned empty data');
          setProduct(null);
        } else {
          console.log('Product data received:', data);
          setProduct(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details. Please try again.');
        setProduct(null);
        toast.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleEdit = () => {
    if (id) {
      navigate(`/app/products/${id}/edit`);
    }
  };

  const handleDuplicate = async () => {
    if (!product) return;
    
    try {
      // Create a copy of the product without the ID and timestamps
      const { id: _, created_at, updated_at, ...productCopy } = product;
      productCopy.name = `${productCopy.name} (Copy)`;
      
      // Generate a unique SKU by adding a suffix
      productCopy.sku = `${productCopy.sku}-COPY`;
      
      const newProduct = await productService.createProduct(productCopy);
      toast.success('Product duplicated successfully');
      
      // Navigate to the new product
      navigate(`/app/products/${newProduct.id}`);
    } catch (err) {
      console.error('Error duplicating product:', err);
      toast.error('Failed to duplicate product');
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productService.deleteProduct(Number(id));
      toast.success('Product deleted successfully');
      navigate('/app/products');
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error('Failed to delete product');
    }
  };

  const handleExport = (format: 'csv' | 'pdf' | 'channel') => {
    // Implementation will be added in a future version
    toast.info(`Export to ${format.toUpperCase()} will be available in a future version`);
  };

  // Handle product update from description component
  const handleProductUpdate = (updatedProduct: Product) => {
    setProduct(updatedProduct);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <div className="flex items-center space-x-2 mb-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/4">
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
            <div className="w-full lg:w-3/4">
              <Skeleton className="h-12 w-full mb-6" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !product) {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <div className="flex items-center mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/app/products')}
              className="mr-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-700 mb-2">
              {error || 'Product not found'}
            </h2>
            <p className="text-red-600 mb-4">
              The requested product could not be loaded.
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-6">
        {/* Breadcrumb & Header */}
        <div className="mb-6">
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/app/products">Products</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span>{product.name || 'Unnamed Product'}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{product.name || 'Unnamed Product'}</h1>
              <Badge
                className={
                  product.is_active
                    ? "bg-success-50 text-success-700 border border-success-200"
                    : "bg-danger-50 text-danger-700 border border-danger-200"
                }
              >
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Primary Actions */}
              <Button onClick={handleEdit} size="sm" className="h-9">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button onClick={handleDuplicate} variant="outline" size="sm" className="h-9">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button onClick={handleDelete} variant="destructive" size="sm" className="h-9">
                <Trash className="h-4 w-4 mr-2" />
                {product.is_active ? 'Archive' : 'Delete'}
              </Button>
              
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('channel')}>
                    Channel Feed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="mb-6">
          <ProductDetailDescription 
            product={product} 
            onProductUpdate={handleProductUpdate} 
          />
        </div>
        
        <ProductDetailLayout
          sidebar={<ProductDetailSidebar product={product} />}
          content={<ProductDetailTabs product={product} onProductUpdate={handleProductUpdate} />}
        />
      </div>
    </DashboardLayout>
  );
}; 