/**
 * Date formatting utilities for the PIM platform
 * 
 * Currently uses European format (dd/mm/yyyy) but designed to be configurable
 * for future org-specific date format settings.
 */

export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'

interface DateFormatConfig {
  format: DateFormat
  locale?: string
}

// Default configuration - European format
const DEFAULT_CONFIG: DateFormatConfig = {
  format: 'dd/mm/yyyy',
  locale: 'en-GB'
}

/**
 * Get the current date format configuration
 * TODO: In the future, this will fetch from org settings
 */
function getDateFormatConfig(): DateFormatConfig {
  // TODO: Replace with org settings fetch
  // const orgSettings = useOrgSettings()
  // return orgSettings.dateFormat || DEFAULT_CONFIG
  return DEFAULT_CONFIG
}

/**
 * Format a date according to the current org settings
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  
  const config = getDateFormatConfig()
  
  switch (config.format) {
    case 'dd/mm/yyyy':
      return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      })
    case 'mm/dd/yyyy':
      return dateObj.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })
    case 'yyyy-mm-dd':
      return dateObj.toISOString().split('T')[0]
    default:
      return dateObj.toLocaleDateString()
  }
}

/**
 * Format a date for display in tables and UI components
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
  return formatDate(date)
}

/**
 * Format a date for input fields (HTML date inputs expect yyyy-mm-dd)
 */
export function formatInputDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  
  // HTML date inputs always expect yyyy-mm-dd format
  return dateObj.toISOString().split('T')[0]
}

/**
 * Parse a date string from input (handles various formats)
 */
export function parseInputDate(dateString: string): Date | null {
  if (!dateString) return null
  
  // Try parsing the date string
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Get the date format pattern for placeholder text
 */
export function getDateFormatPattern(): string {
  const config = getDateFormatConfig()
  return config.format.toLowerCase()
}

/**
 * Get today's date formatted according to org settings
 */
export function getTodayFormatted(): string {
  return formatDate(new Date())
} 