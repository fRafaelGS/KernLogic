# Asset Type Service

The `AssetTypeService` is a unified asset type detection service that provides consistent content type detection across both the frontend (TypeScript) and backend (Python) of the KernLogic platform.

## Purpose

Prior to the implementation of this service, asset type detection was scattered throughout the codebase with inconsistent logic and formats, leading to potential bugs and maintenance challenges. The consolidated service addresses these issues by:

1. Providing a single source of truth for asset type detection
2. Standardizing the return types for content type classification
3. Handling all edge cases consistently
4. Improving code maintainability and testability

## Implementation

The service is implemented in two parts:

### Frontend (TypeScript)

```typescript
// src/services/assetTypeService.ts

export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'spreadsheet' | 'model' | 'unknown';

export const assetTypeService = {
  detectType(fileOrContentType: File | string | any): AssetType {...},
  detectTypeFromExtension(filename: string): AssetType {...},
  isImageType(type: string | AssetType): boolean {...},
  isImageAsset(asset: any): boolean {...}
};
```

### Backend (Python)

```python
# backend/products/utils/asset_type_service.py

class AssetTypeService:
    @staticmethod
    def detect_type(file_or_content_type: Any) -> str: ...
    
    @staticmethod
    def detect_type_from_extension(filename: str) -> str: ...
    
    @staticmethod
    def is_image_type(type_str: str) -> bool: ...
    
    @staticmethod
    def is_image_asset(asset: Any) -> bool: ...

# Create a singleton instance for easier imports
asset_type_service = AssetTypeService()
```

## Usage

### Frontend Usage

```typescript
// Import the service
import { assetTypeService } from '@/services/assetTypeService';

// Detect asset type
const assetType = assetTypeService.detectType(file);  // 'image', 'video', etc.

// Check if an asset is an image
const isImage = assetTypeService.isImageAsset(asset);  // true/false

// Replace direct checks with the service
// Before:
if (asset.type === 'image' || asset.content_type?.startsWith('image/')) {...}

// After:
if (assetTypeService.isImageAsset(asset)) {...}
```

### Backend Usage

```python
# Import the service
from products.utils.asset_type_service import asset_type_service

# Detect asset type
asset_type = asset_type_service.detect_type(file_data)  # 'image', 'video', etc.

# Check if an asset is an image
is_image = asset_type_service.is_image_asset(asset)  # True/False

# Replace direct checks with the service
# Before:
if asset.content_type.lower().startswith('image/'):
    asset_type = 'image'

# After:
asset_type = asset_type_service.detect_type(asset)
```

## Supported Asset Types

The service standardizes asset types to the following values:

| Asset Type    | Description                                   | Examples                                    |
|---------------|-----------------------------------------------|---------------------------------------------|
| `image`       | Image files                                   | jpg, png, gif, svg, webp                    |
| `video`       | Video files                                   | mp4, webm, mov, avi                         |
| `audio`       | Audio files                                   | mp3, wav, ogg, flac                         |
| `pdf`         | PDF documents                                 | pdf                                         |
| `document`    | Text and document files                       | doc, docx, txt, md, pptx                    |
| `spreadsheet` | Spreadsheet and data files                    | xls, xlsx, csv                              |
| `model`       | 3D model files                                | obj, stl, glb, gltf                         |
| `unknown`     | Files that don't match any of the above types | Any unrecognized extension or content type  |

## Detection Methods

The service has multiple fallback strategies for type detection:

1. MIME type detection from content_type
2. Type field in the asset object
3. Extension detection from filenames and URLs
4. Special handling for various input formats (Files, strings, objects)

## Testing

Both implementations include comprehensive test suites covering various input types and edge cases:

- Frontend: `src/__tests__/services/assetTypeService.test.ts`
- Backend: `backend/products/tests/test_asset_type_service.py`

## Best Practices

1. Always use the service for type detection rather than implementing custom logic
2. For new asset types, extend the service rather than creating separate utilities
3. Keep the frontend and backend implementations in sync
4. Add test cases for any new extensions or MIME types 