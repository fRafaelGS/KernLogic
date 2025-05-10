import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import * as categoryService from '@/services/categoryService';
import { Category } from '@/services/categoryService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CategoryTreeSelect } from '../categories/CategoryTreeSelect';

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  currentCategoryId?: number | null;
  onCategoryUpdated: (category: Category) => void;
}

export function CategoryModal({ 
  open, 
  onOpenChange, 
  productId, 
  currentCategoryId,
  onCategoryUpdated 
}: CategoryModalProps) {
  // Selected category ID
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(currentCategoryId || null);
  // Track full category data
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  // Loading state for save operation
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // When the modal opens, fetch the current category data if we only have an ID
  useEffect(() => {
    if (open && currentCategoryId && !selectedCategory) {
      const fetchCategoryData = async () => {
        try {
          const categories = await categoryService.getCategories();
          const categoryData = categories.find(c => c.id === currentCategoryId);
          if (categoryData) {
            setSelectedCategory(categoryData);
          }
        } catch (error) {
          console.error('Error fetching category data:', error);
        }
      };
      
      fetchCategoryData();
    }
  }, [open, currentCategoryId, selectedCategory]);
  
  // Handle category selection from tree
  const handleCategoryChange = async (categoryId: string | number) => {
    // Ensure categoryId is a number
    const id = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
    setSelectedCategoryId(id);
    
    // Also fetch the full category data
    if (id) {
      try {
        const categories = await categoryService.getCategories();
        const categoryData = categories.find(c => c.id === id);
        if (categoryData) {
          setSelectedCategory(categoryData);
        } else {
          // Fallback if category not found
          setSelectedCategory({ id, name: `Category ${id}` } as Category);
        }
      } catch (error) {
        console.error('Error fetching category data:', error);
      }
    } else {
      setSelectedCategory(null);
    }
  };
  
  // Update product category
  const handleSubmit = async () => {
    if (!productId) return;
    
    setIsSubmitting(true);
    try {
      const success = await categoryService.updateProductCategory(productId, selectedCategoryId);
      if (success) {
        if (selectedCategory) {
          // Use the already fetched category data
          onCategoryUpdated(selectedCategory);
          toast.success('Category updated successfully');
        } else if (selectedCategoryId) {
          // This is a fallback that should rarely be needed
          const categories = await categoryService.getCategories();
          const categoryData = categories.find(c => c.id === selectedCategoryId);
          
          if (categoryData) {
            onCategoryUpdated(categoryData);
            toast.success('Category updated successfully');
          } else {
            toast.error('Category updated but details not found');
          }
        } else {
          // If category was set to null (uncategorized)
          onCategoryUpdated({ id: 0, name: 'Uncategorized' } as Category);
          toast.success('Category removed successfully');
        }
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Failed to update category');
      console.error('Error updating category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Category</DialogTitle>
        </DialogHeader>
        
        <div className="pt-4 pb-6">
          <CategoryTreeSelect
            selectedValue={selectedCategoryId}
            onChange={handleCategoryChange}
            className="w-full"
            placeholder="Search or select a category..."
            disabled={isSubmitting}
            createNewEnabled={true}
          />
          
          {selectedCategory && (
            <div className="mt-2 p-2 bg-muted/40 rounded">
              <span className="text-sm text-muted-foreground">Selected: </span>
              <span className="text-sm font-medium">{selectedCategory.name}</span>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Category'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 