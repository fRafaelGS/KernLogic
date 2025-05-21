/**
 * Utility functions for attribute management
 */

/**
 * Creates a consistent key for attribute values based on attribute ID, locale, and channel
 * @param attributeId Attribute ID
 * @param locale Locale code or null
 * @param channel Channel code or null
 * @returns A unique string key in the format "id::locale::channel"
 */
export const makeAttributeKey = (
  attributeId: number, 
  locale?: string | null, 
  channel?: string | null
): string => {
  return `${attributeId}::${locale || ''}::${channel || ''}`;
};

/**
 * Extracts components from an attribute key
 * @param key Attribute key in the format "id::locale::channel"
 * @returns An object with id, locale, and channel
 */
export const parseAttributeKey = (key: string): { 
  attributeId: number; 
  locale: string | null; 
  channel: string | null; 
} => {
  const [attributeId, locale, channel] = key.split('::');
  return {
    attributeId: Number(attributeId),
    locale: locale || null,
    channel: channel || null
  };
};

/**
 * Deduplicate attributes by ID
 * @param attributes Array of attributes
 * @returns Array with duplicates removed
 */
export const deduplicateAttributes = <T extends { id: number }>(attributes: T[]): T[] => {
  const seen = new Set<number>();
  return attributes.filter(attr => {
    if (seen.has(attr.id)) return false;
    seen.add(attr.id);
    return true;
  });
};

/**
 * Convert 'default' value to null for API calls
 * @param value Locale or channel value that might be 'default'
 * @returns null if value is 'default', otherwise the original value
 */
export const normalizeLocaleOrChannel = (value: string | null | undefined): string | null => {
  if (!value || value === 'default') return null;
  return value;
};

/**
 * Filters attributes that already have values for the given locale and channel
 * @param attributes All available attributes
 * @param attributeValues Map of existing attribute values
 * @param selectedLocale Current locale
 * @param selectedChannel Current channel
 * @returns Array of attributes that don't have values for the current locale/channel
 */
export const filterUnusedAttributes = <T extends { id: number }>(
  attributes: T[],
  attributeValues: Record<string, any>,
  selectedLocale: string,
  selectedChannel: string
): T[] => {
  const usedKeys = new Set(Object.keys(attributeValues));
  
  return attributes.filter(attr => {
    const key = makeAttributeKey(
      attr.id,
      normalizeLocaleOrChannel(selectedLocale),
      normalizeLocaleOrChannel(selectedChannel)
    );
    return !usedKeys.has(key);
  });
}; 