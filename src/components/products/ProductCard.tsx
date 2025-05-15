import React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Product } from '@/services/productService'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getCategoryName } from '@/lib/utils'
import { pickPrimaryImage } from '@/utils/images'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  // Get the primary image using the same utility used in the table
  const imageUrl = pickPrimaryImage(product)
  
  // Get category name safely
  const categoryName = Array.isArray(product.category) 
    ? product.category.map(c => c.name).join(' > ')
    : getCategoryName(product.category)

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow border-slate-200">
      <Link 
        to={`/app/products/${product.id}`}
        className="flex flex-col flex-1"
      >
        <div className="relative pt-[100%] bg-slate-50">
          <div className="absolute inset-0 flex items-center justify-center">
            <Avatar className="h-full w-full rounded-none">
              <AvatarImage 
                src={imageUrl || ''} 
                alt={product.name}
                className="object-cover"
              />
              <AvatarFallback className="text-base rounded-none bg-slate-100">
                {product.name?.substring(0, 2).toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        <CardContent className="flex-1 p-2 pb-1">
          <h3 className="font-medium text-xs line-clamp-2 mb-0.5">
            {product.name}
          </h3>
          <p className="text-[11px] text-slate-500 mb-1">
            SKU: {product.sku}
          </p>
          {categoryName && (
            <p className="text-[11px] text-slate-600 mb-1 line-clamp-1">
              {categoryName}
            </p>
          )}
        </CardContent>
        
        <CardFooter className="p-2 pt-0 flex items-center justify-between">
          <Badge 
            variant={product.is_active ? "default" : "secondary"}
            className="flex items-center gap-1 h-5 px-1.5 text-[10px]"
          >
            {product.is_active ? 
              <CheckCircle className="h-2.5 w-2.5" /> : 
              <XCircle className="h-2.5 w-2.5" />
            }
            <span>{product.is_active ? 'Active' : 'Inactive'}</span>
          </Badge>
        </CardFooter>
      </Link>
    </Card>
  )
} 