import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, X, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { productService, Product } from '../../services/productService';
import AddRelatedProductPanel from './AddRelatedProductPanel';
import { toast } from 'sonner';

// Helper function to format currency
const formatCurrency = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

interface RelatedProductsCarouselProps {
  productId: number;
  onRefresh?: () => void;
}

const RelatedProductsCarousel: React.FC<RelatedProductsCarouselProps> = ({ 
  productId, 
  onRefresh 
}) => {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const maxVisibleProducts = 4;

  // Fetch related products on component mount
  useEffect(() => {
    if (!productId) {
      setRelatedProducts([]);
      setLoading(false);
      return;
    }
    
    fetchRelatedProducts();
  }, [productId]);
  
  const fetchRelatedProducts = async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const products = await productService.getRelatedProducts(productId);
      setRelatedProducts(products);
    } catch (err) {
      console.error('Error loading related products:', err);
      setError('Failed to load related products');
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new related product
  const handleAddRelatedProduct = async (product: Product) => {
    // Optimistically update UI
    setRelatedProducts(prev => [product, ...prev]);
    
    // Call API to add the relation
    try {
      const success = await productService.toggleRelatedProduct(
        productId,
        product.id!,
        true // Pin the newly added product
      );
      
      if (!success) {
        toast.error("Failed to add related product");
        // Revert the UI change on failure
        fetchRelatedProducts();
      }
    } catch (err) {
      console.error('Error adding related product:', err);
      toast.error("Failed to add related product");
      fetchRelatedProducts();
    }
  };
  
  // Handle removing a related product
  const handleRemoveRelatedProduct = async (productToRemove: Product) => {
    if (!productToRemove.id) {
      toast.error("Invalid product selected for removal");
      return;
    }
    
    // Optimistically update UI
    setRelatedProducts(prev => 
      prev.filter(product => product.id !== productToRemove.id)
    );
    
    try {
      // Call API to remove the relation
      const success = await productService.removeRelatedProduct(
        productId,
        productToRemove.id
      );
      
      if (!success) {
        toast.error("Couldn't remove product");
        fetchRelatedProducts();
      }
    } catch (err) {
      console.error('Error removing related product:', err);
      toast.error("Couldn't remove product");
      fetchRelatedProducts();
    }
  };

  // Navigate carousel left/right
  const handlePrevious = () => {
    setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
  };
  
  const handleNext = () => {
    setActiveIndex(prev => {
      const maxIndex = Math.max(0, relatedProducts.length - maxVisibleProducts);
      return prev < maxIndex ? prev + 1 : maxIndex;
    });
  };

  // Calculate visible products and navigation state
  const visibleProducts = relatedProducts.slice(activeIndex, activeIndex + maxVisibleProducts);
  const hasMore = relatedProducts.length > maxVisibleProducts;

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-medium mb-4">Related Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: maxVisibleProducts }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="w-full">
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="flex justify-between p-4">
                <Skeleton className="h-4 w-1/3" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AddRelatedProductPanel 
        productId={productId}
        relatedProducts={relatedProducts}
        onProductAdded={handleAddRelatedProduct}
      />
      
      <div className="relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Related Products</h3>
          <div className="flex space-x-2">
            {error && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRelatedProducts}
                className="text-destructive"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Try Again
              </Button>
            )}
            {hasMore && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={activeIndex === 0}
                  aria-label="Previous products"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleNext}
                  disabled={activeIndex >= relatedProducts.length - maxVisibleProducts}
                  aria-label="Next products"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {error ? (
          <div className="text-center p-8 bg-muted rounded-md">
            <p className="text-destructive">{error}</p>
          </div>
        ) : relatedProducts.length === 0 ? (
          <div className="text-center p-8 bg-muted rounded-md">
            <p className="text-muted-foreground">No related products found</p>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={fetchRelatedProducts}
              >
                Refresh
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {visibleProducts.map((product) => (
              <Card key={product.id} className="h-full flex flex-col">
                <CardContent className="p-4 flex-grow relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveRelatedProduct(product);
                    }}
                    aria-label={`Remove ${product.name} from related products`}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove</span>
                  </Button>
                  
                  <Link 
                    to={`/app/products/${product.id}`} 
                    className="block hover:underline font-medium mb-2 truncate"
                  >
                    {product.name}
                  </Link>
                  
                  <p className="text-sm text-muted-foreground mb-2 truncate">
                    SKU: {product.sku}
                  </p>
                  
                  <div className="mt-auto">
                    <p className="font-semibold">{formatCurrency(product.price)}</p>
                    {product.category && (
                      <Badge className="mt-2">{product.category}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RelatedProductsCarousel;