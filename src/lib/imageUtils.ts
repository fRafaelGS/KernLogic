import { Product, ProductAsset } from '@/services/productService';
import { isImageAsset } from '@/utils/isImageAsset';

/**
 * Selects the primary image URL for a product based on a consistent priority order
 * 
 * @param product The product object
 * @param assets Optional array of product assets (if not included in product.assets)
 * @returns The URL of the primary image, or undefined if no image is found
 */
export function pickPrimaryImage(product: Product, assets?: ProductAsset[]): string | undefined {
  // Use provided assets or fall back to product.assets
  const assetsList = assets || product.assets || [];
  
  // 1. First priority: assets with is_primary=true
  const primaryAsset = assetsList.find(a => a.is_primary && isImageAsset(a));
  if (primaryAsset?.url) {
    console.debug('[pickPrimaryImage] Found primary asset:', primaryAsset.url);
    return primaryAsset.url;
  }
  
  // 2. Second priority: any image asset if no primary is marked
  const anyImageAsset = assetsList.find(a => isImageAsset(a));
  if (anyImageAsset?.url) {
    console.debug('[pickPrimaryImage] Using first available image asset:', anyImageAsset.url);
    return anyImageAsset.url;
  }
  
  // 3. Third priority: dedicated primary image fields on the product
  if (product.primary_image_url) {
    console.debug('[pickPrimaryImage] Using primary_image_url:', product.primary_image_url);
    return product.primary_image_url;
  }
  
  if (product.primary_image_large) {
    console.debug('[pickPrimaryImage] Using primary_image_large:', product.primary_image_large);
    return product.primary_image_large;
  }
  
  if (product.primary_image_thumb) {
    console.debug('[pickPrimaryImage] Using primary_image_thumb:', product.primary_image_thumb);
    return product.primary_image_thumb;
  }
  
  // 4. Fourth priority: images array (legacy)
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const primaryImage = product.images.find(img => img.is_primary);
    if (primaryImage?.url) {
      console.debug('[pickPrimaryImage] Using primary image from images array:', primaryImage.url);
      return primaryImage.url;
    }
    
    // Fallback to first image if no primary is marked
    if (product.images[0]?.url) {
      console.debug('[pickPrimaryImage] Using first image from images array:', product.images[0].url);
      return product.images[0].url;
    }
  }
  
  // No image found
  console.debug('[pickPrimaryImage] No image found for product');
  return undefined;
}

/**
 * Check if a product has any image (primary or not)
 */
export function hasAnyImage(product: Product): boolean {
  return !!pickPrimaryImage(product);
} 