import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronRight, FolderIcon, Loader2, PlusIcon, Trash, RefreshCw, Edit, Save, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from './useCategories';
import { Category } from '@/types/categories';
import { PermissionGuard } from '@/components/common/PermissionGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * SubcategoryManager Component
 * 
 * A standalone component for managing categories and subcategories
 * 
 * @param props Component props
 * @param props.isOpen Optional external control for modal visibility
 * @param props.onOpenChange Optional callback when open state changes
 */
export function SubcategoryManager({ 
  isOpen: externalIsOpen, 
  onOpenChange: externalOnOpenChange 
}: { 
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  // Local state for when external control is not provided
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Auth context for permissions
  const { checkPermission } = useAuth();
  
  // Categories data and operations
  const { 
    categories, 
    isLoading, 
    isError, 
    error, 
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting
  } = useCategories();
  
  // Determine if we use external or internal state
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  
  // Function to update open state
  const setIsOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(open);
    }
    // Call external handler if provided
    if (externalOnOpenChange) {
      externalOnOpenChange(open);
    }
  };
  
  // Toggle modal with state reset
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when closing
      setSelectedCategory(null);
      setNewCategoryName('');
      setEditCategoryName('');
      setSearchTerm('');
    }
  };
  
  // When a category is selected, update the edit field
  React.useEffect(() => {
    if (selectedCategory) {
      setEditCategoryName(selectedCategory.name);
    } else {
      setEditCategoryName('');
    }
  }, [selectedCategory]);
  
  // Handle button click with event stopping
  const handleButtonClick = (e: React.MouseEvent) => {
    // Stop event propagation to prevent parent components from handling it
    e.stopPropagation();
    e.preventDefault();
    
    // Open the modal
    setIsOpen(true);
  };
  
  // Handle category selection
  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
  };
  
  // Toggle category expansion
  const toggleExpand = (categoryId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  
  // Handle creating a new category
  const handleCreateCategory = async () => {
    // Make sure newCategoryName is a string and non-empty before trimming
    if (!newCategoryName || typeof newCategoryName !== 'string' || !newCategoryName.trim()) return;
    
    await createCategory(
      newCategoryName.trim(), 
      selectedCategory ? selectedCategory.id : null
    );
    
    setNewCategoryName('');
  };
  
  // Handle updating a category
  const handleUpdateCategory = async () => {
    if (!selectedCategory || !editCategoryName || typeof editCategoryName !== 'string' || !editCategoryName.trim()) return;
    
    await updateCategory(selectedCategory.id, {
      name: editCategoryName.trim(),
      parent: selectedCategory.parent
    });
  };
  
  // Handle deleting a category
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    await deleteCategory(selectedCategory.id);
    setSelectedCategory(null);
    setShowDeleteConfirm(false);
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
    const isSelected = selectedCategory?.id === category.id;
    
    return (
      <div key={category.id} className="category-item">
        <div 
          className={`
            flex items-center py-2 px-2 hover:bg-slate-100 rounded cursor-pointer group
            ${isSelected ? 'bg-slate-100 font-medium' : ''}
          `}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => handleSelectCategory(category)}
          role="treeitem"
          aria-expanded={isExpanded}
          aria-selected={isSelected}
        >
          {hasChildren && (
            <ChevronRight
              className={`h-4 w-4 mr-1 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
              onClick={(e) => toggleExpand(category.id, e)}
            />
          )}
          {!hasChildren && <div className="w-5" />}
          <FolderIcon className="h-4 w-4 mr-2 text-slate-400" />
          <span>{category.name}</span>
        </div>
        {isExpanded && hasChildren && (
          <div className="ml-2" role="group">
            {category.children!.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  // Filtered categories based on search
  const filteredCategories = searchTerm 
    ? filterCategories(categories, searchTerm)
    : categories;
  
  return (
    <>
      <Button variant="outline" size="sm" className="h-9" onClick={handleButtonClick}>
        <FolderIcon className="mr-2 h-4 w-4" />
        <span>Manage Categories</span>
      </Button>
      
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-screen-md">
          <DialogHeader>
            <DialogTitle>Category Management</DialogTitle>
            <DialogDescription>
              Create, edit, and organize your product categories and subcategories.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left side: Category tree */}
            <div className="md:col-span-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Categories</Label>
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to search..."
                />
              </div>
              
              <div className="h-[400px] overflow-y-auto border rounded-md p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading categories...
                  </div>
                ) : isError ? (
                  <Alert variant="destructive" className="h-full flex flex-col justify-center">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription className="flex flex-col space-y-2">
                      <span>Failed to load categories</span>
                      <Button onClick={() => refetch()} variant="outline" size="sm" className="w-fit">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : filteredCategories.length > 0 ? (
                  <div className="categories-tree" role="tree">
                    {filteredCategories.map(category => renderCategory(category))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {searchTerm ? 'No matching categories found.' : 'No categories available.'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side: Actions panel */}
            <div className="md:col-span-2 border rounded-md p-4">
              <Tabs defaultValue="create">
                <TabsList className="mb-4">
                  <TabsTrigger value="create">Create</TabsTrigger>
                  <TabsTrigger value="edit" disabled={!selectedCategory}>Edit</TabsTrigger>
                </TabsList>
                
                {/* Create Tab */}
                <TabsContent value="create">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Create New Category</h3>
                      {selectedCategory && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Creating a subcategory under: <span className="font-medium">{selectedCategory.name}</span>
                        </p>
                      )}
                    </div>
                    
                    <PermissionGuard permission="category.add">
                      <div className="space-y-2">
                        <Label htmlFor="new-category">Category Name</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="new-category"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Enter category name"
                            disabled={isCreating}
                          />
                          <Button 
                            onClick={handleCreateCategory} 
                            disabled={!newCategoryName || typeof newCategoryName !== 'string' || !newCategoryName.trim() || isCreating}
                            className="w-full mt-2"
                          >
                            {isCreating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <PlusIcon className="mr-2 h-4 w-4" />
                                Create
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedCategory 
                            ? `This will create a subcategory under "${selectedCategory.name}"`
                            : 'This will create a top-level category'}
                        </p>
                      </div>
                    </PermissionGuard>
                  </div>
                </TabsContent>
                
                {/* Edit Tab */}
                <TabsContent value="edit">
                  {selectedCategory && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Edit Category</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Currently editing: <span className="font-medium">{selectedCategory.name}</span>
                        </p>
                      </div>
                      
                      <PermissionGuard permission="category.change">
                        <div className="space-y-2">
                          <Label htmlFor="edit-category">Category Name</Label>
                          <div className="flex space-x-2">
                            <Input
                              id="edit-category"
                              value={editCategoryName}
                              onChange={(e) => setEditCategoryName(e.target.value)}
                              placeholder="Enter category name"
                              disabled={isUpdating}
                            />
                            <Button 
                              onClick={handleUpdateCategory} 
                              disabled={!editCategoryName || typeof editCategoryName !== 'string' || !editCategoryName.trim() || isUpdating || editCategoryName === selectedCategory.name}
                              className="w-full"
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Update
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </PermissionGuard>
                      
                      <div className="pt-4 border-t">
                        <PermissionGuard permission="category.delete">
                          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive">
                                <Trash className="mr-2 h-4 w-4" />
                                Delete Category
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the category "{selectedCategory.name}".
                                  {selectedCategory.children && selectedCategory.children.length > 0 && (
                                    <span className="block mt-2 font-semibold text-destructive">
                                      Warning: This category has subcategories that will also be deleted.
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteCategory}
                                  disabled={isDeleting}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isDeleting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </PermissionGuard>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 