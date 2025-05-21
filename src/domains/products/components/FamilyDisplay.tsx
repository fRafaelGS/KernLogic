import React from 'react'
import { Badge } from '@/domains/core/components/ui/badge'
import { normalizeFamily, NormalizedFamily } from '@/utils/familyNormalizer'
import { Link } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/domains/core/components/ui/tooltip'
import { useFamilies } from '@/domains/products/services/familyApi'

interface FamilyDisplayProps {
  family: any // Accept any family data format
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
  linkToFamily?: boolean
  showEmpty?: boolean
  emptyText?: string
  showCode?: boolean
  className?: string
  hideTooltip?: boolean // Add option to hide tooltip for tables
}

/**
 * A consistent component for displaying family information
 * 
 * This component normalizes family data and displays it with proper formatting
 * across the entire application to ensure consistency.
 */
export function FamilyDisplay({
  family,
  badgeVariant = 'secondary',
  linkToFamily = false,
  showEmpty = true,
  emptyText = 'No family',
  showCode = true,
  className = '',
  hideTooltip = false
}: FamilyDisplayProps) {
  // Get the full list of families to supplement family data if needed
  const { data: families } = useFamilies()
  
  // Normalize the family data to ensure consistent format
  let normalizedFamily = normalizeFamily(family)
  
  // If we only have an ID and families are loaded, try to get the complete data
  if (normalizedFamily && families && families.length > 0 && !normalizedFamily.label.includes('Family ')) {
    const fullFamily = families.find(f => f.id === normalizedFamily?.id)
    if (fullFamily) {
      normalizedFamily = normalizeFamily(fullFamily)
    }
  }
  
  // If no family and not showing empty state, return null
  if (!normalizedFamily && !showEmpty) {
    return null
  }
  
  // If no family but showing empty state
  if (!normalizedFamily) {
    return <Badge variant="outline" className={`text-gray-500 ${className}`}>{emptyText}</Badge>
  }
  
  // Remove trailing 'Family' from label for display
  const displayLabel =
    (typeof normalizedFamily.label === 'string' ? normalizedFamily.label.replace(/\s*Family\s*$/i, '') : '') ||
    normalizedFamily.code ||
    normalizedFamily.id

  // Badge content without tooltip
  const badgeContent = (
    <Badge 
      variant={badgeVariant} 
      className={`font-medium py-1.5 w-full overflow-hidden whitespace-nowrap text-ellipsis flex items-center justify-center ${className}`}
    >
      <span className="truncate text-center w-full">{displayLabel}</span>
      {showCode && normalizedFamily.code && String(displayLabel).indexOf(normalizedFamily.code) === -1 && (
        <span className="ml-1 text-xs opacity-70">({normalizedFamily.code})</span>
      )}
    </Badge>
  )
  
  // Wrap in tooltip if enabled
  const content = hideTooltip ? badgeContent : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-medium">{normalizedFamily.label}</div>
            {normalizedFamily.code && <div className="text-xs">Code: {normalizedFamily.code}</div>}
            {normalizedFamily.description && (
              <div className="text-xs max-w-xs mt-1">{normalizedFamily.description}</div>
            )}
            <div className="text-xs text-muted-foreground">ID: {normalizedFamily.id}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
  
  // Wrap in link if requested
  if (linkToFamily && normalizedFamily.id) {
    return (
      <Link to={`/app/families/${normalizedFamily.id}`} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    )
  }
  
  return content
} 