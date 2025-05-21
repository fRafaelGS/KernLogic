import { Product, ProductAsset } from '@/domains/products/services/productService'
import { assetTypeService } from '@/domains/products/services/assetTypeService'
import type { ProductWithPrice } from '@/domains/products/components/hooks/useProductPrice'

/**
 * Consistently selects the primary image URL from a product using a standard priority order
 * 
 * @param product The product object containing assets and image fields
 * @returns The URL of the primary image, or undefined if no suitable image is found
 */
export function pickPrimaryImage(product: Product | ProductWithPrice): string | undefined {
  // First check if primary_asset_url exists (from API's ProductListSerializer)
  if (product.primary_asset_url) {
    // Check if the URL needs to be absolute
    const url = product.primary_asset_url;
    // If it's already a full URL, use it directly
    if (url.startsWith('http') || url.startsWith('data:')) {
      return url;
    }
    // If it's a relative URL, ensure it's properly formed
    return url.startsWith('/') ? url : `/${url}`;
  }
  
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