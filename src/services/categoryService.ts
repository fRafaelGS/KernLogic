import axiosInstance from '../lib/axiosInstance';
import { API_URL, API_ENDPOINTS } from '../config';

// Fix the duplicate API prefix issue
const CATEGORIES_URL = API_ENDPOINTS.products.categories;

// Log the constructed URL for debugging
console.log('Categories URL:', CATEGORIES_URL);

// Type definitions
export interface Category {
  id?: number;
  name: string;
}

/**
 * Fetches all categories from the API
 * @returns Promise with array of unique categories
 */
export const getCategories = async (): Promise<string[]> => {
  try {
    const response = await axiosInstance.get(CATEGORIES_URL);
    console.log('Categories response:', response.data);
    
    // Ensure we're returning an array
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && typeof response.data === 'object') {
      // If we received an object instead of an array, try to extract array data
      console.warn('Categories response is an object, not an array:', response.data);
      // Check if there's any array property we can use
      for (const key in response.data) {
        if (Array.isArray(response.data[key])) {
          return response.data[key];
        }
      }
      return []; // Return empty array as fallback
    } else {
      console.error('Categories response is not an array:', response.data);
      return []; // Return empty array as fallback
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    return []; // Return empty array on error instead of throwing
  }
};

/**
 * Creates a new category
 * @param name The category name to create
 */
export const createCategory = async (name: string): Promise<{ id: string, name: string }> => {
  try {
    // Now we can use the POST method directly on the categories endpoint
    const response = await axiosInstance.post(CATEGORIES_URL, { 
      category: name
    });
    
    // Return a normalized response
    return { 
      id: response.data.id.toString(), 
      name: response.data.category 
    };
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}; 