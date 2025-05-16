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
 * Helper function to normalize channel data
 * @param raw The raw channel data
 * @returns Normalized channel data
 */
const normalizeChannel = (raw: Channel | null | undefined): Channel => {
  if (!raw) {
    return { 
      id: 0,
      code: '',
      name: '',
      is_active: false,
      description: ''
    };
  }
  
  // Ensure the description is always set
  return {
    ...raw,
    code: raw.code || raw.name,
    description: raw.description || raw.name || raw.code || 'Unknown Channel'
  };
};

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
      const channelsUrl = paths.channels.root();
      console.log('DEBUG Channels - Using URL:', channelsUrl);
      
      const response = await axiosInstance.get(channelsUrl);
      console.log('DEBUG Channels - Raw response:', response);
      const data = response.data;
      
      // Log raw response for debugging
      console.log('DEBUG Channels - Response data:', data);
      
      // Normalize the data to ensure consistent format
      let channels: Channel[] = [];
      
      if (Array.isArray(data)) {
        console.log('DEBUG Channels - Data is array with length:', data.length);
        channels = data.map(channel => ({
          ...channel,
          // Ensure both code and label are available for compatibility
          code: channel.code || channel.name,
          label: channel.label || channel.name
        }));
      } else if (data && typeof data === 'object') {
        // In case the API returns an object with results property
        console.log('DEBUG Channels - Data is object with keys:', Object.keys(data));
        const results = data.results || data.items || [];
        console.log('DEBUG Channels - Results array length:', results.length);
        channels = Array.isArray(results) 
          ? results.map(channel => ({
            ...channel,
            // Ensure both code and label are available for compatibility
            code: channel.code || channel.name,
            label: channel.label || channel.name
          }))
          : [];
      } else {
        console.error('Unexpected channels data format:', data);
      }
      
      console.log('DEBUG Channels - Final normalized channels:', channels);
      return channels;
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast.error('Failed to load channels');
      return [];
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
  },

  /**
   * Get a specific channel by code
   * @param code The channel code
   * @returns Promise with the channel or null if not found
   */
  getChannel: async (code: string): Promise<Channel | null> => {
    try {
      const channels = await channelService.getChannels()
      const channel = channels.find(c => c.code === code)
      return channel ? normalizeChannel(channel) : null
    } catch (error) {
      console.error(`Error fetching channel with code ${code}:`, error)
      return null
    }
  }
}

export default channelService 