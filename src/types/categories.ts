// Basic category structure from the backend
export interface Category {
  id: number;
  name: string;
  parent?: number | null;
  parent_name?: string;
  children?: Category[];
}

// Tree node structure for react-dropdown-tree-select
export interface TreeNode {
  label: string;
  value: string;
  children?: TreeNode[];
  expanded?: boolean;
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  tagClassName?: string;
  actions?: any[];
  // Any additional properties needed by the tree component
}

// Category selection option for simple selects
export interface CategoryOption {
  label: string;
  value: string | number;
}

// Helper functions to normalize category data
export function normalizeCategory(raw: string | Category | Category[] | null | undefined): Category {
  if (!raw) {
    return { id: 0, name: '', parent: null };
  }
  
  // Handle array of categories (take the last/most specific one)
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return { id: 0, name: '', parent: null };
    }
    return raw[raw.length - 1];
  }
  
  // Handle string
  if (typeof raw === 'string') {
    return { id: 0, name: raw, parent: null };
  }
  
  // Handle object
  return raw;
}

// Function to build a breadcrumb trail for display
export function buildCategoryBreadcrumb(
  category: string | Category | Category[] | null | undefined,
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
  category: string | Category | Category[] | null | undefined,
  categories: Category[] = [],
  separator: string = ' > '
): string {
  if (!category) return '';
  
  const breadcrumb = buildCategoryBreadcrumb(normalizeCategory(category), categories);
  return breadcrumb.map(c => c.name).join(separator);
} 