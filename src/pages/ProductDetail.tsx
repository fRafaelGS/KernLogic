import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Product, productService, ProductPrice } from '@/services/productService';
import { ProductDetailLayout } from '@/components/products/ProductDetailLayout';
import ProductDetailSidebar from '@/components/products/ProductDetailSidebar';
import { ProductDetailTabs } from '@/components/products/ProductDetailTabs';
import { ProductDetailDescription } from '@/components/products/ProductDetailDescription';
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Edit, Copy, Trash, Download, AlertCircle, Loader2 } from 'lucide-react';
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
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeFamily } from '@/utils/familyNormalizer';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const productId = id ? Number(id) : 0;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Get user permissions from auth context
  const { checkPermission } = useAuth();
  const canEdit = checkPermission ? checkPermission('product.edit') : true;
  const canDelete = checkPermission ? checkPermission('product.delete') : true;

  // Use React Query to fetch the product with retry logic
  const { 
    data: product, 
    isLoading: loading, 
    isError, 
    error: queryError,
    refetch 
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) {
        throw new Error('Product ID is missing from the URL');
      }
      
      try {
        // Fetch product data
        const productData = await productService.getProduct(productId);
        
        if (!productData) {
          throw new Error('Product not found or returned empty data');
        }
        
        // Fetch additional data
        const assetsData = await productService.getProductAssets(productId);
        
        // Build complete product with assets
        const productWithAssets: Product = {
          ...productData,
          assets: Array.isArray(assetsData) && assetsData.length > 0 ? assetsData : []
        };
        
        // Set page title
        document.title = `${productWithAssets.name || 'Product'} - KernLogic PIM`;
        
        return productWithAssets;
      } catch (err: any) {
        if (err.response?.status === 404) {
          throw new Error('Product not found');
        }
        throw new Error('Failed to load product details. Please try again.');
      }
    },
    retry: (failureCount, error: any) => {
      // Only retry a few times and only for network errors or if we think
      // the product might still be propagating through the database
      const isNetwork = !error.response;
      const isNotFound = error.response?.status === 404;
      
      // Retry up to 3 times for any error except a confirmed 404
      return !isNotFound && failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    refetchOnWindowFocus: false
  });

  // Use React Query to fetch prices
  const { 
    data: prices, 
    isLoading: isPricesLoading 
  } = useQuery({
    queryKey: ['prices', productId],
    queryFn: () => productService.getPrices(productId),
    enabled: !!productId,
    refetchOnWindowFocus: false
  });

  // Use React Query Client to invalidate queries
  const queryClient = useQueryClient();

  // Clean up on unmount
  useEffect(() => {
    // Force refetch product data and related queries when component mounts
    // This ensures we have fresh data when returning from edit form
    if (productId) {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['familyAttributeGroups'] });
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      queryClient.refetchQueries({ queryKey: ['product', productId] });
    }
    
    return () => {
      document.title = 'KernLogic PIM';
    };
  }, [productId]);

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
  const handleProductUpdate = async (updatedProduct: Product) => {
    // Refetch product data to ensure we have the latest
    refetch();
  };

  const handleRetry = () => {
    refetch();
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
          
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading product data...</p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a moment if the product was just created
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !product) {
    const errorMessage = queryError instanceof Error ? queryError.message : 'Product not found';
    
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
              <p>{errorMessage}</p>
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
          sidebar={
            <ProductDetailSidebar 
              product={{
                ...product,
                // Ensure family is in the correct format by using our normalizer
                family: normalizeFamily(product.family, product.family_name)
              }}
              prices={prices || []}
              isPricesLoading={isPricesLoading}
            />
          }
          content={
            <ProductDetailTabs 
              product={product} 
              prices={prices || []}
              isPricesLoading={isPricesLoading}
              onProductUpdate={handleProductUpdate} 
            />
          }
        />
      </div>
    </DashboardLayout>
  );
}; 