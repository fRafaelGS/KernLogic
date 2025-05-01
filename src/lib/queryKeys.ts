/**
 * Centralized query keys for React Query
 * Using 'as const' to make the arrays readonly and improve type inference
 */

/**
 * Query key for attribute values
 * 
 * @param productId Product ID
 * @param locale Selected locale
 * @param channel Selected channel
 * @returns Query key array
 */
export const qkAttributeValues = (pid: number, loc: string, ch: string) =>
  ['attrValues', pid, loc, ch] as const;

/**
 * Query key for attribute groups
 * 
 * @param productId Product ID
 * @param locale Selected locale
 * @param channel Selected channel 
 * @returns Query key array
 */
export const qkAttributeGroups = (pid: number, loc: string, ch: string) =>
  ['attrGroups', pid, loc, ch] as const;

/**
 * Query key for attributes list
 * 
 * @returns Query key array
 */
export const qkAttributes = () =>
  ['attributes'] as const; 