import axiosInstance from '@/lib/axiosInstance'
import { paths } from '@/lib/apiPaths'
import { toast } from 'sonner'

/**
 * Interface for Locale objects returned from the API
 */
export interface Locale {
  id: number
  code: string
  label: string
  is_active: boolean
}

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
      const { data } = await axiosInstance.get(paths.locales.root())
      return data
    } catch (error) {
      console.error('Error fetching locales:', error)
      toast.error('Failed to load locales')
      return []
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
      const { data } = await axiosInstance.post(paths.locales.root(), {
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
      const { data } = await axiosInstance.patch(paths.locales.byId(id), changes)
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
      await axiosInstance.delete(paths.locales.byId(id))
      toast.success('Locale deleted successfully')
    } catch (error) {
      console.error('Error deleting locale:', error)
      toast.error('Failed to delete locale')
      throw error
    }
  }
}

export default localeService 