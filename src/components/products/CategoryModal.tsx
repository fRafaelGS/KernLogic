import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as categoryService from '@/services/categoryService';
import { Category } from '@/services/categoryService';
import { toast } from 'sonner';
import { ChevronRight, FolderIcon, Loader2 } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

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
  // Store category tree
  const [categories, setCategories] = useState<Category[]>([]);
  // Selected category
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  // Loading state
  const [loading, setLoading] = useState(false);
  // Search term
  const [searchTerm, setSearchTerm] = useState('');
  // List of expanded category IDs (for UI state)
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  
  // Fetch categories when the modal opens
  useEffect(() => {
    if (open) {
      fetchCategoryTree();
    }
  }, [open]);
  
  // Set initially selected category based on the current product category
  useEffect(() => {
    if (currentCategoryId && categories.length > 0) {
      // Find the current category in the flat list
      const findCategory = (cats: Category[]): Category | null => {
        for (const cat of cats) {
          if (cat.id === currentCategoryId) {
            return cat;
          }
          if (cat.children?.length) {
            const found = findCategory(cat.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const currentCategory = findCategory(categories);
      if (currentCategory) {
        setSelectedCategory(currentCategory);
        
        // Expand parent categories
        if (currentCategory.parent) {
          // Find all parent IDs
          const parentIds = getParentIds(categories, currentCategory.id);
          setExpandedIds(parentIds);
        }
      }
    }
  }, [currentCategoryId, categories]);
  
  // Get all parent IDs for a category
  const getParentIds = (cats: Category[], categoryId: number, path: number[] = []): number[] => {
    for (const cat of cats) {
      if (cat.id === categoryId) {
        return path;
      }
      if (cat.children?.length) {
        const found = getParentIds(cat.children, categoryId, [...path, cat.id]);
        if (found.length) return found;
      }
    }
    return [];
  };
  
  // Fetch category tree from API
  const fetchCategoryTree = async () => {
    setLoading(true);
    try {
      const categoryTree = await categoryService.getCategoryTree();
      setCategories(categoryTree);
    } catch (error) {
      toast.error('Failed to fetch categories');
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Update product category
  const handleUpdateCategory = async () => {
    if (!productId || !selectedCategory) return;
    
    setLoading(true);
    try {
      const success = await categoryService.updateProductCategory(productId, selectedCategory.id);
      if (success) {
        toast.success('Category updated successfully');
        onCategoryUpdated(selectedCategory);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Failed to update category');
      console.error('Error updating category:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle category selection
  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
  };
  
  // Toggle category expansion
  const toggleExpand = (categoryId: number) => {
    setExpandedIds(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  
  // Filter categories by search term
  const filterCategories = (cats: Category[], term: string): Category[] => {
    if (!term) return cats;
    
    return cats.filter(cat => {
      // Include if name matches
      if (cat.name.toLowerCase().includes(term.toLowerCase())) {
        return true;
      }
      
      // Include if any children match (recursively)
      if (cat.children?.length) {
        const filteredChildren = filterCategories(cat.children, term);
        if (filteredChildren.length) {
          // Create a new category object with only matching children
          return {
            ...cat,
            children: filteredChildren
          };
        }
      }
      
      return false;
    });
  };
  
  // Render a category and its children recursively
  const renderCategory = (category: Category, depth = 0) => {
    const isExpanded = expandedIds.includes(category.id);
    const hasChildren = category.children && category.children.length > 0;
    
    return (
      <div key={category.id} className="category-item">
        <div 
          className={`
            flex items-center py-2 px-2 hover:bg-slate-100 rounded cursor-pointer
            ${selectedCategory?.id === category.id ? 'bg-slate-100 font-medium' : ''}
          `}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => handleSelectCategory(category)}
        >
          {hasChildren && (
            <ChevronRight
              className={`h-4 w-4 mr-1 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(category.id);
              }}
            />
          )}
          {!hasChildren && <div className="w-5" />}
          <FolderIcon className="h-4 w-4 mr-2 text-slate-400" />
          <span>{category.name}</span>
        </div>
        
        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div className="ml-2">
            {category.children!.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  // Get filtered categories based on search term
  const filteredCategories = searchTerm 
    ? filterCategories(categories, searchTerm)
    : categories;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Category</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <Label htmlFor="search">Search Categories</Label>
          <Input
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
            className="mt-1"
          />
        </div>
        
        <div className="h-[300px] overflow-y-auto border rounded p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Loading categories...
            </div>
          ) : filteredCategories.length > 0 ? (
            <div className="categories-tree">
              {filteredCategories.map(category => renderCategory(category))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No categories found.
            </div>
          )}
        </div>
        
        <div className="mt-2">
          {selectedCategory && (
            <div className="text-sm">
              Selected: <span className="font-medium">{selectedCategory.name}</span>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateCategory}
            disabled={!selectedCategory || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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