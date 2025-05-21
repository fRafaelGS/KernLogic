import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/domains/core/components/ui/dialog'
import { Button } from '@/domains/core/components/ui/button'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
  productId?: number
  draftPrices?: any[]
  setDraftPrices?: (prices: any[]) => void
  onPricesUpdated?: () => void
}

export function PricingModal({ 
  isOpen, 
  onClose,
  productId,
  draftPrices = [],
  setDraftPrices,
  onPricesUpdated
}: PricingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Product Pricing</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-muted-foreground">
            Simplified pricing modal for debugging - productId: {productId || 'N/A'}
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => {
            if (onPricesUpdated) onPricesUpdated()
            onClose()
          }}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 