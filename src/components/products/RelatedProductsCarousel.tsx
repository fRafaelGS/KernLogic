import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { productService, Product } from '../../services/productService';
import AddRelatedProductPanel from './AddRelatedProductPanel';

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
  const [activeIndex, setActiveIndex] = useState(0);
  const maxVisibleProducts = 4;

  // Fetch related products on component mount
  useEffect(() => {
    if (!productId) {
      console.log('No product ID provided to RelatedProductsCarousel');
      setRelatedProducts([]);
      setLoading(false);
      return;
    }
    
    fetchRelatedProducts();
  }, [productId]);
  
  const fetchRelatedProducts = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const response = await productService.getRelatedProducts(productId);
      
      // Handle different response shapes - could be an array directly or { data: [...] }
      let productsArray: Product[];
      
      // Check if response is an array directly
      if (Array.isArray(response)) {
        productsArray = response;
      } 
      // Check if response has a data property that's an array (common with Axios)
      else if (
        response && 
        typeof response === 'object' && 
        'data' in response && 
        Array.isArray((response as any).data)
      ) {
        productsArray = (response as any).data;
      }
      // Handle other unexpected formats
      else {
        console.error('Related products response has unexpected format:', response);
        productsArray = [];
      }
      
      setRelatedProducts(productsArray);
    } catch (err) {
      console.error('Error loading related products:', err);
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new related product
  const handleAddRelatedProduct = (product: Product) => {
    setRelatedProducts(prev => [product, ...prev]);
  };

  // Navigate carousel left/right
  const handlePrevious = () => {
    setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
  };
  
  const handleNext = () => {
    setActiveIndex(prev => (prev < relatedProducts.length - maxVisibleProducts ? prev + 1 : prev));
  };

  // Render carousel items
  // Ensure relatedProducts is an array before slicing
  const relatedProductsArray = Array.isArray(relatedProducts) ? relatedProducts : [];
  const visibleProducts = relatedProductsArray.slice(activeIndex, activeIndex + maxVisibleProducts);
  const hasMore = relatedProductsArray.length > maxVisibleProducts;

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
          {hasMore && (
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handlePrevious}
                disabled={activeIndex === 0}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleNext}
                disabled={activeIndex >= relatedProducts.length - maxVisibleProducts}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {relatedProducts.length === 0 ? (
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
                <CardContent className="p-4 flex-grow">
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