import axiosInstance from '@/lib/axiosInstance';
import { API_URL, API_ENDPOINTS } from '@/config/config';
import { Category as CategoryType, TreeNode } from '@/types/categories';

// Use the new categories endpoints instead of the legacy one
const CATEGORIES_URL = API_ENDPOINTS.categories.list;
const CATEGORIES_TREE_URL = API_ENDPOINTS.categories.tree;

// Log the constructed URL for debugging
console.log('Categories URL:', CATEGORIES_URL);
console.log('Categories Tree URL:', CATEGORIES_TREE_URL);

// Type definitions
export interface Category {
  id: number;
  name: string;
  parent?: number | null;
  parent_name?: string;
  children?: Category[];
}

/**
 * Transforms a category object to the format required by react-dropdown-tree-select
 * @param category The category object from backend
 * @returns A TreeNode formatted for the dropdown component
 */
export const transformCategoryToTreeNode = (
  category: Category
): TreeNode => {
  return {
    label: category.name,
    value: category.id.toString(),
    children: Array.isArray(category.children)
      ? category.children.map(child => transformCategoryToTreeNode(child))
      : undefined,
    expanded: false, // Default collapsed
  };
};

/**
 * Finds a node in the tree by its ID
 * @param nodes Array of tree nodes to search
 * @param id ID to find
 * @returns The found node or null
 */
export const findNodeById = (
  nodes: TreeNode[], 
  id: string | number
): TreeNode | null => {
  for (const node of nodes) {
    if (node.value === id.toString()) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Gets a breadcrumb path for a node in the tree
 * @param nodes Tree nodes to search
 * @param id ID of the node to find
 * @returns Formatted breadcrumb path (e.g. "Parent > Child > Grandchild")
 */
export const getBreadcrumbPath = (
  nodes: TreeNode[],
  id: string | number
): string => {
  const findPath = (
    currentNodes: TreeNode[],
    targetId: string | number,
    path: string[] = []
  ): string[] | null => {
    for (const node of currentNodes) {
      if (node.value === targetId.toString()) {
        return [...path, node.label];
      }
      if (node.children) {
        const newPath = findPath(node.children, targetId, [...path, node.label]);
        if (newPath) return newPath;
      }
    }
    return null;
  };
  
  const path = findPath(nodes, id);
  return path ? path.join(' > ') : 'Uncategorized';
};

/**
 * Normalizes category data from different formats
 * @param category Category data that may be a string or object
 * @returns Normalized Category object 
 */
export function normalizeCategoryData(category: string | Category | Record<string, any>): Category {
  if (typeof category === 'string') {
    // If it's a legacy string, convert to object
    return {
      id: 0, // Use 0 as a sentinel for legacy string categories
      name: category,
      parent: null
    };
  } else if (category && typeof category === 'object') {
    // Ensure consistent return shape
    return {
      id: typeof category.id === 'string' ? parseInt(category.id, 10) : Number(category.id || 0),
      name: category.name || '',
      parent: category.parent !== undefined ? 
        (typeof category.parent === 'string' ? parseInt(category.parent, 10) : Number(category.parent)) 
        : null,
      parent_name: category.parent_name || '',
      children: Array.isArray(category.children) ? category.children : []
    };
  }
  
  // Fallback for unexpected data
  return { id: 0, name: '', parent: null };
}

/**
 * Fetches all categories from the API
 * @returns Promise with array of unique categories
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data } = await axiosInstance.get(CATEGORIES_URL);
    
    // Normalize the data to ensure consistent format
    let categories: Category[] = [];
    
    if (Array.isArray(data)) {
      categories = data.map(category => normalizeCategoryData(category));
    } else {
      console.error('Unexpected categories data format:', data);
    }
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return []; // Return empty array on error instead of throwing
  }
};

/**
 * Creates a new category
 * @param name The category name to create
 * @param parentId Optional parent category ID
 */
export const createCategory = async (name: string, parentId?: number): Promise<Category> => {
  try {
    // Now we can use the POST method directly on the categories endpoint
    const payload: any = { name };
    if (parentId) {
      payload.parent = parentId;
    }
    
    console.log('Creating category payload:', payload);
    
    const response = await axiosInstance.post(CATEGORIES_URL, payload);
    
    // Return the normalized category from the response
    return normalizeCategoryData(response.data);
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * Fetches the hierarchical category tree from the API
 * @returns Promise with category tree structure formatted for the tree select component
 */
export const getCategoryTree = async (): Promise<TreeNode[]> => {
  try {
    const { data } = await axiosInstance.get(CATEGORIES_TREE_URL);
    
    // Transform data to the format needed by react-dropdown-tree-select
    if (Array.isArray(data)) {
      // Ensure we properly normalize each category before transforming
      return data.map(category => {
        const normalizedCategory = normalizeCategoryData(category);
        return transformCategoryToTreeNode(normalizedCategory);
      });
    } else {
      console.error('Unexpected category tree data format:', data);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching category tree:', error);
    return [];
  }
};

/**
 * Updates a product's category
 * @param productId The product ID to update
 * @param categoryId The category ID to assign to the product
 */
export const updateProductCategory = async (productId: number, categoryId: number | null): Promise<boolean> => {
  try {
    const url = `/api/products/${productId}/`;
    // Use category_id as that's the write-only field in the ProductSerializer
    // Make sure categoryId is properly formatted - use null if undefined or 0
    const payload = {
      category_id: categoryId === 0 ? null : categoryId
    };
    
    console.log('Updating product category with payload:', payload);
    
    const response = await axiosInstance.patch(url, payload);
    if (response.status >= 200 && response.status < 300) {
      console.log('Category update successful', response.data);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating product category:', error);
    throw error;
  }
};

/**
 * Moves a category to a new parent
 * @param categoryId The category ID to move
 * @param parentId The new parent ID (null for root)
 */
export const moveCategory = async (categoryId: number, parentId: number | null): Promise<boolean> => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.categories.move, {
      category_id: categoryId,
      parent_id: parentId
    });
    return true;
  } catch (error) {
    console.error('Error moving category:', error);
    throw error;
  }
};

/**
 * Builds a breadcrumb trail for a category
 * @param category The category object
 * @param categories Optional full list of categories to find parents
 * @returns Array of category objects representing the breadcrumb trail
 */
export const buildCategoryBreadcrumb = (
  category: Category | null | undefined, 
  categories: Category[] = []
): Category[] => {
  if (!category) return [];
  
  const breadcrumb: Category[] = [category];
  
  // If we have a parent ID but no parent in the category object,
  // we need to look it up in the categories list
  if (category.parent && !category.children) {
    // Find the parent category in the list
    const parent = categories.find(c => c.id === category.parent);
    if (parent) {
      // Recursively build the breadcrumb for the parent
      return [...buildCategoryBreadcrumb(parent, categories), category];
    }
  }
  
  return breadcrumb;
};

/**
 * Updates a category
 * @param id The category ID to update
 * @param data The updated category data
 * @returns Promise with updated category
 */
export const updateCategory = async (id: number, data: { name: string; parent?: number | null }): Promise<Category> => {
  try {
    const url = `${CATEGORIES_URL}${id}/`;
    const response = await axiosInstance.patch(url, data);
    return normalizeCategoryData(response.data);
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Deletes a category
 * @param id The category ID to delete
 * @returns Promise resolving to true if successful
 */
export const deleteCategory = async (id: number): Promise<boolean> => {
  try {
    const url = `${CATEGORIES_URL}${id}/`;
    await axiosInstance.delete(url);
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}; 