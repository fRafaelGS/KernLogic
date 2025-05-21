import React, { useState, useEffect } from 'react'
import { Badge } from '@/domains/core/components/ui/badge'
import { Product, ProductPrice, productService } from '@/services/productService'
import { formatPrice } from '@/utils/formatPrice'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/domains/core/components/ui/tooltip'

interface PriceSummaryBadgeProps {
  product: Product
}

export function PriceSummaryBadge({ product }: PriceSummaryBadgeProps) {
  const [allPrices, setAllPrices] = useState<ProductPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch prices directly from API when component mounts or product changes
  useEffect(() => {
    if (!product?.id) return;
    
    setIsLoading(true);
    productService.getPrices(product.id)
      .then(prices => {
        setAllPrices(prices);
      })
      .catch(error => {
        console.error('Error fetching prices:', error);
        // Fallback to product.prices if API call fails
        if (product.prices && product.prices.length > 0) {
          setAllPrices(product.prices);
        } else if (typeof (product as any).price === 'number') {
          // Legacy fallback
          setAllPrices([{
            id: 0,
            price_type: 'legacy',
            price_type_display: 'Price',
            currency: 'USD',
            amount: (product as any).price,
            valid_from: '',
            valid_to: null,
            created_at: '',
            updated_at: '',
            channel: null
          }]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [product?.id]);
  
  // Early return if loading or no prices at all
  if (isLoading) {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-400">
        Loading...
      </Badge>
    )
  }

  if (allPrices.length === 0) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-800">
        No price
      </Badge>
    )
  }

  // Get price count for badge
  const priceCount = allPrices.length;
  
  // Select display price in order of priority: BASE, LIST, first available
  const basePrice = allPrices.find(p => 
    p.price_type === 'BASE' || 
    p.price_type === 'base' || 
    p.price_type_display === 'Base Price'
  );
  
  const listPrice = allPrices.find(p => 
    p.price_type === 'LIST' || 
    p.price_type === 'list' || 
    p.price_type_display === 'List Price'
  );
  
  const primaryPrice = basePrice || listPrice || allPrices[0];
  const formattedPrice = formatPrice(primaryPrice.amount, { currency: primaryPrice.currency });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="cursor-pointer font-medium">
              {formattedPrice}
            </Badge>
            
            {priceCount > 1 && (
              <Badge variant="secondary" className="cursor-pointer text-xs">
                +{priceCount - 1}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3 w-auto min-w-[300px]">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-semibold text-sm">All Price Types</h4>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {priceCount} {priceCount === 1 ? 'price' : 'prices'}
              </span>
            </div>
            
            <div className="max-h-48 overflow-auto pr-1">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="text-left py-1 px-2 bg-muted/50 rounded-l-sm text-muted-foreground">Type</th>
                    <th className="text-right py-1 px-2 bg-muted/50 text-muted-foreground">Amount</th>
                    <th className="text-left py-1 px-2 bg-muted/50 rounded-r-sm text-muted-foreground">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {allPrices.map((price, idx) => {
                    const isPrimary = price.id === primaryPrice.id;
                    return (
                      <tr key={idx} className={`${isPrimary ? 'bg-primary/5' : idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                        <td className="text-left p-2 font-medium rounded-l-sm">
                          {isPrimary && (
                            <span className="inline-block w-2 h-2 bg-primary rounded-full mr-1.5"></span>
                          )}
                          {price.price_type_display || price.price_type}
                        </td>
                        <td className="text-right p-2 font-medium tabular-nums">
                          {typeof price.amount === 'string' ? parseFloat(price.amount).toFixed(2) : price.amount.toFixed(2)}
                        </td>
                        <td className="text-left p-2 rounded-r-sm">
                          {price.currency}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="text-xs text-muted-foreground border-t pt-2">
              <span className="inline-block w-2 h-2 bg-primary rounded-full mr-1.5"></span>
              Primary price shown in table
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 