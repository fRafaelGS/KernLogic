import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/domains/core/components/ui/card'

interface ProductAttributesPanelProps {
  productId?: string | number
  familyId?: number
  attributeGroupId?: number
  locale?: string
  channel?: string
}

export function ProductAttributesPanel({ 
  productId, 
  familyId, 
  attributeGroupId,
  locale = 'en',
  channel = 'web'
}: ProductAttributesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Attributes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Simplified attribute panel for debugging - productId: {productId || 'N/A'}
        </p>
      </CardContent>
    </Card>
  )
}

export default ProductAttributesPanel 