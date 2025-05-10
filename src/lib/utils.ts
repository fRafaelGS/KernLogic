import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Category } from '@/types/categories';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts initials from a name
 * For a single name, returns the first letter
 * For multiple names, returns the first letter of the first and last name
 */
export function nameToInitials(name: string): string {
  if (!name) return 'U';
  
  // Split the name by spaces and get the first letter of each part
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatCurrency(amount: number | string, currency = 'USD'): string {
  // Convert the amount to a number if it's a string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format the amount based on the currency
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    // Fallback format
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
}

/**
 * Gets the category name from any category format
 * @param raw - The category data in any supported format
 * @returns The category name as a string, or empty string if no category
 */
export function getCategoryName(raw: unknown): string {
  if (!raw) return '';
  
  // Case: array with nested trees
  if (Array.isArray(raw) && raw.length > 0) {
    // Start with the last array element (usually the leaf)
    let node = raw[raw.length - 1];
    
    // If it's got children property, recursively follow to the last leaf node
    // This handles cases where the leaf node itself has further children
    if (node && typeof node === 'object' && node !== null && 
        'children' in node && Array.isArray(node.children) && 
        node.children.length > 0) {
      
      // Find the deepest leaf node by traversing the children tree
      let deepestNode = node;
      let currentNode = node;
      let depth = 0;
      
      // Maximum depth protection (prevent infinite loops)
      const MAX_DEPTH = 10;
      
      const findDeepestLeaf = (node: any, currentDepth: number): any => {
        if (currentDepth > MAX_DEPTH) return node;
        
        if (node && typeof node === 'object' && 
            'children' in node && Array.isArray(node.children) && 
            node.children.length > 0) {
          
          // Recursively check the last child (most specific)
          return findDeepestLeaf(node.children[node.children.length - 1], currentDepth + 1);
        }
        
        return node;
      };
      
      node = findDeepestLeaf(node, 0);
    }
    
    // Safe property access with optional chaining
    return typeof node === 'object' && node !== null && 'name' in node ? 
      node.name as string || '' : 
      String(node);
  }
  
  // Case: object with children
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    
    // For objects with children, traverse to find the deepest leaf node
    if ('children' in obj && Array.isArray(obj.children) && obj.children.length > 0) {
      // Same approach as above - find the deepest leaf node
      const MAX_DEPTH = 10;
      
      const findDeepestLeaf = (node: Record<string, unknown>, currentDepth: number): Record<string, unknown> => {
        if (currentDepth > MAX_DEPTH) return node;
        
        if ('children' in node && Array.isArray(node.children) && node.children.length > 0) {
          // Get the last child (most specific)
          const lastChild = node.children[node.children.length - 1] as Record<string, unknown>;
          return findDeepestLeaf(lastChild, currentDepth + 1);
        }
        
        return node;
      };
      
      const deepestNode = findDeepestLeaf(obj, 0);
      return 'name' in deepestNode && typeof deepestNode.name === 'string' ? deepestNode.name as string : '';
    }
    
    // Simple object with name property
    return 'name' in obj && typeof obj.name === 'string' ? obj.name as string : '';
  }
  
  // Handle string or any other value by converting to string
  return String(raw).trim();
}

/**
 * Returns true if the category hierarchy contains the filterValue,
 * or if filterValue === "" (uncategorized) and there is NO valid category.
 */
export function matchesCategoryFilter(raw: unknown, filterValue: string): boolean {
  console.log("matchesCategoryFilter called with:", { raw, filterValue });
  
  // UNCATEGORIZED: no category whatsoever
  if (filterValue === "") {
    console.log("Checking for uncategorized");
    
    // raw null/undefined
    if (raw == null) {
      console.log("raw is null/undefined -> true");
      return true;
    }
    // raw empty string
    if (typeof raw === "string" && raw.trim() === "") {
      console.log("raw is empty string -> true");
      return true;
    }
    // raw empty array
    if (Array.isArray(raw) && raw.length === 0) {
      console.log("raw is empty array -> true");
      return true;
    }
    // raw object but no name
    if (typeof raw === "object" && raw !== null && !("name" in raw)) {
      console.log("raw is object without name property -> true");
      return true;
    }
    console.log("Not uncategorized -> false");
    return false;
  }

  // ANY OTHER CATEGORY: gather all names
  const names: string[] = [];
  if (Array.isArray(raw)) {
    raw.forEach(node => {
      if (node && typeof node === "object" && "name" in node) {
        const n = (node as any).name;
        if (typeof n === "string") names.push(n);
      }
    });
  } else if (raw && typeof raw === "object" && "name" in raw) {
    const n = (raw as any).name;
    if (typeof n === "string") names.push(n);
  } else if (typeof raw === "string") {
    names.push(raw);
  }

  console.log("Category names found:", names, "Looking for:", filterValue);
  const result = names.includes(filterValue);
  console.log("Match result:", result);
  return result;
}
