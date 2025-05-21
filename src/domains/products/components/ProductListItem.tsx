import React from 'react';
import { useProductPrice, ProductWithPrice } from '@/hooks/useProductPrice';
import { Badge } from '@/domains/core/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/domains/core/components/ui/card';

interface ProductListItemProps {
  product: ProductWithPrice;
  onClick?: (product: ProductWithPrice) => void;
}

export const ProductListItem: React.FC<ProductListItemProps> = ({ 
  product, 
  onClick 
}) => {
  const { getFormattedPrice, getPriceSourceInfo } = useProductPrice();
  const priceInfo = getPriceSourceInfo(product);
  
  const handleClick = () => {
    if (onClick) onClick(product);
  };
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
      data-testid="product-list-item"
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg">{product.name}</h3>
            <div className="text-sm text-muted-foreground mt-1">{product.sku}</div>
          </div>
          
          <div className="text-right">
            <div className="text-xl font-semibold" data-testid="product-price">
              {getFormattedPrice(product)}
            </div>
            
            {/* Display price type information */}
            <div className="mt-1">
              <span className="text-xs text-muted-foreground" data-testid="price-type">
                {priceInfo.priceType}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-4 py-2 bg-muted/20 flex justify-between items-center">
        <div className="text-sm">
          {product.category || 'Uncategorized'}
        </div>
        <div className="text-sm">
          {product.brand || '—'}
        </div>
      </CardFooter>
    </Card>
  );
}; 