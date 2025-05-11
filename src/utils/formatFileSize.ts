// Format file size for display (B, KB, MB, GB)
export function formatFileSize(sizeString: string | number | null | undefined): string {
  // If it's already formatted (e.g., "1.2MB"), return as is
  if (typeof sizeString === 'string' && sizeString.match(/^[\d.]+\s*[KMGT]?B$/i)) {
    return sizeString
  }

  // Handle null/undefined/empty cases
  if (sizeString === null || sizeString === undefined || sizeString === '') {
    return 'Unknown size'
  }

  // Convert string to number if it's a string
  let bytes: number

  if (typeof sizeString === 'string') {
    // Try to parse the string as a number
    bytes = parseInt(sizeString, 10)
  } else {
    bytes = sizeString as number
  }

  // Check if bytes is a valid number
  if (isNaN(bytes) || bytes === 0) {
    return 'Unknown size'
  }

  // Format bytes to appropriate units
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
} 