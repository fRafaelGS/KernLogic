import axiosInstance from '@/lib/axiosInstance'
import { paths } from '@/lib/apiPaths'
import { toast } from 'sonner'

/**
 * Interface for Channel objects returned from the API
 */
export interface Channel {
  id: number
  code: string
  name: string
  label?: string  // Legacy field for compatibility
  is_active: boolean
  description?: string | null
}

/**
 * Service for managing sales channels
 */
const channelService = {
  /**
   * Get all channels for the current organization
   * @returns Promise resolving to an array of Channel objects
   */
  getChannels: async (): Promise<Channel[]> => {
    try {
      const { data } = await axiosInstance.get(paths.channels.root())
      // Map any variations in API response to consistent interface
      const mappedData = Array.isArray(data) ? data.map(channel => ({
        ...channel,
        // Ensure both code and label are available for compatibility
        code: channel.code || channel.name,
        label: channel.label || channel.name
      })) : []
      return mappedData
    } catch (error) {
      console.error('Error fetching channels:', error)
      toast.error('Failed to load channels')
      return []
    }
  },

  /**
   * Create a new channel for the current organization
   * @param code The channel code (e.g., 'ecommerce', 'retail')
   * @param name The human-readable name (e.g., 'E-commerce', 'Retail')
   * @returns Promise resolving to the created Channel object
   */
  createChannel: async (code: string, name: string): Promise<Channel> => {
    try {
      const { data } = await axiosInstance.post(paths.channels.root(), {
        code,
        name,
        is_active: true
      })
      toast.success(`Channel "${name}" created successfully`)
      return data
    } catch (error) {
      console.error('Error creating channel:', error)
      toast.error('Failed to create channel')
      throw error
    }
  },

  /**
   * Update an existing channel
   * @param id The ID of the channel to update
   * @param changes Object containing the fields to update (code, name, or is_active)
   * @returns Promise resolving to the updated Channel object
   */
  updateChannel: async (
    id: number, 
    changes: Partial<{code: string, name: string, is_active: boolean}>
  ): Promise<Channel> => {
    try {
      const { data } = await axiosInstance.patch(paths.channels.byId(id), changes)
      toast.success('Channel updated successfully')
      return data
    } catch (error) {
      console.error('Error updating channel:', error)
      toast.error('Failed to update channel')
      throw error
    }
  },

  /**
   * Delete a channel
   * @param id The ID of the channel to delete
   * @returns Promise that resolves when the channel is deleted
   */
  deleteChannel: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(paths.channels.byId(id))
      toast.success('Channel deleted successfully')
    } catch (error) {
      console.error('Error deleting channel:', error)
      toast.error('Failed to delete channel')
      throw error
    }
  }
}

export default channelService 