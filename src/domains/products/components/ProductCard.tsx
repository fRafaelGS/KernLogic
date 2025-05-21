import React from 'react'
import { Product } from '@/services/productService'
import { Card, CardContent, CardFooter } from '@/domains/core/components/ui/card'
import { Badge } from '@/domains/core/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { pickPrimaryImage } from '@/utils/images'
import { Avatar, AvatarFallback, AvatarImage } from '@/domains/core/components/ui/avatar'
import { getCategoryName } from '@/domains/core/lib/utils'
import { FamilyDisplay } from '@/domains/products/components/FamilyDisplay'
import { useFamilies } from '@/domains/products/services/familyApi'
import { normalizeFamily } from '@/utils/familyNormalizer'

interface ProductCardProps {
  product: Product
  onSelect?: (product: Product) => void
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const navigate = useNavigate()
  const { data: families, isLoading: isFamiliesLoading } = useFamilies()
  
  // Get the primary image using the same utility used in the table
  const imageUrl = pickPrimaryImage(product)
  
  // Get category name safely - ensure product.category exists before passing it
  const categoryName = product && product.category ? getCategoryName(product.category) : ''
  
  // Process family data like in the list view
  const processedFamily = React.useMemo(() => {
    // Get family data from the product - might be a family object, ID, or family_name string
    const family = product.family
    const familyName = product.family_name
    
    // First try using family object or ID if available
    if (family) {
      // Normalize the family data for consistent format
      let normalizedFamily = normalizeFamily(family)
      
      // If we have families data and normalized family shows a generic label ("Family X"),
      // try to find the complete family data from the families list
      if (normalizedFamily && families && families.length > 0 && !isFamiliesLoading) {
        // Check if we need to enhance with full family data
        const hasGenericLabel = normalizedFamily.label.includes(`Family ${normalizedFamily.id}`)
        const isMissingProperties = !normalizedFamily.code || normalizedFamily.code === `family-${normalizedFamily.id}`
        
        if (hasGenericLabel || isMissingProperties) {
          const fullFamily = families.find(f => f.id === normalizedFamily?.id)
          if (fullFamily) {
            normalizedFamily = normalizeFamily(fullFamily)
          }
        }
      }
      return normalizedFamily
    }
    
    // If direct family object isn't available but family_name is, use that
    if (familyName) {
      return { label: familyName }
    }
    
    // No family data found
    return null
  }, [product, families, isFamiliesLoading])
  
  // Handle click - either call onSelect or navigate
  const handleClick = () => {
    if (onSelect) {
      onSelect(product)
    } else {
      navigate(`/products/${product.id}`)
    }
  }
  
  return (
    <Card 
      className="h-full cursor-pointer hover:shadow-md transition-shadow duration-200 flex flex-col"
      onClick={handleClick}
    >
      <div className="w-full aspect-square relative overflow-hidden rounded-t-md">
        <Avatar className="h-full w-full rounded-none">
          <AvatarImage 
            src={imageUrl || ''} 
            alt={product.name} 
            className="object-cover w-full h-full bg-slate-50"
            loading="lazy"
          />
          <AvatarFallback className="text-base rounded-none bg-slate-100">
            {product.name?.substring(0, 2).toUpperCase() || 'P'}
          </AvatarFallback>
        </Avatar>
        
        {!product.is_active && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Inactive
          </Badge>
        )}
      </div>
      
      <CardContent className="flex-grow p-3 pt-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
        <p className="text-xs text-muted-foreground mb-1">SKU: {product.sku}</p>
        {categoryName && (
          <p className="text-xs text-muted-foreground truncate">
            {categoryName}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 pb-3 px-3">
        <div className="w-full flex items-center justify-between">
          <p className="font-medium">
            {product.price ? `$${Number(product.price).toFixed(2)}` : 'No price'}
          </p>
          
          <div className="flex justify-center">
            <FamilyDisplay 
              family={processedFamily}
              badgeVariant="secondary"
              showEmpty={true}
              showCode={false}
              hideTooltip={true}
              className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
            />
          </div>
        </div>
      </CardFooter>
    </Card>
  )
} 