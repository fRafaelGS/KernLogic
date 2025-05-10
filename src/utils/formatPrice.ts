import { Product, ProductPrice } from '@/services/productService'

interface FormatPriceOptions {
  currency?: string
  locale?: string
  decimals?: number
}

/**
 * Format a number as currency with specified options
 * Default: USD with German (de-DE) locale rules
 * Example: 1234.5 → "1.234,50 $"
 */
export function formatPrice(
  price: number | null | undefined,
  options: FormatPriceOptions = {}
): string {
  if (price === null || price === undefined) return '-'
  
  const {
    currency = 'USD',
    locale = 'de-DE',
    decimals = 2
  } = options
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(price)
}

/**
 * Get a formatted price string for a product with multiple prices
 * Shows all available price types, not just the base price
 */
export function getProductPriceDisplay(product: Product): string {
  if (!product) return '-'
  
  // If product has prices array with values
  if (product.prices && product.prices.length > 0) {
    // Check priority: BASE -> LIST -> first price
    const basePrice = product.prices.find(p => p.price_type === 'BASE')
    const listPrice = product.prices.find(p => p.price_type === 'LIST')
    const primaryPrice = basePrice || listPrice || product.prices[0]
    
    // Format the primary price
    const formattedPrice = formatPrice(primaryPrice.amount, { currency: primaryPrice.currency })
    
    // Show price type and count if more than one price
    if (product.prices.length > 1) {
      return `${formattedPrice} (${primaryPrice.price_type_display || primaryPrice.price_type}, +${product.prices.length - 1} more)`
    }
    
    // Single price with type
    return `${formattedPrice} (${primaryPrice.price_type_display || primaryPrice.price_type})`
  }
  
  // Fallback to legacy price
  return formatPrice(product.price)
}
  