// utils/isImageAsset.ts
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
  const url = getAssetUrl(asset);
  if (!url) return false;

  // Try all MIME‐type fields
  const mime = (
    asset.type ||
    asset.asset_type ||
    asset.content_type ||
    asset.mime_type ||
    ''
  ).toLowerCase();

  // If any says "image", great
  if (mime.includes('image')) return true;

  // Otherwise fallback to extension sniffing
  return /\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(url);
} 