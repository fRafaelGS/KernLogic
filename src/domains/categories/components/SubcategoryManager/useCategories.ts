import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as categoryService from '@/domains/categories/services/categoryService';
import { Category, TreeNode } from '@/domains/products/types/categories';
import { toast } from 'sonner';

// Constants for query keys
const CATEGORIES_QUERY_KEY = 'categories';
const CATEGORY_TREE_QUERY_KEY = 'categoryTree';

/**
 * Convert TreeNode[] to Category[] for internal use
 */
function treeNodesToCategories(nodes: TreeNode[]): Category[] {
  return nodes.map(node => ({
    id: parseInt(node.value, 10),
    name: node.label,
    children: node.children ? treeNodesToCategories(node.children) : undefined,
  }));
}

/**
 * Custom hook for managing categories with React Query
 */
export function useCategories() {
  const queryClient = useQueryClient();

  // Fetch category tree
  const {
    data: treeNodes = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [CATEGORY_TREE_QUERY_KEY],
    queryFn: categoryService.getCategoryTree,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Convert TreeNode[] to Category[]
  const categories = treeNodesToCategories(treeNodes);

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: number | null }) => 
      categoryService.createCategory(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_TREE_QUERY_KEY] });
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating category:', error);
      toast.error(error.response?.data?.detail || 'Failed to create category');
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; parent?: number | null } }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_TREE_QUERY_KEY] });
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.detail || 'Failed to update category');
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_TREE_QUERY_KEY] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting category:', error);
      toast.error(
        error.response?.data?.detail || 
        'Failed to delete category. Make sure it has no products or subcategories.'
      );
    },
  });

  // Move category mutation
  const moveCategoryMutation = useMutation({
    mutationFn: ({ categoryId, parentId }: { categoryId: number; parentId: number | null }) =>
      categoryService.moveCategory(categoryId, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_TREE_QUERY_KEY] });
      toast.success('Category moved successfully');
    },
    onError: (error: any) => {
      console.error('Error moving category:', error);
      toast.error(error.response?.data?.detail || 'Failed to move category');
    },
  });

  // Function to create a category
  const createCategory = (name: string, parentId?: number | null) => {
    return createCategoryMutation.mutate({ name, parentId });
  };

  // Function to update a category
  const updateCategory = (id: number, data: { name: string; parent?: number | null }) => {
    return updateCategoryMutation.mutate({ id, data });
  };

  // Function to delete a category
  const deleteCategory = (id: number) => {
    return deleteCategoryMutation.mutate(id);
  };

  // Function to move a category
  const moveCategory = (categoryId: number, parentId: number | null) => {
    return moveCategoryMutation.mutate({ categoryId, parentId });
  };

  // Find a category by ID in the tree
  const findCategoryById = (id: number | null | undefined): Category | null => {
    if (!id) return null;
    
    const findInTree = (cats: Category[]): Category | null => {
      for (const cat of cats) {
        if (cat.id === id) {
          return cat;
        }
        if (cat.children?.length) {
          const found = findInTree(cat.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findInTree(categories);
  };

  return {
    categories,
    isLoading,
    isError,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    findCategoryById,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
    isMoving: moveCategoryMutation.isPending,
  };
} 