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
export function getCategoryName(raw: string | Category | Record<string, any> | any[] | null | undefined): string {
  if (!raw) return '';
  
  // Handle array of categories
  if (Array.isArray(raw)) {
    // take the leaf of the hierarchy (last element)
    if (raw.length === 0) return '';
    const leaf = raw[raw.length - 1];
    // Safe property access with optional chaining
    return typeof leaf === 'object' && leaf !== null ? leaf?.name ?? '' : String(leaf);
  }
  
  // Handle object with name property
  if (typeof raw === 'object' && raw !== null) {
    return raw.name ?? '';
  }
  
  // Handle string or any other value by converting to string
  return String(raw).trim();
}
