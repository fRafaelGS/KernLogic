export interface Category {
  id: number;
  name: string;
  parent?: number | null;
  parent_name?: string;
  children?: Category[];
}

// Helper functions to normalize category data
export function normalizeCategory(raw: string | Category | null | undefined): Category {
  if (!raw) {
    return { id: 0, name: '', parent: null };
  }
  
  return typeof raw === 'string'
    ? { id: 0, name: raw, parent: null }
    : raw;
}

// Function to build a breadcrumb trail for display
export function buildCategoryBreadcrumb(
  category: string | Category | null | undefined,
  categories: Category[] = []
): Category[] {
  // Return empty array for null/undefined
  if (!category) return [];
  
  // Convert string to Category object
  const normalizedCategory = normalizeCategory(category);
  
  // Start with the current category
  const breadcrumb: Category[] = [normalizedCategory];
  
  // If we have a parent ID and categories list for lookup
  if (normalizedCategory.parent && categories.length > 0) {
    // Find the parent category in the list
    const parent = categories.find(c => c.id === normalizedCategory.parent);
    if (parent) {
      // Recursively build the breadcrumb for the parent
      return [...buildCategoryBreadcrumb(parent, categories), normalizedCategory];
    }
  }
  
  return breadcrumb;
}

// Function to get the full category name path
export function getCategoryNamePath(
  category: string | Category | null | undefined,
  categories: Category[] = [],
  separator: string = ' > '
): string {
  if (!category) return '';
  
  const breadcrumb = buildCategoryBreadcrumb(normalizeCategory(category), categories);
  return breadcrumb.map(c => c.name).join(separator);
} 