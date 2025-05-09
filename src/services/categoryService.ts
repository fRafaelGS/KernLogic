import axiosInstance from '../lib/axiosInstance';
import { API_URL, API_ENDPOINTS } from '../config';
import { Category as CategoryType } from '@/types/categories';

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
 * @returns Promise with category tree structure
 */
export const getCategoryTree = async (): Promise<Category[]> => {
  try {
    const { data } = await axiosInstance.get(CATEGORIES_TREE_URL);
    
    // Normalize the data to ensure consistent format
    let categories: Category[] = [];
    
    if (Array.isArray(data)) {
      // If we have a tree structure, we need to recursively normalize
      const normalizeTree = (nodes: any[]): Category[] => {
        return nodes.map(node => ({
          ...normalizeCategoryData(node),
          children: node.children ? normalizeTree(node.children) : []
        }));
      };
      
      categories = normalizeTree(data);
    } else {
      console.error('Unexpected category tree data format:', data);
    }
    
    return categories;
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
    const response = await axiosInstance.patch(url, { 
      category_id: categoryId 
    });
    return true;
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