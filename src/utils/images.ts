import { Product, ProductAsset } from '@/services/productService'
import { assetTypeService } from '@/services/assetTypeService'
import type { ProductWithPrice } from '@/hooks/useProductPrice'

/**
 * Consistently selects the primary image URL from a product using a standard priority order
 * 
 * @param product The product object containing assets and image fields
 * @returns The URL of the primary image, or undefined if no suitable image is found
 */
export function pickPrimaryImage(product: Product | ProductWithPrice): string | undefined {
  // Check assets array for a primary image
  if (product.assets?.length) {
    // First look for an asset explicitly marked as primary
    const primaryAsset = product.assets.find((a: any) => a.is_primary && assetTypeService.isImageAsset(a))
    if (primaryAsset) {
      return primaryAsset.url || primaryAsset.file_url
    }
    // If no primary asset, use the first image asset
    const firstImageAsset = product.assets.find((a: any) => assetTypeService.isImageAsset(a))
    if (firstImageAsset) {
      return firstImageAsset.url || firstImageAsset.file_url
    }
  }
  return undefined
} 