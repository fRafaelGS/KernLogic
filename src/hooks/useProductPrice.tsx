import { formatCurrency } from '@/lib/utils';

// Types for product price data
export interface ProductPrice {
  amount: string;
  currency_iso: string;
  currency?: string; // Add the currency property
  price_type_code: string;
  price_type_display?: string; // Add display name for price type
}

export interface ProductWithPrice {
  id: number | string;
  default_price?: ProductPrice;
  primary_asset_url?: string;
  family_name?: string;
  [key: string]: any; // For other properties
}

/**
 * Hook to get formatted price display
 */
export function useProductPrice() {
  /**
   * Get formatted price display for a product
   */
  const getFormattedPrice = (product: ProductWithPrice): string => {
    // Add debug console log to help identify problems
    console.log('Price data for product', product.id, product.name, {
      has_default_price: !!product.default_price,
      default_price: product.default_price,
      first_price: product.prices && product.prices.length > 0 ? product.prices[0] : null
    });
    
    if (product.default_price && product.default_price.amount) {
      // Use the default_price from the pricing table
      // Support both new and old format
      const amount = parseFloat(product.default_price.amount);
      const currency = product.default_price.currency || product.default_price.currency_iso;
      return formatCurrency(amount, currency);
    } else if (product.prices && product.prices.length > 0) {
      // Fallback to first price in the prices array if default_price not set
      const firstPrice = product.prices[0];
      return formatCurrency(parseFloat(firstPrice.amount), firstPrice.currency);
    } else {
      // No price found
      return 'No price set';
    }
  };
  
  /**
   * Get price type display name
   */
  const getPriceTypeDisplay = (product: ProductWithPrice): string => {
    if (product.default_price) {
      // Return price type display name or code as fallback
      return product.default_price.price_type_display || 
             product.default_price.price_type_code || 
             'Base Price';
    } else if (product.prices && product.prices.length > 0) {
      return product.prices[0].price_type_display || 
             product.prices[0].price_type_code || 
             'Price';
    }
    return 'Price';
  };
  
  /**
   * Check if this is a legacy price - always false now that we've fully migrated
   */
  const isLegacyPrice = (product: ProductWithPrice): boolean => {
    return false;
  };
  
  /**
   * Get price source info
   */
  const getPriceSourceInfo = (product: ProductWithPrice): { isLegacy: boolean; priceType: string } => {
    if (product.default_price) {
      return { isLegacy: false, priceType: getPriceTypeDisplay(product) };
    } else {
      return { isLegacy: false, priceType: 'Price' };
    }
  };
  
  return {
    getFormattedPrice,
    isLegacyPrice,
    getPriceSourceInfo,
    getPriceTypeDisplay,
    useNewPricingData: true  // Always true now that we've fully migrated
  };
} 