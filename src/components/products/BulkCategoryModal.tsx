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
import AsyncCreatableSelect from 'react-select/async-creatable';
import { getCategoryTree } from '@/services/categoryService';

interface BulkCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: number[];
  onSuccess: () => void;
  parentCategoryId?: number;
}

interface CategoryOption {
  label: string;
  value: string;
}

export function BulkCategoryModal({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
  parentCategoryId
}: BulkCategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedCategory || selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await productService.bulkAssignCategory(selectedIds, selectedCategory.label);
      toast({
        title: `Category updated for ${selectedIds.length} products`,
        description: `Successfully set category to "${selectedCategory.label}" for the selected products`,
        variant: "default"
      });
      onOpenChange(false);
      setSelectedCategory(null);
      onSuccess();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Failed to update category',
        description: 'An error occurred while updating the category for the selected products',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh category tree
  const refreshCategoryTree = async () => {
    try {
      await getCategoryTree();
    } catch (error) {
      console.error('Error refreshing category tree:', error);
    }
  };

  // Explicitly type the loadOptions function to match what AsyncCreatableSelect expects
  const loadCategoryOptions = async (inputValue: string): Promise<CategoryOption[]> => {
    const options = await productService.searchCategories(inputValue);
    return options.map(option => ({
      label: option.label,
      value: option.value.toString()
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Category for {selectedIds.length} Products</DialogTitle>
          <DialogDescription>
            Choose a category to assign to all selected products. 
            You can select an existing category or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AsyncCreatableSelect
            isClearable
            cacheOptions
            defaultOptions
            loadOptions={loadCategoryOptions}
            onChange={(newValue) => setSelectedCategory(newValue as CategoryOption)}
            value={selectedCategory}
            placeholder="Select or create a category..."
            menuPosition="fixed"
            styles={{
              control: (base) => ({
                ...base,
                borderColor: '#e2e8f0',
                boxShadow: 'none',
                '&:hover': {
                  borderColor: '#94a3b8'
                },
                '&:focus-within': {
                  borderColor: '#3b82f6',
                  boxShadow: '0 0 0 1px #3b82f6'
                }
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused 
                  ? '#e2e8f0' 
                  : state.isSelected 
                    ? '#bfdbfe' 
                    : 'white',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: state.isSelected ? '500' : '400',
                padding: '8px 12px',
                '&:hover': {
                  backgroundColor: '#e2e8f0'
                },
                transition: 'background-color 0.2s ease'
              }),
              singleValue: (base) => ({
                ...base,
                color: '#0369a1',
                fontWeight: 500
              }),
              menu: (base) => ({
                ...base,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                borderRadius: '6px'
              }),
              input: (base) => ({
                ...base,
                color: '#334155'
              }),
              placeholder: (base) => ({
                ...base,
                color: '#94a3b8'
              })
            }}
            formatCreateLabel={(input) => `Create category "${input}"`}
            onCreateOption={async (inputValue) => {
              try {
                setIsSubmitting(true);
                const newCategory = await productService.createCategory({ 
                  name: inputValue, 
                  parentId: parentCategoryId 
                });
                setSelectedCategory({ label: newCategory.name, value: newCategory.id.toString() });
                
                await refreshCategoryTree();
              } catch (error) {
                console.error('Error creating category:', error);
                toast({
                  title: 'Failed to create category',
                  description: 'An error occurred while creating the new category',
                  variant: 'destructive'
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedCategory || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Set Category'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 