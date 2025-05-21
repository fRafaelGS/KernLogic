import React from 'react';
import { normalizeCategory, getCategoryNamePath, Category } from '@/types/categories';
import { Badge } from '@/domains/core/components/ui/badge';

interface CategoryDisplayProps {
  category: string | Category | null | undefined;
  categories?: Category[];
  className?: string;
  separator?: string;
  showBadge?: boolean;
}

/**
 * Displays a category name safely, handling both string and object formats.
 * Can optionally show a full path breadcrumb when categories list is provided.
 */
export function CategoryDisplay({
  category,
  categories = [],
  className = '',
  separator = ' > ',
  showBadge = true
}: CategoryDisplayProps) {
  if (!category) {
    return showBadge ? (
      <Badge variant="outline" className="bg-gray-100 text-gray-500">
        Uncategorized
      </Badge>
    ) : (
      <span className={`text-gray-500 ${className}`}>Uncategorized</span>
    );
  }
  
  // Normalize and get the category name
  let displayName: string;
  
  if (categories.length > 0) {
    // If we have the full categories list, show the breadcrumb path
    displayName = getCategoryNamePath(category, categories, separator);
  } else if (typeof category === 'string') {
    // Check if the string contains path separators (/, >, \ or |)
    if (/[\/\\>|]/.test(category)) {
      // Split by any common separator and join with our desired separator
      displayName = category
        .split(/[\/\\>|]+/)
        .map(part => part.trim())
        .filter(Boolean)
        .join(separator);
    } else {
      // Just use the string as is
      displayName = category.trim();
    }
  } else {
    // For Category objects, use normalizeCategory
    displayName = normalizeCategory(category).name;
  }
  
  if (showBadge) {
    return (
      <Badge variant="outline" className={`bg-blue-50 text-blue-700 ${className}`}>
        {displayName}
      </Badge>
    );
  }
  
  return <span className={className}>{displayName}</span>;
} 