import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
