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
import { ROUTES } from '@/config/routes';

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
      navigate(ROUTES.buildProductEditUrl(Number(id)));
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
      if (newProduct && newProduct.id) {
        navigate(ROUTES.buildProductDetailUrl(newProduct.id));
      } else {
        navigate(ROUTES.APP.PRODUCTS.ROOT);
      }
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
      navigate(ROUTES.APP.PRODUCTS.ROOT);
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
        <div className="w-full mx-auto py-8 px-6">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-24" />
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-6 w-36" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Skeleton className="h-64 w-full mb-4" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-[450px] w-full" />
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
        <div className="w-full mx-auto py-8 px-6">
          <div className="mb-6">
            <Button 
              variant="outline" 
              className="mb-4"
              onClick={() => navigate(ROUTES.APP.PRODUCTS.ROOT)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
            
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {errorMessage}
                <Button variant="link" className="p-0 h-auto text-sm" onClick={handleRetry}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full mx-auto py-8 px-6">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={ROUTES.APP.PRODUCTS.ROOT}>Products</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>{product?.name || 'Product Details'}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-enterprise-900">{product?.name}</h1>
              <div className="ml-2">
                {product?.is_active ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </div>
            <p className="text-enterprise-600 text-sm mt-1">SKU: {product?.sku}</p>
          </div>
          
          <div className="flex gap-2 mt-4 sm:mt-0">
            {/* Main action buttons */}
            {canEdit && (
              <Button onClick={handleEdit} className="gap-1">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDuplicate} disabled={saving}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem onClick={handleDelete} disabled={saving} className="text-red-600">
                    <Trash className="h-4 w-4 mr-2" />
                    {product?.is_active ? 'Archive' : 'Delete'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main layout */}
        <ProductDetailLayout
          content={
            <ProductDetailTabs 
              product={product} 
              onProductUpdate={handleProductUpdate}
              prices={prices || []}
              isPricesLoading={isPricesLoading}
            />
          }
          sidebar={
            <ProductDetailSidebar 
              product={product as any} 
              prices={prices || []}
              isPricesLoading={isPricesLoading}
            />
          }
        />
      </div>
    </DashboardLayout>
  );
}; 