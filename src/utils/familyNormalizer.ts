/**
 * Normalizes family data to a consistent format across the application
 * 
 * This solves issues where family data might be just an ID, a partial object,
 * or a complete object, ensuring components always receive the expected structure.
 */

export interface NormalizedFamily {
  id: number
  code: string
  label: string
  description?: string
}

/**
 * Normalizes any family data format into a consistent structure
 * 
 * @param family - The family data which could be an ID, partial object, or null/undefined
 * @param fallbackLabel - Optional label to use if not present in the data
 * @returns A normalized family object or undefined if no valid family data
 */
export function normalizeFamily(
  family: number | string | null | undefined | any,
  fallbackLabel?: string
): NormalizedFamily | undefined {
  // Return undefined for null or undefined input
  if (family == null) {
    return undefined
  }

  // Handle case where family is just an ID (number or string)
  if (typeof family === 'number' || (typeof family === 'string' && !isNaN(Number(family)))) {
    const id = typeof family === 'number' ? family : Number(family)
    return {
      id,
      code: fallbackLabel ? fallbackLabel.toLowerCase().replace(/\s+/g, '-') : `family-${id}`,
      label: fallbackLabel || `Family ${id}`,
    }
  }

  // Handle case where family is an object
  if (typeof family === 'object') {
    // Extract id, ensuring it's a number
    const id = typeof family.id === 'string' ? parseInt(family.id, 10) : (family.id || 0)
    
    return {
      id,
      code: family.code || (fallbackLabel ? fallbackLabel.toLowerCase().replace(/\s+/g, '-') : `family-${id}`),
      label: family.label || family.name || fallbackLabel || `Family ${id}`,
      description: family.description
    }
  }

  // Fallback for unexpected input - just return undefined
  return undefined
} 