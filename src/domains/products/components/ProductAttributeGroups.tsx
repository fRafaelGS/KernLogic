import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/domains/core/components/ui/card'

interface ProductAttributeGroupsProps {
  product: any
  onGroupsChange?: () => void
}

export function ProductAttributeGroups({ product, onGroupsChange }: ProductAttributeGroupsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Attribute Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Simplified attribute groups panel for debugging - productId: {product?.id || 'N/A'}
        </p>
      </CardContent>
    </Card>
  )
} 