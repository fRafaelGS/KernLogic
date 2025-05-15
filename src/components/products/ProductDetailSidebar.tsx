import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Product, productService, ProductAsset, ProductPrice } from '@/services/productService';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, ImageIcon, AlertCircle, UploadCloud, MoreHorizontal } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PricingModal } from './PricingModal';
import { CategoryModal } from './CategoryModal';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Category as CategoryFromService, buildCategoryBreadcrumb } from '@/services/categoryService';
import { formatCurrency } from '@/lib/utils';
import { CategoryDisplay } from '../common/CategoryDisplay';
import { normalizeCategory, Category } from '@/types/categories';
import { CategoryTreeSelect } from '../categories/CategoryTreeSelect';
import { useQueryClient } from '@tanstack/react-query';
import { isImageAsset } from '@/utils/isImageAsset';
import { pickPrimaryImage } from '@/utils/images';
import { useNavigate } from 'react-router-dom';

// Mock user permissions - in a real app, these would come from auth context
const hasEditPermission = true;

// Extend the Product interface to include prices
interface ExtendedProduct extends Product {
  prices?: ProductPrice[];
  all_prices?: ProductPrice[];
  family?: {
    id: number;
    code: string;
    label: string;
    description?: string;
  };
}

interface ProductDetailSidebarProps {
  product: ExtendedProduct;
  prices: ProductPrice[];
  isPricesLoading: boolean;
}

// Helper function to format date for display and tooltip
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return { display: '-', relative: '' };
  
  const date = new Date(dateString);
  return {
    display: format(date, 'dd MMM yyyy · HH:mm'),
    relative: formatDistanceToNow(date, { addSuffix: true })
  };
};

// Helper to validate GTIN format
const validateGTIN = (gtin: string | undefined): boolean => {
  if (!gtin) return true; // No GTIN is valid for our validator
  
  // Check if it's a valid EAN/UPC format with basic regex
  const isValidFormat = /^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$/.test(gtin);
  if (!isValidFormat) return false;
  
  // Implement checksum validation for EAN/UPC
  const digits = gtin.split('').map(Number);
  const checkDigit = digits.pop();
  const sum = digits.reduce((acc, val, idx) => {
    return acc + val * (idx % 2 === 0 ? 1 : 3);
  }, 0);
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === calculatedCheckDigit;
};

export default function ProductDetailSidebar({ product, prices, isPricesLoading }: ProductDetailSidebarProps) {
  const queryClient = useQueryClient();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const navigate = useNavigate();
  
  const createdDate = formatDate(product.created_at);
  const modifiedDate = formatDate(product.updated_at);
  
  // Extract and narrow the category trail to eliminate TypeScript errors
  const categoryTrail: Category[] = Array.isArray(product.category) ? product.category : [];
  // Extract single category for the fallback case
  const singleCategory = !Array.isArray(product.category) && typeof product.category === 'object' && product.category !== null 
    ? product.category as Category
    : null;
  
  // Add a function to force refresh the product data
  const refreshProduct = useCallback(async () => {
    try {
      console.log('[ProductDetailSidebar] Forcing product refresh');
      // Use the React Query client to refetch this specific product
      await queryClient.refetchQueries({ queryKey: ['product', product.id], exact: true });
      console.log('[ProductDetailSidebar] Product data refreshed successfully');
    } catch (error) {
      console.error('[ProductDetailSidebar] Error refreshing product data:', error);
    }
  }, [product.id, queryClient]);

  // Listen for localStorage events that might indicate a primary image change
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `product_${product.id}`) {
        console.log('[ProductDetailSidebar] Detected product update in localStorage, refreshing');
        refreshProduct();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [product.id, refreshProduct]);

  // Handle thumbnail display with improved priority for primary assets
  const thumbUrl = useMemo(() => {
    console.log('[ProductDetailSidebar] Recalculating thumbUrl, assets count:', product.assets?.length);
    
    // Use the centralized helper for consistent image selection
    return pickPrimaryImage(product);
  }, [product]);
  
  const largeImageUrl = useMemo(() => {
    // Use the same utility for large image to maintain consistency
    return pickPrimaryImage(product) || product.primary_image_large;
  }, [product]);
  
  const isGtinValid = validateGTIN(product.barcode);
  
  // Handle copy to clipboard
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`, { duration: 1000 }))
      .catch(() => toast.error('Failed to copy to clipboard'));
  };
  
  // Add a function to handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !product.id) return;
    
    try {
      toast.info('Uploading image...', { duration: 3000 });
      
      // Upload the image using the product service
      const assetResponse = await productService.uploadAsset(
        product.id, 
        file,
        (progressEvent) => {
          // Optional: You could add progress tracking here if desired
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          console.log(`Upload progress: ${progress}%`);
        }
      );
      
      // Set the uploaded image as primary
      if (assetResponse?.id) {
        await productService.setAssetPrimary(product.id, assetResponse.id);
        toast.success('Image uploaded and set as primary');
        
        // Refresh the page to show the new image
        window.location.reload();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    }
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get additional prices (excluding the base price)
  const additionalPrices = useMemo(() => {
    // Use directly fetched prices
    if (!prices || prices.length === 0) return [];
    
    // Show all prices up to 5
    return prices.slice(0, 5);
  }, [prices]);
  
  const hasMorePrices = useMemo(() => {
    if (!prices) return false;
    
    return prices.length > 5;
  }, [prices]);

  // Update handlePricesUpdated to return a Promise
  const handlePricesUpdated = async (): Promise<void> => {
    setShowPricingModal(false);
    
    // Invalidate and refetch both product and prices queries
    if (product?.id) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product', product.id] }),
        queryClient.invalidateQueries({ queryKey: ['prices', product.id] }),
      ]);
      
      // Force an immediate refetch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['product', product.id] }),
        queryClient.refetchQueries({ queryKey: ['prices', product.id] }),
      ]);
    }
    
    toast.success('Prices updated successfully');
  };
  
  // Update the handleShowPricing function
  const handleShowPricing = () => {
    if (!product?.id) return;
    setShowPricingModal(true);
  };

  // Function to refresh product data
  const handleRefreshProduct = async () => {
    if (!product?.id) return;
    
    try {
      // Invalidate and refetch product query
      await queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      await queryClient.refetchQueries({ queryKey: ['product', product.id] });
      toast.success('Product data refreshed');
    } catch (error) {
      console.error('Error refreshing product data:', error);
      toast.error('Failed to refresh product data');
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Hero image section */}
        {thumbUrl ? (
          <div 
            className="w-full h-48 bg-slate-100 relative cursor-pointer overflow-hidden"
            onClick={() => setImageDialogOpen(true)}
            tabIndex={0}
            aria-label="View product image"
            onKeyDown={(e) => e.key === 'Enter' && setImageDialogOpen(true)}
          >
            <img 
              src={thumbUrl} 
              alt={product.name} 
              className="w-full h-full object-cover hover:scale-105 transition-transform" 
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-slate-100 flex flex-col items-center justify-center">
            <ImageIcon className="h-12 w-12 text-slate-300 mb-2" />
            {hasEditPermission && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Upload image
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </>
            )}
          </div>
        )}
        
        {/* Image preview dialog */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="sm:max-w-3xl">
            <div className="w-full h-[500px] flex items-center justify-center bg-slate-100">
              {largeImageUrl ? (
                <img 
                  src={largeImageUrl} 
                  alt={product.name} 
                  className="max-w-full max-h-full object-contain" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-24 w-24 text-slate-400" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Core product fields */}
        <div className="p-4 space-y-3">
          <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider">
            Core Information
          </h2>
          
          {/* SKU with copy button */}
          <div className="flex justify-between items-center bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200">
            <span className="text-slate-600 text-sm">SKU</span>
            <div className="flex items-center">
              <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {product.sku}
              </code>
              <button 
                onClick={() => handleCopyToClipboard(product.sku, 'SKU')}
                className="ml-1.5"
                aria-label="Copy SKU to clipboard"
              >
                <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
          </div>
          
          {/* Name */}
          <div className="flex justify-between items-center bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200">
            <span className="text-slate-600 text-sm">Name</span>
            <span className="font-medium text-right text-sm max-w-[200px] truncate" title={product.name}>
              {product.name}
            </span>
          </div>
          
          {/* Category */}
          <div className="flex justify-between items-center mt-3 border-t border-slate-100 pt-3">
            <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider">
              Category
            </h2>
            {hasEditPermission && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => setShowCategoryModal(true)}
              >
                Change
              </Button>
            )}
          </div>
          <Breadcrumb>
            {categoryTrail.length > 0 ? (
              categoryTrail.map((cat, idx) => (
                <React.Fragment key={cat.id}>
                  <BreadcrumbItem isCurrent={idx === categoryTrail.length - 1}>
                    <span
                      className={
                        idx === categoryTrail.length - 1
                          ? "font-medium text-slate-900"
                          : "text-slate-600 hover:underline cursor-pointer"
                      }
                      onClick={() => {
                        if (idx < categoryTrail.length - 1) {
                          window.location.href = `/products?category=${cat.id}`;
                        }
                      }}
                    >
                      {cat.name}
                    </span>
                  </BreadcrumbItem>
                  {idx < categoryTrail.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))
            ) : singleCategory ? (
              <BreadcrumbItem isCurrent>
                <span>
                  {singleCategory.name || "Uncategorized"}
                </span>
              </BreadcrumbItem>
            ) : typeof product.category === "string" ? (
              <BreadcrumbItem isCurrent>
                <span>
                  {product.category.trim() || "Uncategorized"}
                </span>
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem isCurrent>
                <span className="text-muted-foreground">Uncategorized</span>
              </BreadcrumbItem>
            )}
          </Breadcrumb>
          
          {/* Family */}
          <div className="flex justify-between items-center mt-3 border-t border-slate-100 pt-3">
            <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider">
              Family
            </h2>
            {hasEditPermission && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => navigate(`/app/products/${product.id}/edit?tab=basic`)}
              >
                Change
              </Button>
            )}
          </div>
          <div className="bg-slate-50 rounded-md px-3 py-2 border border-slate-200">
            {product.family ? (
              <div>
                <span className="font-medium">{product.family.label}</span>
                <Badge className="ml-2">{product.family.code}</Badge>
                {product.family.description && (
                  <div className="text-sm text-muted mt-1">{product.family.description}</div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No family assigned</span>
            )}
          </div>
          
          {/* Brand and GTIN in a 2-column layout */}
          <div className="grid grid-cols-2 gap-2 mt-3 border-t border-slate-100 pt-3">
            <div>
              <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider mb-1">
                Brand
              </h2>
              <div className="bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200 h-full">
                <span className="font-medium text-sm">
                  {product.brand || '-'}
                </span>
              </div>
            </div>
            
            <div>
              <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider mb-1">
                GTIN
              </h2>
              <div className="flex justify-between items-center bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200 h-full">
                <code className="font-mono text-xs">
                  {product.barcode || 'Not specified'}
                </code>
                {product.barcode && (
                  <div className="flex items-center">
                    <button 
                      onClick={() => handleCopyToClipboard(product.barcode || '', 'GTIN')}
                      className="ml-1.5"
                      aria-label="Copy GTIN to clipboard"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700" />
                    </button>
                    {!isGtinValid && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 ml-1.5" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Invalid GTIN checksum</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Tags */}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider mb-1">
              Tags
            </h2>
            <div className="flex flex-wrap gap-1 bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200">
              {product.tags && product.tags.length > 0 ? (
                <>
                  {product.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-white text-primary-700 border-primary-200">
                      {tag}
                    </Badge>
                  ))}
                  
                  {product.tags.length > 3 && (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-200 cursor-pointer">
                          +{product.tags.length - 3} more
                        </Badge>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto p-2">
                        <div className="flex flex-wrap gap-1">
                          {product.tags.slice(3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-white text-primary-700 border-primary-200">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </>
              ) : (
                <span className="text-slate-400 text-sm">No tags</span>
              )}
            </div>
          </div>
          
          {/* PRICING section */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                PRICING
              </h3>
              {hasEditPermission && (
                <Button variant="ghost" size="sm" onClick={handleShowPricing}>
                  Manage
                </Button>
              )}
            </div>
            
            {/* Display primary price */}
            <div className="bg-yellow-50 rounded p-2 mb-2">
              {isPricesLoading ? (
                <div className="text-md text-slate-500 animate-pulse">
                  Loading prices...
                </div>
              ) : prices && prices.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      prices[0].amount, 
                      prices[0].currency || 'USD'
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {prices[0].price_type_display || prices[0].price_type}
                  </div>
                </>
              ) : (
                <div className="text-xl text-muted-foreground italic">
                  No price set
                </div>
              )}
            </div>
            
            {/* Additional prices (up to 3) */}
            {prices && prices.length > 1 && (
              <div className="space-y-2 mt-2">
                {prices.slice(1, 4).map((price, index) => (
                  <div key={`${price.price_type}-${index}`} className="bg-slate-50 rounded p-2 flex justify-between">
                    <div className="text-sm font-medium">
                      {price.price_type_display || price.price_type}
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(price.amount, price.currency || 'USD')}
                    </div>
                  </div>
                ))}
                
                {/* View all prices button */}
                {prices && prices.length > 4 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-1" 
                    onClick={handleShowPricing}
                  >
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    View all prices
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Status and metadata in compact layout */}
          <div className="grid grid-cols-2 gap-2 mt-3 border-t border-slate-100 pt-3">
            <div>
              <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider mb-1">
                Status
              </h2>
              <div className="bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200 flex items-center">
                <Badge
                  className={cn(
                    "px-2 py-0.5",
                    product.is_active
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  )}
                >
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            
            <div>
              <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider mb-1">
                Created
              </h2>
              <div className="bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 text-xs">{createdDate.display}</span>
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(product.created_by || 'User')}&size=32`} />
                          <AvatarFallback className="text-[8px]">{(product.created_by || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{createdDate.relative} by {product.created_by || 'Unknown user'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          {/* Last modified in a compact row */}
          <div className="flex justify-between items-center bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200 mt-1">
            <span className="text-slate-600 text-xs">Last modified</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 text-xs">{modifiedDate.display}</span>
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(product.created_by || 'User')}&size=32`} />
                      <AvatarFallback className="text-[8px]">{(product.created_by || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{modifiedDate.relative} by {product.created_by || 'Unknown user'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      
      {/* Pricing Modal */}
      {product?.id && showPricingModal && (
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          productId={product.id}
          onPricesUpdated={handlePricesUpdated}
        />
      )}

      {/* Category Modal */}
      <CategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        productId={product.id || 0}
        currentCategoryId={
          categoryTrail.length > 0
            ? categoryTrail[categoryTrail.length - 1]?.id
            : singleCategory?.id
        }
        onCategoryUpdated={() => window.location.reload()}
      />
    </Card>
  );
} 