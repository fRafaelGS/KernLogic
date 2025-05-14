/**
 * Format a date string into a localized format
 * 
 * @param dateString - ISO date string to format
 * @param options - Intl.DateTimeFormatOptions object
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', options).format(date)
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * 
 * @param dateString - ISO date string to format
 * @returns Relative time string
 */
export function getRelativeTimeString(dateString: string): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    
    const diffInSeconds = Math.floor(diffInMs / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second')
    } else if (diffInMinutes < 60) {
      return rtf.format(-diffInMinutes, 'minute')
    } else if (diffInHours < 24) {
      return rtf.format(-diffInHours, 'hour')
    } else if (diffInDays < 30) {
      return rtf.format(-diffInDays, 'day')
    } else {
      return formatDate(dateString, { year: 'numeric', month: 'short', day: 'numeric' })
    }
  } catch (error) {
    console.error('Error getting relative time:', error)
    return dateString
  }
} 