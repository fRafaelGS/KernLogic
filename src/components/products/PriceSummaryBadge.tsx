import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Product, ProductPrice } from '@/services/productService'
import { formatPrice } from '@/utils/formatPrice'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

interface PriceSummaryBadgeProps {
  product: Product
}

export function PriceSummaryBadge({ product }: PriceSummaryBadgeProps) {
  // Early return if no prices
  if (!product.prices || product.prices.length === 0) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-800">
        {formatPrice(product.price || 0)} (Legacy)
      </Badge>
    )
  }

  // Get all available price types
  const priceCount = product.prices.length
  const basePrice = product.prices.find(p => p.price_type === 'BASE')
  const listPrice = product.prices.find(p => p.price_type === 'LIST')
  
  // Select display price in order of priority: BASE, LIST, first available
  const primaryPrice = basePrice || listPrice || product.prices[0]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="cursor-pointer">
              {formatPrice(primaryPrice.amount, { currency: primaryPrice.currency })}
              <span className="ml-1 text-xs opacity-80">
                ({primaryPrice.price_type_display || primaryPrice.price_type})
              </span>
            </Badge>
            
            {priceCount > 1 && (
              <Badge variant="secondary" className="cursor-pointer">
                +{priceCount - 1} more
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3">
          <div className="space-y-2">
            <h4 className="font-medium">All Price Types ({priceCount})</h4>
            <div className="max-h-40 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1">Type</th>
                    <th className="text-right p-1">Amount</th>
                    <th className="text-left p-1">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {product.prices.map((price, idx) => (
                    <tr key={idx} className="border-b border-dashed">
                      <td className="text-left p-1 font-medium">
                        {price.price_type_display || price.price_type}
                      </td>
                      <td className="text-right p-1 font-medium tabular-nums">
                        {typeof price.amount === 'string' ? parseFloat(price.amount).toFixed(2) : price.amount.toFixed(2)}
                      </td>
                      <td className="text-left p-1">
                        {price.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 