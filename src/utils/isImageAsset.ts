// utils/isImageAsset.ts
import { assetTypeService } from '../services/assetTypeService'

export function getAssetUrl(asset: {
  url?: string;
  file_url?: string;
  file?: string;
}): string | null {
  return asset.url || asset.file_url || asset.file || null;
}

export function isImageAsset(asset: {
  url?: string;
  file_url?: string;
  file?: string;
  type?: string;
  asset_type?: string;
  content_type?: string;
  mime_type?: string;
}): boolean {
  // Use the centralized asset type service
  return assetTypeService.isImageAsset(asset);
} 