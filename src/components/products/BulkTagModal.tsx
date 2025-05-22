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
import { ActionMeta, OnChangeValue } from 'react-select';

interface BulkTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: number[];
  onSuccess: () => void;
}

interface TagOption {
  label: string;
  value: string;
}

export function BulkTagModal({
  open,
  onOpenChange,
  selectedIds,
  onSuccess
}: BulkTagModalProps) {
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Handle submit
  const handleSubmit = async () => {
    if (selectedTags.length === 0 || selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      // Extract tag names from the selected options
      const tagNames = selectedTags.map(tag => tag.label);
      
      await productService.bulkAddTags(selectedIds, tagNames);
      toast({
        title: `Tags added to ${selectedIds.length} products`,
        description: `All selected products now have the tags: ${tagNames.join(', ')}`,
        variant: "default"
      });
      onOpenChange(false);
      setSelectedTags([]);
      onSuccess();
    } catch (error) {
      console.error('Error adding tags:', error);
      toast({
        title: 'Failed to add tags',
        description: 'An error occurred while adding tags to products',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Tags to {selectedIds.length} Products</DialogTitle>
          <DialogDescription>
            Select or create tags to add to all selected products.
            These tags will be added to any existing tags on the products.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Remove: <AsyncCreatableSelect ... /> usage for category */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedTags.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Tags...
              </>
            ) : (
              'Add Tags'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 