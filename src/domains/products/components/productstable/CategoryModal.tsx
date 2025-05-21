import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/domains/core/components/ui/dialog';
import { Button } from '@/domains/core/components/ui/button';
import { Input } from '@/domains/core/components/ui/input';
import { Checkbox } from '@/domains/core/components/ui/checkbox';
import * as categoryService from '@/services/categoryService';
import { Category } from '@/services/categoryService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CategoryTreeSelect } from '@/domains/categories/components/CategoryTreeSelect';
import { config } from '@/config/config';

// Temporary compatibility layer during migration
const categoryModalConfig = {
  title: 'Select or Create Category',
  placeholders: {
    categorySearch: 'Search or select a category...',
    newCategory: 'New category name...'
  },
  labels: {
    selectedCategory: 'Selected category:',
    createNewCategory: 'Create new category',
    createAtTopLevel: 'Create at top-level (no parent)'
  },
  buttons: {
    create: 'Create',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...'
  },
  messages: {
    created: (name: string) => `Created category "${name}"`,
    updated: 'Category updated',
    removed: 'Category removed',
    error: {
      emptyName: 'Please enter a name',
      createFailed: 'Failed to create category',
      updateFailed: 'Failed to update category'
    }
  }
};

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
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  
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
  
  useEffect(() => {
    // Fetch the category tree for label resolution
    const fetchTree = async () => {
      const tree = await categoryService.getCategoryTree();
      setCategoryTree(tree);
    };
    if (open) fetchTree();
  }, [open]);
  
  // Handle category selection from tree - only updates local state
  const handleCategoryChange = async (raw: string | number) => {
    const id = typeof raw === 'string' ? +raw : raw;
    setSelectedCategoryId(id || null);
    if (id) {
      // Use the tree to find the node and get the label
      const node = categoryService.findNodeById(categoryTree, id);
      if (node) {
        setSelectedCategory({ id, name: node.label });
      } else {
        setSelectedCategory({ id, name: `Category ${id}` });
      }
      setCreateAtTopLevel(false);
    } else {
      setSelectedCategory(null);
    }
  };
  
  // Create a new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error(categoryModalConfig.messages.error.emptyName);
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Use either null (top level) or the selected category ID as parent
      const parentId = createAtTopLevel ? null : selectedCategoryId;
      await categoryService.createCategory(newCategoryName.trim(), parentId || undefined);
      setTreeKey(k => k + 1);
      toast.success(categoryModalConfig.messages.created(newCategoryName.trim()));
      setNewCategoryName("");
    } catch (err) {
      console.error(err);
      toast.error(categoryModalConfig.messages.error.createFailed);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Save the selected category to the product
  const handleSave = async () => {
    if (!selectedCategoryId) return;
    setIsSubmitting(true);
    try {
      if (!productId) {
        // In create mode, just return the selected category object
        if (selectedCategory) {
          onCategoryUpdated(selectedCategory);
          onOpenChange(false);
        }
        setIsSubmitting(false);
        return;
      }
      // In edit mode, update via API
      const success = await categoryService.updateProductCategory(productId, selectedCategoryId);
      if (success) {
        const resultCat = selectedCategoryId
          ? selectedCategory!
          : ({ id: 0, name: 'Uncategorized' } as Category);
        onCategoryUpdated(resultCat);
        toast.success(
          selectedCategoryId ? categoryModalConfig.messages.updated : categoryModalConfig.messages.removed
        );
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(categoryModalConfig.messages.error.updateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{categoryModalConfig.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <CategoryTreeSelect
            key={treeKey}
            selectedValue={selectedCategoryId}
            onChange={handleCategoryChange}
            className="w-full"
            placeholder={categoryModalConfig.placeholders.categorySearch}
            disabled={isSubmitting}
          />
          
          {selectedCategory && (
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                {categoryModalConfig.labels.selectedCategory}
              </p>
              <p className="text-base font-semibold">
                {selectedCategory.name}
              </p>
            </div>
          )}
          
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">{categoryModalConfig.labels.createNewCategory}</p>
            <div className="flex items-center gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={categoryModalConfig.placeholders.newCategory}
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || isSubmitting}
              >
                {categoryModalConfig.buttons.create}
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
                {categoryModalConfig.labels.createAtTopLevel}
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
            {categoryModalConfig.buttons.cancel}
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {categoryModalConfig.buttons.saving}
              </>
            ) : (
              categoryModalConfig.buttons.save
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 