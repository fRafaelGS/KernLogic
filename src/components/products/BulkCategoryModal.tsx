import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { productService } from '@/services/productService';
import { Loader2 } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { CategoryTreeSelect } from '../categories/CategoryTreeSelect';

interface BulkCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: number[];
  onSuccess: () => void;
}

export function BulkCategoryModal({
  open,
  onOpenChange,
  selectedIds,
  onSuccess
}: BulkCategoryModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Handle category selection
  const handleCategoryChange = (raw: string | number) => {
    const id = typeof raw === 'string' ? +raw : raw;
    setSelectedCategoryId(id || null);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (selectedCategoryId === null || selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      // Use the bulk category assignment API
      await productService.bulkAssignCategory(selectedIds, selectedCategoryId.toString());

      toast({
        title: `Category assigned to ${selectedIds.length} products`,
        description: `All selected products have been moved to the selected category.`,
        variant: "default"
      });
      
      onOpenChange(false);
      setSelectedCategoryId(null);
      onSuccess();
    } catch (error) {
      console.error('Error assigning category:', error);
      toast({
        title: 'Failed to assign category',
        description: 'An error occurred while assigning category to products',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state when modal closes
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setSelectedCategoryId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Assign Category to {selectedIds.length} Selected Products
          </DialogTitle>
          <DialogDescription>
            Choose a category for {selectedIds.length} selected products
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <CategoryTreeSelect
              selectedValue={selectedCategoryId}
              onChange={handleCategoryChange}
              className="w-full"
              placeholder="Search categories..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedCategoryId === null || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Apply Category'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 