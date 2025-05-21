import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { API_ENDPOINTS } from '@/config/config';
import { Family, normalizeFamily } from '@/types/families';

/**
 * Fetches all product families from the API
 * @returns Promise with array of families
 */
export const getFamilies = async (): Promise<Family[]> => {
  try {
    // Log both path configurations for debugging
    console.log('Fetching families from path:', paths.families.root());
    console.log('Fetching families from endpoint:', API_ENDPOINTS.families.list);
    
    // Use the endpoint from config
    const response = await axiosInstance.get(API_ENDPOINTS.families.list);
    const data = response.data;
    
    // Log raw response for debugging
    console.log('Raw families data:', data);
    
    // Normalize the data to ensure consistent format
    let families: Family[] = [];
    
    if (Array.isArray(data)) {
      families = data.map(family => normalizeFamily(family));
    } else if (data && typeof data === 'object') {
      // In case the API returns an object with families in a results property
      const results = data.results || data.items || [];
      families = Array.isArray(results) 
        ? results.map(family => normalizeFamily(family))
        : [];
    } else {
      console.error('Unexpected families data format:', data);
    }
    
    console.log('Normalized families:', families);
    return families;
  } catch (error) {
    console.error('Error fetching families:', error);
    return []; // Return empty array on error instead of throwing
  }
};

/**
 * Get a specific family by ID
 * @param id The family ID
 * @returns Promise with the family or null if not found
 */
export const getFamily = async (id: number): Promise<Family | null> => {
  try {
    // Use the endpoint from config
    const response = await axiosInstance.get(API_ENDPOINTS.families.update(id));
    return normalizeFamily(response.data);
  } catch (error) {
    console.error(`Error fetching family with ID ${id}:`, error);
    return null;
  }
}; 