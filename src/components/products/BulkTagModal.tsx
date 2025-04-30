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

  // Handle tag selection change
  const handleTagChange = (
    newValue: OnChangeValue<TagOption, true>,
    actionMeta: ActionMeta<TagOption>
  ) => {
    setSelectedTags(newValue ? [...newValue] : []);
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
          <AsyncCreatableSelect
            isMulti
            cacheOptions
            defaultOptions
            loadOptions={(inputValue) => productService.searchTags(inputValue)}
            onChange={handleTagChange}
            value={selectedTags}
            placeholder="Select or create tags..."
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
              multiValue: (base) => ({
                ...base,
                backgroundColor: '#e0f2fe',
                borderRadius: '4px'
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: '#0369a1',
                fontWeight: 500
              }),
              multiValueRemove: (base) => ({
                ...base,
                color: '#0369a1',
                '&:hover': {
                  backgroundColor: '#bae6fd',
                  color: '#0369a1'
                }
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
            classNames={{
              control: () => 'py-1'
            }}
            formatCreateLabel={(input) => `Create tag "${input}"`}
            onCreateOption={async (inputValue) => {
              try {
                setIsSubmitting(true);
                const newTag = await productService.createTag({ name: inputValue });
                const newOption = { label: newTag.name, value: newTag.id.toString() };
                setSelectedTags(prev => [...prev, newOption]);
              } catch (error) {
                console.error('Error creating tag:', error);
                toast({
                  title: 'Failed to create tag',
                  description: 'An error occurred while creating the new tag',
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