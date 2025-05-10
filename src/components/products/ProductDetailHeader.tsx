import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProductPrice, ProductWithPrice } from '@/hooks/useProductPrice';

interface ProductDetailHeaderProps {
  product: ProductWithPrice;
  onEdit?: () => void;
}

export const ProductDetailHeader: React.FC<ProductDetailHeaderProps> = ({ 
  product, 
  onEdit 
}) => {
  const { getFormattedPrice, getPriceSourceInfo } = useProductPrice();
  const priceInfo = getPriceSourceInfo(product);
  
  return (
    <div className="border-b pb-4 mb-6">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm bg-muted px-1 py-0.5 rounded">{product.sku}</code>
            {product.is_active ? (
              <Badge variant="success" className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge variant="destructive" className="bg-red-100 text-red-800">Inactive</Badge>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex flex-col items-end">
            <div className="text-xl font-semibold" data-testid="product-price">
              {getFormattedPrice(product)}
            </div>
            
            <div className="text-xs text-muted-foreground mt-1">
              {priceInfo.priceType} price
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex mt-4 justify-between items-center">
        <div className="text-sm text-muted-foreground">
          <div><strong>Category:</strong> {product.category || 'Uncategorized'}</div>
          <div><strong>Brand:</strong> {product.brand || '—'}</div>
        </div>
        
        {onEdit && (
          <Button onClick={onEdit} variant="outline" size="sm">
            Edit Product
          </Button>
        )}
      </div>
    </div>
  );
}; 