import axiosInstance from '@/domains/core/lib/axiosInstance'
import { toast } from 'sonner'
import { API_PATHS } from '@/config/config'

/**
 * Interface for Organization objects returned from the API
 */
export interface Organization {
  id: number
  name: string
  default_locale: string
  default_channel: {
    id: number
    code: string
    name: string
  }
}

/**
 * Get current organization ID from localStorage
 */
const getCurrentOrgId = (): number => {
  const orgId = localStorage.getItem('currentOrgId')
  if (!orgId) {
    console.warn('No organization ID in localStorage, using default')
    return 1 // Default fallback
  }
  return Number(orgId)
}

/**
 * Service for managing organization data
 */
const organizationService = {
  /**
   * Get current organization
   * @returns Promise resolving to Organization object
   */
  getOrganization: async (): Promise<Organization> => {
    try {
      const orgId = getCurrentOrgId()
      const { data } = await axiosInstance.get(API_PATHS.organizations.byId(orgId))
      return data
    } catch (error) {
      console.error('Error fetching organization data:', error)
      toast.error('Failed to load organization settings')
      throw error
    }
  },

  /**
   * Update organization settings
   * @param changes Object with the fields to update
   * @returns Promise resolving to updated Organization object
   */
  updateOrganization: async (
    changes: Partial<Pick<Organization, 'name' | 'default_locale'> & { default_channel_id?: number }>
  ): Promise<Organization> => {
    try {
      const orgId = getCurrentOrgId()
      const { data } = await axiosInstance.patch(API_PATHS.organizations.byId(orgId), changes)
      toast.success('Organization settings updated successfully')
      return data
    } catch (error) {
      console.error('Error updating organization:', error)
      toast.error('Failed to update organization settings')
      throw error
    }
  }
}

export default organizationService 