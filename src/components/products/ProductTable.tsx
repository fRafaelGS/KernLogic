import React from 'react';
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

interface ProductTableProps {
  filters?: Record<string, any>;
  onSelectProduct?: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ 
  filters = {},
  onSelectProduct 
}) => {
  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useFetchProducts(filters);
  const { getFormattedPrice, getPriceTypeDisplay } = useProductPrice();
  
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
          {allProducts.map((product) => {
            const imageUrl = pickPrimaryImage(product);
            return (
              <TableRow 
                key={product.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectProduct?.(product)}
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
                <TableCell>{product.category || 'Uncategorized'}</TableCell>
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
          })}
          {allProducts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No products found
              </TableCell>
            </TableRow>
          )}
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