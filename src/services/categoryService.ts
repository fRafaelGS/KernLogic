import axios from 'axios';
import { API_URL } from '@/config';

const CATEGORIES_URL = `${API_URL}/products/categories/`;

// Type definitions
export interface Category {
  id?: number;
  name: string;
}

// Get all categories
export const getCategories = async (): Promise<string[]> => {
  const response = await axios.get(CATEGORIES_URL);
  return response.data;
};

// Create a new category
export const createCategory = async (name: string): Promise<Category> => {
  const response = await axios.post(CATEGORIES_URL, { name });
  return response.data;
}; 