import { Product, ProductAsset } from '@/services/productService'
import { isImageAsset } from './isImageAsset'

/**
 * Consistently selects the primary image URL from a product using a standard priority order
 * 
 * @param product The product object containing assets and image fields
 * @returns The URL of the primary image, or undefined if no suitable image is found
 */
export function pickPrimaryImage(product: Product): string | undefined {
  // Priority 1: Check assets array for a primary image
  if (product.assets?.length) {
    // First look for an asset explicitly marked as primary
    const primaryAsset = product.assets.find(a => a.is_primary && isImageAsset(a))
    if (primaryAsset?.url) {
      return primaryAsset.url
    }
    
    // If no primary asset, use the first image asset
    const firstImageAsset = product.assets.find(a => isImageAsset(a))
    if (firstImageAsset?.url) {
      return firstImageAsset.url
    }
  }
  
  // Priority 2-4: Check direct image URL fields
  return product.primary_image_url || 
         product.primary_image_large || 
         product.primary_image_thumb || 
         undefined
} 