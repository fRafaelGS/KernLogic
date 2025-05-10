import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  // Selected category ID - local state only
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(currentCategoryId || null);
  // Track full category data
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  // New category name
  const [newCategoryName, setNewCategoryName] = useState("");
  // Create at top level option
  const [createAtTopLevel, setCreateAtTopLevel] = useState(false);
  // Loading state for operations
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
  
  // Handle category selection from tree - only updates local state
  const handleCategoryChange = async (raw: string | number) => {
    const id = typeof raw === 'string' ? +raw : raw;
    setSelectedCategoryId(id || null);
    
    if (id) {
      try {
        const categories = await categoryService.getCategories();
        const categoryData = categories.find(c => c.id === id);
        setSelectedCategory(categoryData ?? { id, name: `Category ${id}` } as Category);
        // If we select a category, disable the "create at top level" option
        setCreateAtTopLevel(false);
      } catch (error) {
        console.error('Error fetching category data:', error);
      }
    } else {
      setSelectedCategory(null);
    }
  };
  
  // Create a new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Use either null (top level) or the selected category ID as parent
      const parentId = createAtTopLevel ? null : selectedCategoryId;
      await categoryService.createCategory(newCategoryName.trim(), parentId || undefined);
      setTreeKey(k => k + 1);
      toast.success(`Created category "${newCategoryName.trim()}"`);
      setNewCategoryName("");
    } catch (err) {
      console.error(err);
      toast.error('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Save the selected category to the product
  const handleSave = async () => {
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
        
        <div className="space-y-4 py-4">
          <CategoryTreeSelect
            key={treeKey}
            selectedValue={selectedCategoryId}
            onChange={handleCategoryChange}
            className="w-full"
            placeholder="Search or select a category..."
            disabled={isSubmitting}
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
          
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Create new category</p>
            <div className="flex items-center gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name..."
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || isSubmitting}
              >
                Create
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="create-top-level"
                checked={createAtTopLevel}
                onCheckedChange={(checked) => {
                  setCreateAtTopLevel(!!checked);
                  if (checked) {
                    setSelectedCategoryId(null);
                    setSelectedCategory(null);
                  }
                }}
              />
              <label 
                htmlFor="create-top-level" 
                className="text-sm cursor-pointer"
              >
                Create at top-level (no parent)
              </label>
            </div>
          </div>
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
            onClick={handleSave}
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