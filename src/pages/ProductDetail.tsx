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
import { ChevronLeft, Edit, Copy, Trash, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AnimatePresence, motion } from 'framer-motion';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user permissions from auth context
  const { checkPermission } = useAuth();
  const canEdit = checkPermission ? checkPermission('product.edit') : true;
  const canDelete = checkPermission ? checkPermission('product.delete') : true;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError('Product ID is missing from the URL');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const data = await productService.getProduct(Number(id));
        
        if (!data) {
          setError('Product not found or returned empty data');
          setProduct(null);
        } else {
          setProduct(data);
          setError(null);
          
          // Set page title for accessibility
          document.title = `${data.name || 'Product'} - KernLogic PIM`;
        }
      } catch (err: any) {
        const errorMessage = err.response?.status === 404 
          ? 'Product not found' 
          : 'Failed to load product details. Please try again.';
        
        setError(errorMessage);
        setProduct(null);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    
    // Clean up on unmount
    return () => {
      document.title = 'KernLogic PIM';
    };
  }, [id]);

  const handleEdit = () => {
    if (id) {
      navigate(`/app/products/${id}/edit`);
    }
  };

  const handleDuplicate = async () => {
    if (!product) return;
    
    try {
      setSaving(true);
      // Create a copy of the product without the ID and timestamps
      const { id: _, created_at, updated_at, ...productCopy } = product;
      productCopy.name = `${productCopy.name} (Copy)`;
      
      // Generate a unique SKU by adding a suffix
      productCopy.sku = `${productCopy.sku}-COPY`;
      
      const newProduct = await productService.createProduct(productCopy);
      toast.success('Product duplicated successfully');
      
      // Navigate to the new product
      navigate(`/app/products/${newProduct.id}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to duplicate product';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    // Use a more accessible confirmation dialog
    const confirmAction = window.confirm(`Are you sure you want to ${product?.is_active ? 'archive' : 'delete'} this product?\n\nSKU: ${product?.sku}\nName: ${product?.name}`);
    if (!confirmAction) return;
    
    try {
      setSaving(true);
      await productService.deleteProduct(Number(id));
      toast.success(`Product ${product?.is_active ? 'archived' : 'deleted'} successfully`);
      navigate('/app/products');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || `Failed to ${product?.is_active ? 'archive' : 'delete'} product`;
      toast.error(errorMessage);
      setSaving(false);
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

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          
          <div className="mb-6">
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/4">
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
            <div className="w-full lg:w-3/4">
              <Skeleton className="h-12 w-full mb-6" />
              <Skeleton className="h-72 w-full rounded-lg" />
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
              aria-label="Back to Products"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </div>
          
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex flex-col gap-4">
              <p>{error || 'Product not found'}</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRetry}
                  aria-label="Try again"
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/app/products')}
                  aria-label="Return to Products"
                >
                  Return to Products
                </Button>
              </div>
            </AlertDescription>
          </Alert>
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
              <h1 className="text-2xl font-bold truncate max-w-md" title={product.name || 'Unnamed Product'}>
                {product.name || 'Unnamed Product'}
              </h1>
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
              {canEdit && (
                <Button 
                  onClick={handleEdit} 
                  size="sm" 
                  className="h-9"
                  aria-label="Edit product"
                  disabled={saving}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              
              <Button 
                onClick={handleDuplicate} 
                variant="outline" 
                size="sm" 
                className="h-9"
                aria-label="Duplicate product"
                disabled={saving}
              >
                <Copy className="h-4 w-4 mr-2" />
                {saving ? 'Creating...' : 'Duplicate'}
              </Button>
              
              {canDelete && (
                <Button 
                  onClick={handleDelete} 
                  variant="destructive" 
                  size="sm" 
                  className="h-9"
                  aria-label={`${product.is_active ? 'Archive' : 'Delete'} product`}
                  disabled={saving}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {saving ? 'Processing...' : (product.is_active ? 'Archive' : 'Delete')}
                </Button>
              )}
              
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9"
                    aria-label="Export options"
                    disabled={saving}
                  >
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
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <ProductDetailDescription 
              product={product} 
              onProductUpdate={handleProductUpdate} 
            />
          </motion.div>
        </AnimatePresence>
        
        <ProductDetailLayout
          sidebar={<ProductDetailSidebar product={product} />}
          content={<ProductDetailTabs product={product} onProductUpdate={handleProductUpdate} />}
        />
      </div>
    </DashboardLayout>
  );
}; 