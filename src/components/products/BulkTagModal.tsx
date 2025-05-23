import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productService } from '@/services/productService';
import { Loader2, Plus, Minus } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import AsyncCreatableSelect from 'react-select/async-creatable';
import { ActionMeta, OnChangeValue } from 'react-select';
import { useQueryClient } from '@tanstack/react-query';

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
  const [tagsToAdd, setTagsToAdd] = useState<TagOption[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<TagOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load all available tags when modal opens
  useEffect(() => {
    if (open) {
      loadAllTags();
    }
  }, [open]);

  // Load all tags for default options
  const loadAllTags = async () => {
    try {
      console.log('Loading all tags...');
      const tags = await productService.searchTags('');
      console.log('Loaded tags:', tags);
      setAllTags(tags);
    } catch (error) {
      console.error('Error loading all tags:', error);
      setAllTags([]);
    }
  };

  // Load tag options with debounce
  const loadTagOptions = async (inputValue: string): Promise<TagOption[]> => {
    try {
      console.log('Loading tag options for input:', inputValue);
      
      // If no input, return all tags
      if (!inputValue.trim()) {
        return allTags;
      }
      
      // Search for tags matching the input
      const searchResults = await productService.searchTags(inputValue.trim());
      console.log('Search results:', searchResults);
      
      return searchResults;
    } catch (error) {
      console.error('Error loading tag options:', error);
      return [];
    }
  };

  // Handle creating new tags
  const handleCreateTag = async (inputValue: string): Promise<TagOption | null> => {
    if (!inputValue.trim()) return null;
    
    try {
      console.log('Creating new tag:', inputValue.trim());
      const newTag = await productService.createTag({ name: inputValue.trim() });
      console.log('Created tag:', newTag);
      
      const newOption: TagOption = { 
        label: newTag.name, 
        value: newTag.name // Use name as value for consistency with backend
      };
      
      // Add to all tags cache
      setAllTags(prev => [...prev, newOption]);
      
      toast({ 
        title: `Tag "${inputValue.trim()}" created`, 
        variant: "default" 
      });
      
      return newOption;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({ 
        title: 'Failed to create tag', 
        variant: 'destructive' 
      });
      return null;
    }
  };

  // Handle adding tags
  const handleAddTags = async () => {
    if (tagsToAdd.length === 0 || selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      // Use the label (tag name) for the API call
      const tagNames = tagsToAdd.map(tag => tag.label);
      console.log('[handleAddTags] Starting tag addition process...');
      console.log('[handleAddTags] Selected product IDs:', selectedIds);
      console.log('[handleAddTags] Tags to add (objects):', tagsToAdd);
      console.log('[handleAddTags] Tag names for API:', tagNames);
      
      const result = await productService.bulkAddTags(selectedIds, tagNames);
      console.log('[handleAddTags] API result:', result);
      
      toast({
        title: `Tags added to ${selectedIds.length} products`,
        description: `Added tags: ${tagNames.join(', ')}`,
        variant: "default"
      });
      
      // Reset and close
      setTagsToAdd([]);
      onOpenChange(false);
      onSuccess();

      // Invalidate all product queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['products'] });
      console.log('[handleAddTags] Product queries invalidated, UI should refresh');
    } catch (error) {
      console.error('[handleAddTags] Error adding tags:', error);
      if (error instanceof Error) {
        console.error('[handleAddTags] Error message:', error.message);
        console.error('[handleAddTags] Error stack:', error.stack);
      }
      toast({
        title: 'Failed to add tags',
        description: 'An error occurred while adding tags to products',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle removing tags
  const handleRemoveTags = async () => {
    if (tagsToRemove.length === 0 || selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      // Use the label (tag name) for the API call
      const tagNames = tagsToRemove.map(tag => tag.label);
      console.log('[handleRemoveTags] Starting tag removal process...');
      console.log('[handleRemoveTags] Selected product IDs:', selectedIds);
      console.log('[handleRemoveTags] Tags to remove (objects):', tagsToRemove);
      console.log('[handleRemoveTags] Tag names for API:', tagNames);
      
      const result = await productService.bulkRemoveTags(selectedIds, tagNames);
      console.log('[handleRemoveTags] API result:', result);
      
      toast({
        title: `Tags removed from ${selectedIds.length} products`,
        description: `Removed tags: ${tagNames.join(', ')}`,
        variant: "default"
      });
      
      // Reset and close
      setTagsToRemove([]);
      onOpenChange(false);
      onSuccess();

      // Invalidate all product queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['products'] });
      console.log('[handleRemoveTags] Product queries invalidated, UI should refresh');
    } catch (error) {
      console.error('[handleRemoveTags] Error removing tags:', error);
      if (error instanceof Error) {
        console.error('[handleRemoveTags] Error message:', error.message);
        console.error('[handleRemoveTags] Error stack:', error.stack);
      }
      toast({
        title: 'Failed to remove tags',
        description: 'An error occurred while removing tags from products',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'add' | 'remove');
  };

  // Reset state when modal closes
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setTagsToAdd([]);
      setTagsToRemove([]);
      setActiveTab('add');
    }
  };

  // Add CSS to ensure React Select works properly in dialogs
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'bulk-tag-modal-styles';
    style.textContent = `
      .react-select__menu {
        z-index: 60 !important;
      }
      .react-select__menu-portal {
        z-index: 60 !important;
      }
      [data-radix-dialog-content] .react-select__menu {
        z-index: 60 !important;
        position: relative !important;
      }
      [data-radix-dialog-content] .react-select__menu-list {
        max-height: 200px !important;
      }
    `;
    
    if (open) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById('bulk-tag-modal-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [open]);

  // Get current action based on active tab
  const getCurrentAction = () => {
    return activeTab === 'add' ? handleAddTags : handleRemoveTags;
  };

  // Get current tags based on active tab
  const getCurrentTags = () => {
    return activeTab === 'add' ? tagsToAdd : tagsToRemove;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Manage Tags for {selectedIds.length} Selected Products
          </DialogTitle>
          <DialogDescription>
            Add or remove tags for {selectedIds.length} selected products
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Tags
              </TabsTrigger>
              <TabsTrigger value="remove" className="flex items-center gap-2">
                <Minus className="w-4 h-4" />
                Remove Tags
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="add-tags">Add Tags</Label>
                <AsyncCreatableSelect<TagOption, true>
                  id="add-tags"
                  isMulti
                  cacheOptions
                  defaultOptions={allTags}
                  loadOptions={loadTagOptions}
                  onCreateOption={async (inputValue) => {
                    const newOption = await handleCreateTag(inputValue);
                    if (newOption) {
                      setTagsToAdd(prev => [...prev, newOption]);
                    }
                  }}
                  onChange={(newValue: OnChangeValue<TagOption, true>) => {
                    console.log('Add tags onChange:', newValue);
                    setTagsToAdd(Array.isArray(newValue) ? newValue : []);
                  }}
                  value={tagsToAdd}
                  placeholder="Search or create tags..."
                  noOptionsMessage={({ inputValue }) => 
                    inputValue ? `No tags found for "${inputValue}"` : 'Type to search tags'
                  }
                  formatCreateLabel={(inputValue: string) => 
                    `Create tag "${inputValue}"`
                  }
                  isDisabled={isSubmitting}
                  isClearable
                  closeMenuOnSelect={false}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({ 
                      ...base, 
                      minHeight: 40,
                      borderColor: state.isFocused ? '#3b82f6' : base.borderColor,
                      '&:hover': {
                        borderColor: '#3b82f6'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 50
                    }),
                    menuPortal: (base) => ({
                      ...base,
                      zIndex: 50
                    })
                  }}
                />
                {tagsToAdd.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No tags selected to add
                  </p>
                )}
                {tagsToAdd.length > 0 && (
                  <p className="text-sm text-blue-600">
                    Selected {tagsToAdd.length} tag(s) to add: {tagsToAdd.map(t => t.label).join(', ')}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="remove" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="remove-tags">Remove Tags</Label>
                <AsyncCreatableSelect<TagOption, true>
                  id="remove-tags"
                  isMulti
                  cacheOptions
                  defaultOptions={allTags}
                  loadOptions={loadTagOptions}
                  isValidNewOption={() => false} // Disable creation in remove mode
                  onChange={(newValue: OnChangeValue<TagOption, true>) => {
                    console.log('Remove tags onChange:', newValue);
                    setTagsToRemove(Array.isArray(newValue) ? newValue : []);
                  }}
                  value={tagsToRemove}
                  placeholder="Search tags to remove..."
                  noOptionsMessage={({ inputValue }) => 
                    inputValue ? `No tags found for "${inputValue}"` : 'Type to search tags'
                  }
                  isDisabled={isSubmitting}
                  isClearable
                  closeMenuOnSelect={false}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({ 
                      ...base, 
                      minHeight: 40,
                      borderColor: state.isFocused ? '#dc2626' : base.borderColor,
                      '&:hover': {
                        borderColor: '#dc2626'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 50
                    }),
                    menuPortal: (base) => ({
                      ...base,
                      zIndex: 50
                    })
                  }}
                />
                {tagsToRemove.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No tags selected to remove
                  </p>
                )}
                {tagsToRemove.length > 0 && (
                  <p className="text-sm text-red-600">
                    Selected {tagsToRemove.length} tag(s) to remove: {tagsToRemove.map(t => t.label).join(', ')}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
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
            onClick={getCurrentAction()}
            disabled={getCurrentTags().length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {activeTab === 'add' ? 'Adding...' : 'Removing...'}
              </>
            ) : (
              <>
                {activeTab === 'add' ? (
                  <Plus className="mr-2 h-4 w-4" />
                ) : (
                  <Minus className="mr-2 h-4 w-4" />
                )}
                Apply Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 