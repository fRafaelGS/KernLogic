import React, { memo, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useProductPrice, ProductWithPrice } from '@/hooks/useProductPrice';
import { Button } from '@/components/ui/button';
import { pickPrimaryImage } from '@/utils/images';
import { useFetchProducts } from '@/hooks/useFetchProducts';
import { Product, PaginatedResponse } from '@/services/productService';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryName } from '@/lib/utils';

interface ProductTableProps {
  filters?: Record<string, any>;
  onSelectProduct?: (product: Product) => void;
}

// Memoized product row component
const ProductRow = memo(({ 
  product, 
  style,
  onSelect
}: { 
  product: Product, 
  style: React.CSSProperties,
  onSelect?: (product: Product) => void
}) => {
  const { getFormattedPrice, getPriceTypeDisplay } = useProductPrice();
  const imageUrl = pickPrimaryImage(product);
  
  // Format category name
  const categoryName = getCategoryName(product.category) || 'Uncategorized';
  
  return (
    <TableRow 
      style={style}
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSelect?.(product)}
      data-testid="product-row"
    >
      <TableCell className="w-16 p-2 align-middle">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-10 w-10 object-cover rounded border border-muted"
            loading="lazy"
            width={40}
            height={40}
          />
        ) : (
          <div className="h-10 w-10 flex items-center justify-center bg-muted rounded border border-muted text-xs text-muted-foreground">
            No image
          </div>
        )}
      </TableCell>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>{product.sku}</TableCell>
      <TableCell>{categoryName}</TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span 
            data-testid="product-price" 
            className="relative group"
          >
            {getFormattedPrice(product as ProductWithPrice)}
            <span className="text-xs text-muted-foreground block">
              {getPriceTypeDisplay(product as ProductWithPrice)}
            </span>
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
});

export const ProductTable: React.FC<ProductTableProps> = ({ 
  filters = {},
  onSelectProduct 
}) => {
  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useFetchProducts(filters);
  
  // Container ref and dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 600 });
  
  // Update dimensions on mount and window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: Math.min(600, window.innerHeight - 200) // Limit height to viewport minus some space for headers/footers
        });
      }
    };
    
    // Initial measurement
    updateDimensions();
    
    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const allProducts = React.useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page: PaginatedResponse<Product>) => page.results);
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (allProducts.length === 0) {
    return (
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No products found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }
  
  return (
    <div className="w-full overflow-auto" ref={containerRef}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <List
            height={containerSize.height}
            itemCount={allProducts.length}
            itemSize={48}
            width={containerSize.width}
          >
            {({ index, style }) => (
              <ProductRow 
                style={style} 
                product={allProducts[index]} 
                onSelect={onSelectProduct} 
              />
            )}
          </List>
        </TableBody>
      </Table>
      
      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => fetchNextPage()} 
            disabled={isFetching}
          >
            {isFetching ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}; 