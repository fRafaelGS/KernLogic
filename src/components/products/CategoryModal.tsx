import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [treeKey, setTreeKey] = useState(0);
  
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
  const handleCategoryChange = async (raw: string | number) => {
    const id = typeof raw === 'string' ? +raw : raw;
    setSelectedCategoryId(id || null);
    
    if (id) {
      try {
        const categories = await categoryService.getCategories();
        const categoryData = categories.find(c => c.id === id);
        setSelectedCategory(categoryData ?? { id, name: `Category ${id}` } as Category);
      } catch (error) {
        console.error('Error fetching category data:', error);
      }
    } else {
      setSelectedCategory(null);
    }
  };
  
  // NEW: create a category under the currently selected parent (or root)
  const handleCreateCategory = async (name: string) => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setIsSubmitting(true);
    try {
      await categoryService.createCategory(name.trim(), selectedCategoryId || undefined);
      setTreeKey(k => k + 1);
      toast.success(`Created category “${name.trim()}”`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Update product category
  const handleSubmit = async () => {
    if (!productId) return;
    
    setIsSubmitting(true);
    try {
      const success = await categoryService.updateProductCategory(productId, selectedCategoryId);
      if (success) {
        const resultCat = selectedCategoryId
          ? selectedCategory!
          : ({ id: 0, name: 'Uncategorized' } as Category);
        onCategoryUpdated(resultCat);
        toast.success(
          selectedCategoryId ? 'Category updated' : 'Category removed'
        );
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select or Create Category</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <CategoryTreeSelect
            key={treeKey}
            selectedValue={selectedCategoryId}
            onChange={handleCategoryChange}
            onCreate={handleCreateCategory}
            className="w-full"
            placeholder="Search or select a category..."
            disabled={isSubmitting}
            createNewEnabled={true}
          />
          
          {selectedCategory && (
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                Selected category:
              </p>
              <p className="text-base font-semibold">
                {selectedCategory.name}
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
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
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 