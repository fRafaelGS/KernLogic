"""
Shared asset type detection service for determining file types consistently.
This matches the frontend TypeScript implementation for consistency.
"""
import os
import re
from typing import Union, Dict, Any, Optional, List


# Define supported asset types
ASSET_TYPES = [
    'image',
    'video',
    'audio',
    'pdf',
    'document',
    'spreadsheet',
    'model',
    'unknown'
]


class AssetTypeService:
    """Centralized service for asset type detection and classification"""
    
    @staticmethod
    def detect_type(file_or_content_type: Any) -> str:
        """
        Detects the type of an asset based on file, content type, or asset object
        
        Args:
            file_or_content_type: Django UploadedFile, MIME type string, or asset object
            
        Returns:
            Standardized asset type as string
        """
        # Handle None input
        if file_or_content_type is None:
            return 'unknown'
            
        # Get MIME type from the input
        mime_type = ''
        
        # Handle string input (MIME type or file path)
        if isinstance(file_or_content_type, str):
            mime_type = file_or_content_type.lower()
        
        # Handle Django UploadedFile or similar objects
        elif hasattr(file_or_content_type, 'content_type'):
            mime_type = file_or_content_type.content_type.lower()
        
        # Handle Django File objects
        elif hasattr(file_or_content_type, 'name') and hasattr(file_or_content_type, 'file'):
            # Try to get from content_type if available
            if hasattr(file_or_content_type, 'content_type'):
                mime_type = file_or_content_type.content_type.lower()
            else:
                # Fall back to extension detection
                return AssetTypeService.detect_type_from_extension(file_or_content_type.name)
        
        # Handle models and dictionary-like objects
        elif hasattr(file_or_content_type, 'get') or hasattr(file_or_content_type, '__getitem__'):
            # Try various attribute names used in the project
            try:
                # Using getattr for models and get for dicts
                get_attr = getattr(file_or_content_type, 'get', None)
                
                # Check various possible field names for type information
                for field in ['type', 'asset_type', 'content_type', 'mime_type']:
                    if get_attr:  # Dict-like
                        value = get_attr(field, '')
                        if value:
                            mime_type = str(value).lower()
                            break
                    elif hasattr(file_or_content_type, field):  # Model-like
                        value = getattr(file_or_content_type, field, '')
                        if value:
                            mime_type = str(value).lower()
                            break
                
                # If we couldn't find a type, try getting it from a file field
                if not mime_type:
                    # Check for a nested file with type info
                    for field in ['file', 'image']:
                        file_field = None
                        
                        if get_attr:  # Dict-like
                            file_field = get_attr(field, None)
                        elif hasattr(file_or_content_type, field):  # Model-like
                            file_field = getattr(file_or_content_type, field, None)
                            
                        if file_field:
                            return AssetTypeService.detect_type(file_field)
                    
                    # If still no type, try using URL fields for extension detection
                    for field in ['url', 'file_url', 'file']:
                        url = None
                        
                        if get_attr:  # Dict-like
                            url = get_attr(field, None)
                        elif hasattr(file_or_content_type, field):  # Model-like
                            url = getattr(file_or_content_type, field, None)
                            
                        if url and isinstance(url, str):
                            return AssetTypeService.detect_type_from_extension(url)
            
            except (AttributeError, KeyError, TypeError):
                # Fall back to unknown if we can't extract any useful information
                return 'unknown'
            
        # If we found a MIME type, detect based on it
        if mime_type:
            # Image types
            if mime_type.startswith('image/'):
                return 'image'
                
            # Video types
            if mime_type.startswith('video/'):
                return 'video'
                
            # Audio types
            if mime_type.startswith('audio/'):
                return 'audio'
                
            # PDF type
            if mime_type == 'application/pdf' or 'pdf' in mime_type:
                return 'pdf'
                
            # 3D model types
            if (
                mime_type.startswith('model/') or 
                '3d' in mime_type or 
                'stl' in mime_type or 
                'obj' in mime_type
            ):
                return 'model'
                
            # Spreadsheet types
            if (
                'spreadsheet' in mime_type or
                'excel' in mime_type or
                'csv' in mime_type or
                'numbers' in mime_type or
                'sheet' in mime_type
            ):
                return 'spreadsheet'
                
            # Document types
            if (
                mime_type.startswith('text/') or
                'document' in mime_type or
                'word' in mime_type or
                'powerpoint' in mime_type or
                'presentation' in mime_type or
                'rtf' in mime_type or
                'msword' in mime_type or
                'officedocument' in mime_type or
                'opendocument' in mime_type or
                'application/vnd.openxmlformats-officedocument' in mime_type
            ):
                return 'document'
        
        # Last resort: check for a name or path attribute to detect by extension
        if hasattr(file_or_content_type, 'name') and isinstance(file_or_content_type.name, str):
            return AssetTypeService.detect_type_from_extension(file_or_content_type.name)
        elif hasattr(file_or_content_type, 'path') and isinstance(file_or_content_type.path, str):
            return AssetTypeService.detect_type_from_extension(file_or_content_type.path)
            
        return 'unknown'
    
    @staticmethod
    def detect_type_from_extension(filename: str) -> str:
        """
        Detects asset type from file extension
        
        Args:
            filename: Filename or URL string
            
        Returns:
            Standardized asset type as string
        """
        if not filename or not isinstance(filename, str):
            return 'unknown'
            
        # Extract extension from filename or URL
        extension = os.path.splitext(filename)[1].lower().lstrip('.')
        
        # Image extensions
        if re.match(r'^(jpe?g|png|gif|svg|webp|bmp|tiff?|ico|heic|avif)$', extension):
            return 'image'
            
        # Video extensions
        if re.match(r'^(mp4|webm|mov|avi|wmv|flv|mkv|m4v|mpg|mpeg)$', extension):
            return 'video'
            
        # Audio extensions
        if re.match(r'^(mp3|wav|ogg|aac|flac|m4a|wma)$', extension):
            return 'audio'
            
        # PDF
        if extension == 'pdf':
            return 'pdf'
            
        # 3D model extensions
        if re.match(r'^(obj|stl|glb|gltf|fbx|3ds|dae|blend)$', extension):
            return 'model'
            
        # Spreadsheet extensions
        if re.match(r'^(xlsx?|csv|numbers|ods|gsheet)$', extension):
            return 'spreadsheet'
            
        # Document extensions
        if re.match(r'^(docx?|rtf|txt|md|pages|odt|pptx?|odp|key)$', extension):
            return 'document'
            
        return 'unknown'
    
    @staticmethod
    def is_image_type(type_str: str) -> bool:
        """
        Checks if the given type is an image type
        
        Args:
            type_str: Asset type string or asset object
            
        Returns:
            True if the type represents an image
        """
        if not type_str:
            return False
            
        # If given an asset object, detect its type first
        if not isinstance(type_str, str):
            return AssetTypeService.detect_type(type_str) == 'image'
            
        # Direct type comparison
        type_str = type_str.lower()
        return type_str == 'image' or type_str.startswith('image/')
    
    @staticmethod
    def is_image_asset(asset: Any) -> bool:
        """
        Checks if the given asset is an image
        
        Args:
            asset: Asset object or file
            
        Returns:
            True if the asset is an image
        """
        if asset is None:
            return False
            
        # Detect the asset type and check if it's an image
        return AssetTypeService.detect_type(asset) == 'image'


# Create a singleton instance for easier imports
asset_type_service = AssetTypeService() 