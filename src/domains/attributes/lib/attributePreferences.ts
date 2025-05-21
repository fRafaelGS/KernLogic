/**
 * Utility functions for managing attribute-related user preferences
 */

const STORAGE_PREFIX = 'kernlogic_attr_';

/**
 * Keys for attribute preferences in localStorage
 */
export const STORAGE_KEYS = {
  LAST_LOCALE: `${STORAGE_PREFIX}last_locale`,
  LAST_CHANNEL: `${STORAGE_PREFIX}last_channel`,
  EXPANDED_GROUPS: `${STORAGE_PREFIX}expanded_groups`,
  HIDDEN_ATTRIBUTES: `${STORAGE_PREFIX}hidden_attributes`,
};

/**
 * Save the user's last selected locale
 * @param locale The locale code to save
 */
export const saveLastLocale = (locale: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_LOCALE, locale);
  } catch (error) {
    console.warn('Failed to save locale preference to localStorage:', error);
  }
};

/**
 * Get the user's last selected locale or return default
 * @param defaultLocale The default locale to use if none is stored
 * @returns The stored locale or provided default
 */
export const getLastLocale = (defaultLocale: string = ''): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_LOCALE);
    return stored || defaultLocale;
  } catch (error) {
    console.warn('Failed to retrieve locale preference from localStorage:', error);
    return defaultLocale;
  }
};

/**
 * Save the user's last selected channel
 * @param channel The channel code to save
 */
export const saveLastChannel = (channel: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CHANNEL, channel);
  } catch (error) {
    console.warn('Failed to save channel preference to localStorage:', error);
  }
};

/**
 * Get the user's last selected channel or return default
 * @param defaultChannel The default channel to use if none is stored
 * @returns The stored channel or provided default
 */
export const getLastChannel = (defaultChannel: string = ''): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_CHANNEL);
    return stored || defaultChannel;
  } catch (error) {
    console.warn('Failed to retrieve channel preference from localStorage:', error);
    return defaultChannel;
  }
};

/**
 * Save the set of expanded attribute groups
 * @param groupIds Array of expanded group IDs
 */
export const saveExpandedGroups = (groupIds: number[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPANDED_GROUPS, JSON.stringify(groupIds));
  } catch (error) {
    console.warn('Failed to save expanded groups to localStorage:', error);
  }
};

/**
 * Get the set of expanded attribute groups
 * @returns Array of expanded group IDs
 */
export const getExpandedGroups = (): number[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EXPANDED_GROUPS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to retrieve expanded groups from localStorage:', error);
    return [];
  }
};

/**
 * Save hidden attribute IDs
 * @param attributeIds Array of attribute IDs to hide
 */
export const saveHiddenAttributes = (attributeIds: number[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.HIDDEN_ATTRIBUTES, JSON.stringify(attributeIds));
  } catch (error) {
    console.warn('Failed to save hidden attributes to localStorage:', error);
  }
};

/**
 * Get hidden attribute IDs
 * @returns Array of hidden attribute IDs
 */
export const getHiddenAttributes = (): number[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HIDDEN_ATTRIBUTES);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to retrieve hidden attributes from localStorage:', error);
    return [];
  }
};

/**
 * Clear all attribute-related preferences
 */
export const clearAllAttributePreferences = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear attribute preferences from localStorage:', error);
  }
}; 