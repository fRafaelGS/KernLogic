import axios from 'axios'
import axiosInstance from '@/domains/core/lib/axiosInstance'
import { API_PATHS } from '@/config/config'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/config/config'

/**
 * Interface for Locale objects returned from the API
 */
export interface Locale {
  id: number
  code: string
  label: string
  description?: string
  name?: string
  is_active: boolean
}

/**
 * Helper function to normalize locale data
 * @param raw The raw locale data
 * @returns Normalized locale data
 */
const normalizeLocale = (raw: Locale | null | undefined): Locale => {
  if (!raw) {
    return { 
      id: 0,
      code: '',
      label: '',
      is_active: false 
    };
  }
  
  // Ensure all required fields are present
  return {
    ...raw,
    id: raw.id || 0,
    code: raw.code || '',
    label: raw.label || raw.description || raw.name || raw.code || 'Unknown Locale',
    is_active: typeof raw.is_active === 'boolean' ? raw.is_active : true
  };
};

/**
 * Service for managing organization locales
 */
const localeService = {
  /**
   * Get all locales for the current organization
   * @returns Promise resolving to an array of Locale objects
   */
  getLocales: async (): Promise<Locale[]> => {
    try {
      const localesUrl = API_PATHS.locales.root();
      console.log('DEBUG Locales - Using URL:', localesUrl);
      
      const response = await axiosInstance.get(localesUrl);
      console.log('DEBUG Locales - Raw response:', response);
      const data = response.data;
      
      // Log raw response for debugging
      console.log('DEBUG Locales - Response data:', data);
      
      // Normalize the data to ensure consistent format
      let locales: Locale[] = [];
      
      if (Array.isArray(data)) {
        console.log('DEBUG Locales - Data is array with length:', data.length);
        locales = data.map(locale => normalizeLocale(locale));
      } else if (data && typeof data === 'object') {
        // In case the API returns an object with results property
        console.log('DEBUG Locales - Data is object with keys:', Object.keys(data));
        const results = data.results || data.items || [];
        console.log('DEBUG Locales - Results array length:', results.length);
        locales = Array.isArray(results) 
          ? results.map(locale => normalizeLocale(locale))
          : [];
      } else {
        console.error('Unexpected locales data format:', data);
      }
      
      console.log('DEBUG Locales - Final normalized locales:', locales);
      return locales;
    } catch (error) {
      console.error('Error fetching locales:', error);
      return [];
    }
  },

  /**
   * Get a specific locale by code
   * @param code The locale code
   * @returns Promise with the locale or null if not found
   */
  getLocale: async (code: string): Promise<Locale | null> => {
    try {
      const locales = await localeService.getLocales()
      const locale = locales.find(l => l.code === code)
      return locale ? normalizeLocale(locale) : null
    } catch (error) {
      console.error(`Error fetching locale with code ${code}:`, error)
      return null
    }
  },

  /**
   * Create a new locale for the current organization
   * @param code The locale code (e.g., 'en_US', 'fr_FR')
   * @param label The human-readable label (e.g., 'English (US)', 'French')
   * @returns Promise resolving to the created Locale object
   */
  createLocale: async (code: string, label: string): Promise<Locale> => {
    try {
      const { data } = await axiosInstance.post(API_PATHS.locales.root(), {
        code,
        label,
        is_active: true
      })
      toast.success(`Locale "${label}" created successfully`)
      return data
    } catch (error) {
      console.error('Error creating locale:', error)
      toast.error('Failed to create locale')
      throw error
    }
  },

  /**
   * Update an existing locale
   * @param id The ID of the locale to update
   * @param changes Object containing the fields to update (code, label, or is_active)
   * @returns Promise resolving to the updated Locale object
   */
  updateLocale: async (
    id: number, 
    changes: Partial<{code: string, label: string, is_active: boolean}>
  ): Promise<Locale> => {
    try {
      const { data } = await axiosInstance.patch(API_PATHS.locales.byId(id), changes)
      toast.success('Locale updated successfully')
      return data
    } catch (error) {
      console.error('Error updating locale:', error)
      toast.error('Failed to update locale')
      throw error
    }
  },

  /**
   * Delete a locale
   * @param id The ID of the locale to delete
   * @returns Promise that resolves when the locale is deleted
   */
  deleteLocale: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(API_PATHS.locales.byId(id))
      toast.success('Locale deleted successfully')
    } catch (error) {
      console.error('Error deleting locale:', error)
      toast.error('Failed to delete locale')
      throw error
    }
  }
}

export default localeService 