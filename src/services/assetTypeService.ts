/**
 * Standardized asset type identifiers
 * Used consistently throughout the application
 */
export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'spreadsheet' | 'model' | 'unknown';

/**
 * Centralized service for asset type detection and classification
 * Consolidates all the various detection logic from across the application
 */
export const assetTypeService = {
  /**
   * Detects the type of an asset based on file, content type, or asset object
   * 
   * @param fileOrContentType - File object, MIME type string, or asset object
   * @returns Standardized asset type
   */
  detectType(fileOrContentType: File | string | any): AssetType {
    // Handle null/undefined input
    if (!fileOrContentType) return 'unknown';

    // Get MIME type from the input
    let mimeType: string = '';

    if (typeof fileOrContentType === 'string') {
      // Input is already a MIME type or file extension
      mimeType = fileOrContentType.toLowerCase();
    } else if (fileOrContentType instanceof File) {
      // Input is a File object
      mimeType = fileOrContentType.type.toLowerCase();
    } else if (fileOrContentType.type || fileOrContentType.asset_type || fileOrContentType.content_type || fileOrContentType.mime_type) {
      // Input is an asset-like object with type information
      mimeType = (
        fileOrContentType.type || 
        fileOrContentType.asset_type || 
        fileOrContentType.content_type || 
        fileOrContentType.mime_type || 
        ''
      ).toLowerCase();
    } else if (fileOrContentType.file?.type) {
      // Input might contain a nested File object
      return this.detectType(fileOrContentType.file);
    } else if (fileOrContentType.url || fileOrContentType.file_url || fileOrContentType.file) {
      // If we have a URL but no MIME type, try to detect from extension
      const url = fileOrContentType.url || fileOrContentType.file_url || fileOrContentType.file;
      if (typeof url === 'string') {
        return this.detectTypeFromExtension(url);
      }
    }

    // If we found a MIME type, detect based on it
    if (mimeType) {
      // Image types
      if (mimeType.startsWith('image/')) return 'image';
      
      // Video types
      if (mimeType.startsWith('video/')) return 'video';
      
      // Audio types
      if (mimeType.startsWith('audio/')) return 'audio';
      
      // PDF type
      if (mimeType === 'application/pdf' || mimeType.includes('pdf')) return 'pdf';
      
      // 3D model types
      if (
        mimeType.startsWith('model/') || 
        mimeType.includes('3d') || 
        mimeType.includes('stl') || 
        mimeType.includes('obj')
      ) return 'model';
      
      // Spreadsheet types
      if (
        mimeType.includes('spreadsheet') ||
        mimeType.includes('excel') ||
        mimeType.includes('csv') ||
        mimeType.includes('numbers') ||
        mimeType.includes('sheet')
      ) return 'spreadsheet';
      
      // Document types
      if (
        mimeType.includes('text/') ||
        mimeType.includes('document') ||
        mimeType.includes('word') ||
        mimeType.includes('powerpoint') ||
        mimeType.includes('presentation') ||
        mimeType.includes('rtf') ||
        mimeType.includes('msword') ||
        mimeType.includes('officedocument') ||
        mimeType.includes('opendocument') ||
        mimeType.includes('application/vnd.openxmlformats-officedocument')
      ) {
        return 'document';
      }
    }

    // If we haven't determined the type and this is an object with a URL, try extension detection
    if (typeof fileOrContentType === 'object' && (fileOrContentType.url || fileOrContentType.file_url || fileOrContentType.file)) {
      const url = fileOrContentType.url || fileOrContentType.file_url || fileOrContentType.file;
      if (typeof url === 'string') {
        return this.detectTypeFromExtension(url);
      }
    }

    return 'unknown';
  },

  /**
   * Detects asset type from file extension
   * 
   * @param filename - Filename or URL string
   * @returns Standardized asset type
   */
  detectTypeFromExtension(filename: string): AssetType {
    if (!filename || typeof filename !== 'string') return 'unknown';
    
    // Extract extension from filename or URL
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    // Image extensions
    if (/^(jpe?g|png|gif|svg|webp|bmp|tiff?|ico|heic|avif)$/.test(extension)) {
      return 'image';
    }
    
    // Video extensions
    if (/^(mp4|webm|mov|avi|wmv|flv|mkv|m4v|mpg|mpeg)$/.test(extension)) {
      return 'video';
    }
    
    // Audio extensions
    if (/^(mp3|wav|ogg|aac|flac|m4a|wma)$/.test(extension)) {
      return 'audio';
    }
    
    // PDF
    if (extension === 'pdf') {
      return 'pdf';
    }
    
    // 3D model extensions
    if (/^(obj|stl|glb|gltf|fbx|3ds|dae|blend)$/.test(extension)) {
      return 'model';
    }
    
    // Spreadsheet extensions
    if (/^(xlsx?|csv|numbers|ods|gsheet)$/.test(extension)) {
      return 'spreadsheet';
    }
    
    // Document extensions
    if (/^(docx?|rtf|txt|md|pages|odt|pptx?|odp|key)$/.test(extension)) {
      return 'document';
    }
    
    return 'unknown';
  },

  /**
   * Checks if the given type is an image type
   * 
   * @param type - Asset type or asset object
   * @returns True if the type represents an image
   */
  isImageType(type: string | AssetType): boolean {
    if (!type) return false;
    
    // If given an asset object, detect its type first
    if (typeof type === 'object') {
      return this.detectType(type) === 'image';
    }
    
    // Direct type comparison
    return typeof type === 'string' && (
      type.toLowerCase() === 'image' || 
      type.toLowerCase().startsWith('image/')
    );
  },

  /**
   * Checks if the given asset is an image
   * 
   * @param asset - Asset object or file
   * @returns True if the asset is an image
   */
  isImageAsset(asset: any): boolean {
    if (!asset) return false;
    
    // Detect the asset type and check if it's an image
    return this.detectType(asset) === 'image';
  }
};

export default assetTypeService; 