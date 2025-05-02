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

/**
 * Query key for report themes
 * 
 * @returns Query key array
 */
export const qkReportThemes = () => 
  ['reports', 'themes'] as const;

/**
 * Query key for data completeness analytics
 * 
 * @returns Query key array
 */
export const qkCompleteness = () =>
  ['analytics', 'completeness'] as const;

/**
 * Query key for marketplace readiness analytics
 * 
 * @returns Query key array
 */
export const qkReadiness = () =>
  ['analytics', 'readiness'] as const;

/**
 * Query key for enrichment velocity analytics
 * 
 * @param days Number of days to include in the report
 * @returns Query key array
 */
export const qkEnrichmentVelocity = (days: number = 30) =>
  ['analytics', 'enrichmentVelocity', days] as const;

/**
 * Query key for localization quality analytics
 * 
 * @returns Query key array
 */
export const qkLocalizationQuality = () =>
  ['analytics', 'localizationQuality'] as const;

/**
 * Query key for change history analytics
 * 
 * @param params Filter parameters for the change history
 * @returns Query key array
 */
export const qkChangeHistory = (params?: { from?: string; to?: string; user?: number }) =>
  ['analytics', 'changeHistory', params] as const; 