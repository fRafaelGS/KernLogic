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
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { pickPrimaryImage } from '@/utils/images';

interface ProductTableProps {
  products: ProductWithPrice[];
  onSelectProduct?: (product: ProductWithPrice) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ 
  products, 
  onSelectProduct 
}) => {
  const { getFormattedPrice, getPriceTypeDisplay } = useProductPrice();
  
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
          {products.map((product) => {
            const imageUrl = pickPrimaryImage(product)
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
                      data-debug={JSON.stringify({
                        hasDefaultPrice: !!product.default_price,
                        priceData: product.default_price,
                        hasPrices: product.prices?.length > 0,
                        firstPrice: product.prices?.[0]
                      })}
                      title={`${getPriceTypeDisplay(product)}: ${getFormattedPrice(product)}`}
                      className="relative group"
                    >
                      {getFormattedPrice(product)}
                      <span className="text-xs text-muted-foreground block">
                        {getPriceTypeDisplay(product)}
                      </span>
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No products found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}; 