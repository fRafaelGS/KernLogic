import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { Attribute, AttributeValue, AttributeGroup } from '@/features/attributes';
import { toast } from "sonner";
import { 
  makeAttributeKey, 
  normalizeLocaleOrChannel,
  deduplicateAttributes,
  filterUnusedAttributes
} from '@/lib/attributeUtils';
import organizationService from './organizationService';
import localeService from './localeService';
import channelService from './channelService';

// Cached organization defaults to avoid repetitive API calls
let orgDefaults: { locale: string, channel: string } | null = null;
// Cache for locale and channel mapping (code to ID)
let localeCache: Record<string, number> = {};
let channelCache: Record<string, number> = {};

/**
 * Get organization defaults for locale and channel
 * This function caches the result to avoid unnecessary API calls
 */
const getOrgDefaults = async (): Promise<{ locale: string, channel: string }> => {
  if (orgDefaults) return orgDefaults;
  
  try {
    const org = await organizationService.getOrganization();
    orgDefaults = {
      locale: org.default_locale,
      channel: org.default_channel.code
    };
    return orgDefaults;
  } catch (error) {
    console.error('Error fetching organization defaults:', error);
    // Fallbacks if org API fails
    return { locale: '', channel: '' };
  }
};

/**
 * Get locale ID from code (with caching)
 */
const getLocaleId = async (localeCode: string | null): Promise<number | null> => {
  if (!localeCode) return null;
  
  // Check cache first
  if (localeCache[localeCode]) {
    return localeCache[localeCode];
  }
  
  try {
    const locales = await localeService.getLocales();
    
    // Update cache with all locales
    locales.forEach(locale => {
      localeCache[locale.code] = locale.id;
    });
    
    // Return the requested locale ID or null if not found
    return localeCache[localeCode] || null;
  } catch (error) {
    console.error('Error fetching locale ID:', error);
    return null;
  }
};

/**
 * Get channel ID from code (with caching)
 */
const getChannelId = async (channelCode: string | null): Promise<number | null> => {
  if (!channelCode) return null;
  
  // Check cache first
  if (channelCache[channelCode]) {
    return channelCache[channelCode];
  }
  
  try {
    const channels = await channelService.getChannels();
    
    // Update cache with all channels
    channels.forEach(channel => {
      channelCache[channel.code] = channel.id;
    });
    
    // Return the requested channel ID or null if not found
    return channelCache[channelCode] || null;
  } catch (error) {
    console.error('Error fetching channel ID:', error);
    return null;
  }
};

/**
 * AttributeService - A centralized service for managing attributes in the PIM system
 * 
 * This service provides methods for:
 * - Fetching attributes and attribute values
 * - Creating, updating, and deleting attribute values
 * - Managing attribute groups and assignments
 * - Validating and normalizing attribute data
 */
export class AttributeService {
  /**
   * Fetch all available attributes from the API
   * @returns A promise resolving to an array of Attribute objects
   */
  static async fetchAttributes(): Promise<Attribute[]> {
    try {
      const response = await axiosInstance.get(paths.attributes.root(), {
        headers: { 'Accept': 'application/json' }
      });
      return deduplicateAttributes(response.data) as Attribute[];
    } catch (error) {
      console.error('Error fetching attributes:', error);
      toast.error('Failed to load attributes');
      return [];
    }
  }

  /**
   * Fetch attribute values for a specific product
   * @param productId The ID of the product
   * @param locale Optional locale filter (uses org default if not provided)
   * @param channel Optional channel filter (uses org default if not provided)
   * @returns A promise resolving to an array of AttributeValue objects
   */
  static async fetchAttributeValues(
    productId: number, 
    locale?: string, 
    channel?: string
  ): Promise<AttributeValue[]> {
    try {
      // Get organization defaults if locale or channel not provided
      if (!locale || locale === 'default' || !channel || channel === 'default') {
        const defaults = await getOrgDefaults();
        locale = locale && locale !== 'default' ? locale : defaults.locale;
        channel = channel && channel !== 'default' ? channel : defaults.channel;
      }

      // Locale and channel are expected as string codes, not IDs
      const params: Record<string, string> = {};
      
      // Only add parameters if they have values
      if (locale) {
        params.locale = locale;
      }
      
      if (channel) {
        params.channel = channel;
      }

      console.log(`Fetching attribute values for product ${productId} with locale=${locale} and channel=${channel}`);
      
      const response = await axiosInstance.get(paths.products.attributes(productId), {
        headers: { 'Accept': 'application/json' },
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching attribute values:', error);
      toast.error('Failed to load attribute values');
      return [];
    }
  }

  /**
   * Fetch attribute groups for a specific product
   * @param productId The ID of the product
   * @param locale Optional locale code (uses org default if not provided)
   * @param channel Optional channel code (uses org default if not provided)
   * @returns A promise resolving to an array of AttributeGroup objects
   */
  static async fetchAttributeGroups(
    productId: number,
    locale?: string,
    channel?: string
  ): Promise<AttributeGroup[]> {
    try {
      // Use org defaults if locale or channel not provided or set to 'default'
      if (!locale || locale === 'default' || !channel || channel === 'default') {
        const defaults = await getOrgDefaults()
        locale = locale && locale !== 'default' ? locale : defaults.locale
        channel = channel && channel !== 'default' ? channel : defaults.channel
      }

      // Only add parameters if they have values
      const params: Record<string, string> = {}
      if (locale) params.locale = locale
      if (channel) params.channel = channel

      console.log(`Fetching attribute groups for product ${productId} with locale=${locale} and channel=${channel}`)

      const response = await axiosInstance.get(paths.products.groups(productId), {
        headers: { 'Accept': 'application/json' },
        params
      })
      return response.data
    } catch (error) {
      console.error('Error fetching attribute groups:', error)
      toast.error('Failed to load attribute groups')
      return []
    }
  }

  /**
   * Create a new attribute value for a product
   * @param attributeId The ID of the attribute
   * @param value The value to assign
   * @param productId The ID of the product
   * @param locale Optional locale code
   * @param channel Optional channel code
   * @returns A promise resolving to the created AttributeValue
   */
  static async createAttributeValue(
    attributeId: number,
    value: any,
    productId: number,
    locale?: string | null,
    channel?: string | null,
    attributes?: Attribute[]
  ): Promise<AttributeValue> {
    console.log(`Creating attribute value for ${attributeId} with:`, {
      value,
      type: typeof value,
      locale,
      channel,
      productId
    });

    // Format value based on data type if attributes are provided
    let formattedValue = value;
    if (attributes) {
      const attrDef = attributes.find(a => a.id === attributeId);
      if (attrDef?.data_type === 'number' && value !== '') {
        formattedValue = Number(value);
        if (isNaN(formattedValue)) {
          formattedValue = 0;
        }
      } else if (attrDef?.data_type === 'boolean') {
        formattedValue = Boolean(value);
      } else if (value === '') {
        // For empty string values, explicitly set a default based on type
        if (attrDef?.data_type === 'number') {
          formattedValue = 0;
        } else if (attrDef?.data_type === 'boolean') {
          formattedValue = false;
        }
      }
    }

    // Get locale and channel IDs for the create request
    // The backend expects IDs, not codes
    const normalizedLocale = normalizeLocaleOrChannel(locale);
    const normalizedChannel = normalizeLocaleOrChannel(channel);
    
    // For POST, we need to convert locale and channel codes to IDs
    const localeId = normalizedLocale ? await getLocaleId(normalizedLocale) : null;
    const channelId = normalizedChannel ? await getChannelId(normalizedChannel) : null;

    // Format payload with IDs instead of codes
    const data = {
      attribute: attributeId,
      product: productId,
      value: formattedValue,
      locale_id: localeId,  // Use locale_id with the ID instead of locale with code
      channel_id: channelId // Use channel_id with the ID instead of channel with code
    };

    console.log('Creating attribute value with data:', data);

    try {
      // Check if a value already exists for this combination
      const existingValues = await this.fetchAttributeValues(productId);
      const existingValue = existingValues.find((val: AttributeValue) => 
        val.attribute === attributeId && 
        val.locale === normalizedLocale && 
        val.channel === normalizedChannel
      );
      
      if (existingValue) {
        console.log('Found existing attribute value:', existingValue);
        // If it exists but has a different value, update it
        if (existingValue.value !== formattedValue) {
          return await this.updateAttributeValue(existingValue.id!, formattedValue, productId, locale, channel);
        }
        return existingValue;
      }

      // POST request to create attribute value
      const response = await axiosInstance.post(paths.products.attributes(productId), data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log("API response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API error:", error);
      
      // Log the error response for debugging
      if (error.response) {
        console.error("Error response:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      // Handle uniqueness error by fetching and returning the existing value
      if (error.response?.status === 400 && 
         (error.response.data.non_field_errors || 
          error.response.data.detail?.includes('unique'))) {
        
        console.log('Uniqueness error, trying to find the existing value');
        const attrValues = await this.fetchAttributeValues(productId);
        const existingValue = attrValues.find((val: AttributeValue) => 
          val.attribute === attributeId && 
          val.locale === normalizedLocale && 
          val.channel === normalizedChannel
        );
        
        if (existingValue) {
          console.log('Found existing attribute value after error:', existingValue);
          return existingValue;
        }
      }
      
      throw error;
    }
  }

  /**
   * Update an existing attribute value
   * @param valueId The ID of the attribute value to update
   * @param value The new value
   * @param productId The ID of the product
   * @param locale Optional locale code
   * @param channel Optional channel code
   * @returns A promise resolving to the updated AttributeValue
   */
  static async updateAttributeValue(
    valueId: number,
    value: any,
    productId: number,
    locale?: string | null,
    channel?: string | null,
    attributes?: Attribute[]
  ): Promise<AttributeValue> {
    console.log(`Updating attribute value ${valueId} with:`, value);

    try {
      // Format value based on attribute type if we have the attributes list
      let formattedValue = value;
      
      if (attributes) {
        // First, we need to get the current attribute value to find the attribute ID
        const attrValues = await this.fetchAttributeValues(productId);
        const attrValue = attrValues.find(val => val.id === valueId);
        
        if (attrValue) {
          const attrDef = attributes.find(a => a.id === attrValue.attribute);
          if (attrDef?.data_type === 'number') {
            formattedValue = Number(value);
            if (isNaN(formattedValue)) formattedValue = 0;
          } else if (attrDef?.data_type === 'boolean') {
            formattedValue = Boolean(value);
          }
        }
      }

      // Get locale and channel IDs for the update request
      // The backend expects IDs, not codes
      const normalizedLocale = normalizeLocaleOrChannel(locale);
      const normalizedChannel = normalizeLocaleOrChannel(channel);
      
      // For PATCH, we need to convert locale and channel codes to IDs
      const localeId = normalizedLocale ? await getLocaleId(normalizedLocale) : null;
      const channelId = normalizedChannel ? await getChannelId(normalizedChannel) : null;

      // Format payload with IDs instead of codes
      const data = {
        value: formattedValue,
        locale_id: localeId,
        channel_id: channelId
      };

      console.log('Updating attribute value with data:', data);

      const response = await axiosInstance.patch(
        paths.products.attributeValue(productId, valueId), 
        data, 
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error updating attribute value:', error);
      throw error;
    }
  }

  /**
   * Delete an attribute value from a product
   * @param valueId The ID of the attribute value to delete
   * @param productId The ID of the product
   * @returns A promise that resolves when the deletion is complete
   */
  static async deleteAttributeValue(valueId: number, productId: number): Promise<void> {
    try {
      await axiosInstance.delete(paths.products.attributeValue(productId, valueId));
    } catch (error) {
      console.error('Error deleting attribute value:', error);
      throw error;
    }
  }

  /**
   * Remove an attribute from a group
   * @param itemId The ID of the group item
   * @param groupId The ID of the attribute group
   * @returns A promise that resolves when the removal is complete
   */
  static async removeAttributeFromGroup(itemId: number, groupId: number): Promise<void> {
    try {
      await axiosInstance.delete(paths.attributeGroups.removeItem(groupId, itemId));
    } catch (error) {
      console.error('Error removing attribute from group:', error);
      throw error;
    }
  }

  /**
   * Format a value based on attribute type
   * @param value The value to format
   * @param attributeId The ID of the attribute
   * @param attributes Array of attribute definitions
   * @returns The formatted value
   */
  static formatValueByType(value: any, attributeId: number, attributes: Attribute[]): any {
    const attrDef = attributes.find(a => a.id === attributeId);
    
    if (!attrDef) return value;
    
    let formattedValue = value;
    
    if (attrDef.data_type === 'number' && value !== '') {
      formattedValue = Number(value);
      if (isNaN(formattedValue)) {
        formattedValue = 0;
      }
    } else if (attrDef.data_type === 'boolean') {
      formattedValue = Boolean(value);
    } else if (value === '') {
      // For empty string values, explicitly set a default based on type
      if (attrDef.data_type === 'number') {
        formattedValue = 0;
      } else if (attrDef.data_type === 'boolean') {
        formattedValue = false;
      }
    }
    
    return formattedValue;
  }

  /**
   * Get attributes that are not currently assigned to a product for the given locale and channel
   * @param allAttributes All available attributes
   * @param attributeValues Map of existing attribute values
   * @param selectedLocale Current locale
   * @param selectedChannel Current channel
   * @returns Array of unassigned attributes
   */
  static getUnassignedAttributes(
    allAttributes: Attribute[],
    attributeValues: Record<string, AttributeValue>,
    selectedLocale: string,
    selectedChannel: string
  ): Attribute[] {
    return filterUnusedAttributes(
      allAttributes,
      attributeValues,
      selectedLocale,
      selectedChannel
    );
  }

  /**
   * Get attributes that are not currently assigned to a specific group
   * @param allAttributes All available attributes
   * @param attributeGroups All attribute groups
   * @param currentGroupId The ID of the current group
   * @param attributeValues Map of existing attribute values
   * @param selectedLocale Current locale
   * @param selectedChannel Current channel
   * @returns Array of attributes available to add to the group
   */
  static getAvailableAttributesForGroup(
    allAttributes: Attribute[],
    attributeGroups: AttributeGroup[],
    currentGroupId: number,
    attributeValues: Record<string, AttributeValue>,
    selectedLocale: string,
    selectedChannel: string,
    editableAttributeIds: Record<number, boolean>
  ): Attribute[] {
    // Find the current group
    const currentGroup = attributeGroups.find(g => g.id === currentGroupId);
    if (!currentGroup) return [];
    
    // Get all attributes that are part of this group
    const groupItems = currentGroup.items || [];
    
    // Get the attributes that are part of this group
    const groupAttributeIds = groupItems.map(item => item.attribute);
    
    // Return attributes that ARE in the group but DON'T have values yet
    return allAttributes.filter(attr => 
      // Attribute must be in the group
      groupAttributeIds.includes(attr.id) && 
      // But must not have a value yet for this locale/channel
      !attributeValues[makeAttributeKey(attr.id, normalizeLocaleOrChannel(selectedLocale), normalizeLocaleOrChannel(selectedChannel))] &&
      // And must not already be in edit mode
      !editableAttributeIds[attr.id]
    );
  }

  /**
   * Testing utility method to get locale and channel IDs from codes
   * @param localeCode Locale code
   * @param channelCode Channel code
   * @returns Promise resolving to an object with localeId and channelId
   */
  static async getLocaleAndChannelIds(localeCode: string | null, channelCode: string | null): Promise<{
    localeId: number | null,
    channelId: number | null
  }> {
    const localeId = await getLocaleId(localeCode);
    const channelId = await getChannelId(channelCode);
    return { localeId, channelId };
  }
} 