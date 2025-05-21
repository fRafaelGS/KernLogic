import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/domains/core/components/ui/dialog'
import { Button } from '@/domains/core/components/ui/button'

interface CategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: number
  currentCategoryId: string | number | null
  onCategoryUpdated: (category: { id: string | number, name: string }) => void
}

export function CategoryModal({ 
  open, 
  onOpenChange, 
  productId, 
  currentCategoryId, 
  onCategoryUpdated 
}: CategoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Category</DialogTitle>
          <DialogDescription>
            Choose a category for this product
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* Simplified implementation */}
          <p className="text-muted-foreground">
            Category selection component (simplified implementation for debugging)
          </p>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onCategoryUpdated({ id: 1, name: 'Default Category' })}>
            Select Category
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 