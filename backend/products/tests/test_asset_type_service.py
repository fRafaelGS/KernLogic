"""Tests for the AssetTypeService."""
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from ..utils.asset_type_service import AssetTypeService, asset_type_service


class AssetTypeServiceTestCase(TestCase):
    """Test cases for the AssetTypeService."""
    
    def test_detect_type_none_input(self):
        """Test that None input is handled correctly."""
        self.assertEqual(asset_type_service.detect_type(None), 'unknown')
    
    def test_detect_type_string_input(self):
        """Test detecting types from MIME type strings."""
        # Image types
        self.assertEqual(asset_type_service.detect_type('image/jpeg'), 'image')
        self.assertEqual(asset_type_service.detect_type('image/png'), 'image')
        self.assertEqual(asset_type_service.detect_type('image/svg+xml'), 'image')
        
        # Video types
        self.assertEqual(asset_type_service.detect_type('video/mp4'), 'video')
        self.assertEqual(asset_type_service.detect_type('video/webm'), 'video')
        
        # Audio types
        self.assertEqual(asset_type_service.detect_type('audio/mpeg'), 'audio')
        self.assertEqual(asset_type_service.detect_type('audio/wav'), 'audio')
        
        # PDF type
        self.assertEqual(asset_type_service.detect_type('application/pdf'), 'pdf')
        
        # Document types
        self.assertEqual(asset_type_service.detect_type('application/msword'), 'document')
        self.assertEqual(
            asset_type_service.detect_type('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), 
            'document'
        )
        self.assertEqual(asset_type_service.detect_type('text/plain'), 'document')
        
        # Spreadsheet types
        self.assertEqual(asset_type_service.detect_type('application/vnd.ms-excel'), 'spreadsheet')
        self.assertEqual(asset_type_service.detect_type('application/excel'), 'spreadsheet')
        self.assertEqual(asset_type_service.detect_type('text/csv'), 'spreadsheet')
        
        # 3D model types
        self.assertEqual(asset_type_service.detect_type('model/gltf-binary'), 'model')
        self.assertEqual(asset_type_service.detect_type('model/obj'), 'model')
        
        # Unknown types
        self.assertEqual(asset_type_service.detect_type('application/octet-stream'), 'unknown')
    
    def test_detect_type_uploaded_file(self):
        """Test detecting types from Django UploadedFile objects."""
        # Create test file objects
        image_file = SimpleUploadedFile(
            "test_image.jpg", 
            b"file_content", 
            content_type="image/jpeg"
        )
        pdf_file = SimpleUploadedFile(
            "test_document.pdf", 
            b"file_content", 
            content_type="application/pdf"
        )
        doc_file = SimpleUploadedFile(
            "test_document.docx", 
            b"file_content", 
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        
        self.assertEqual(asset_type_service.detect_type(image_file), 'image')
        self.assertEqual(asset_type_service.detect_type(pdf_file), 'pdf')
        self.assertEqual(asset_type_service.detect_type(doc_file), 'document')
    
    def test_detect_type_model_object(self):
        """Test detecting types from model-like objects."""
        # Create mock objects with different type attributes
        image_asset = MagicMock()
        image_asset.type = 'image/jpeg'
        
        video_asset = MagicMock()
        video_asset.asset_type = 'video'
        
        audio_asset = MagicMock()
        audio_asset.content_type = 'audio/mp3'
        
        pdf_asset = MagicMock()
        pdf_asset.mime_type = 'application/pdf'
        
        self.assertEqual(asset_type_service.detect_type(image_asset), 'image')
        self.assertEqual(asset_type_service.detect_type(video_asset), 'video')
        self.assertEqual(asset_type_service.detect_type(audio_asset), 'audio')
        self.assertEqual(asset_type_service.detect_type(pdf_asset), 'pdf')
    
    def test_detect_type_nested_file(self):
        """Test detecting types from objects with nested file fields."""
        # Create a mock with a nested file
        asset_with_file = MagicMock()
        asset_with_file.file = MagicMock()
        asset_with_file.file.content_type = 'image/jpeg'
        
        self.assertEqual(asset_type_service.detect_type(asset_with_file), 'image')
        
        # Test with image field
        asset_with_image = MagicMock()
        asset_with_image.image = MagicMock()
        asset_with_image.image.content_type = 'image/png'
        
        self.assertEqual(asset_type_service.detect_type(asset_with_image), 'image')
    
    def test_detect_type_dict_object(self):
        """Test detecting types from dictionary-like objects."""
        # Dictionary with type information
        image_dict = {'type': 'image/jpeg'}
        video_dict = {'asset_type': 'video'}
        audio_dict = {'content_type': 'audio/mp3'}
        pdf_dict = {'mime_type': 'application/pdf'}
        
        self.assertEqual(asset_type_service.detect_type(image_dict), 'image')
        self.assertEqual(asset_type_service.detect_type(video_dict), 'video')
        self.assertEqual(asset_type_service.detect_type(audio_dict), 'audio')
        self.assertEqual(asset_type_service.detect_type(pdf_dict), 'pdf')
        
        # Dictionary with URL for extension detection
        image_url_dict = {'url': 'https://example.com/image.jpg'}
        video_url_dict = {'file_url': 'https://example.com/video.mp4'}
        pdf_url_dict = {'file': '/path/to/document.pdf'}
        
        self.assertEqual(asset_type_service.detect_type(image_url_dict), 'image')
        self.assertEqual(asset_type_service.detect_type(video_url_dict), 'video')
        self.assertEqual(asset_type_service.detect_type(pdf_url_dict), 'pdf')
    
    def test_detect_type_from_name_attribute(self):
        """Test detecting types from objects with name attributes."""
        # Create a mock with just a name attribute
        file_obj = MagicMock()
        file_obj.name = 'document.pdf'
        
        self.assertEqual(asset_type_service.detect_type(file_obj), 'pdf')
        
        file_obj.name = 'image.jpg'
        self.assertEqual(asset_type_service.detect_type(file_obj), 'image')
    
    def test_detect_type_from_extension(self):
        """Test the detect_type_from_extension method."""
        # Test null/undefined handling
        self.assertEqual(asset_type_service.detect_type_from_extension(None), 'unknown')
        self.assertEqual(asset_type_service.detect_type_from_extension(''), 'unknown')
        
        # Test image extensions
        self.assertEqual(asset_type_service.detect_type_from_extension('image.jpg'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('image.jpeg'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('image.png'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('image.gif'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('image.svg'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('image.webp'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('image.bmp'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('image.tiff'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('image.ico'), 'image')
        
        # Test video extensions
        self.assertEqual(asset_type_service.detect_type_from_extension('video.mp4'), 'video')
        self.assertEqual(asset_type_service.detect_type_from_extension('video.webm'), 'video')
        self.assertEqual(asset_type_service.detect_type_from_extension('video.mov'), 'video')
        self.assertEqual(asset_type_service.detect_type_from_extension('video.avi'), 'video')
        self.assertEqual(asset_type_service.detect_type_from_extension('video.wmv'), 'video')
        self.assertEqual(asset_type_service.detect_type_from_extension('video.mkv'), 'video')
        
        # Test audio extensions
        self.assertEqual(asset_type_service.detect_type_from_extension('audio.mp3'), 'audio')
        self.assertEqual(asset_type_service.detect_type_from_extension('audio.wav'), 'audio')
        self.assertEqual(asset_type_service.detect_type_from_extension('audio.ogg'), 'audio')
        self.assertEqual(asset_type_service.detect_type_from_extension('audio.flac'), 'audio')
        self.assertEqual(asset_type_service.detect_type_from_extension('audio.aac'), 'audio')
        
        # Test PDF extension
        self.assertEqual(asset_type_service.detect_type_from_extension('document.pdf'), 'pdf')
        
        # Test 3D model extensions
        self.assertEqual(asset_type_service.detect_type_from_extension('model.obj'), 'model')
        self.assertEqual(asset_type_service.detect_type_from_extension('model.stl'), 'model')
        self.assertEqual(asset_type_service.detect_type_from_extension('model.glb'), 'model')
        self.assertEqual(asset_type_service.detect_type_from_extension('model.gltf'), 'model')
        self.assertEqual(asset_type_service.detect_type_from_extension('model.fbx'), 'model')
        
        # Test spreadsheet extensions
        self.assertEqual(asset_type_service.detect_type_from_extension('data.xlsx'), 'spreadsheet')
        self.assertEqual(asset_type_service.detect_type_from_extension('data.xls'), 'spreadsheet')
        self.assertEqual(asset_type_service.detect_type_from_extension('data.csv'), 'spreadsheet')
        self.assertEqual(asset_type_service.detect_type_from_extension('data.numbers'), 'spreadsheet')
        self.assertEqual(asset_type_service.detect_type_from_extension('data.ods'), 'spreadsheet')
        
        # Test document extensions
        self.assertEqual(asset_type_service.detect_type_from_extension('document.docx'), 'document')
        self.assertEqual(asset_type_service.detect_type_from_extension('document.doc'), 'document')
        self.assertEqual(asset_type_service.detect_type_from_extension('document.rtf'), 'document')
        self.assertEqual(asset_type_service.detect_type_from_extension('document.txt'), 'document')
        self.assertEqual(asset_type_service.detect_type_from_extension('document.md'), 'document')
        self.assertEqual(asset_type_service.detect_type_from_extension('presentation.pptx'), 'document')
        self.assertEqual(asset_type_service.detect_type_from_extension('presentation.ppt'), 'document')
        
        # Test URLs
        self.assertEqual(asset_type_service.detect_type_from_extension('https://example.com/image.jpg'), 'image')
        self.assertEqual(asset_type_service.detect_type_from_extension('https://example.com/path/to/document.pdf'), 'pdf')
        self.assertEqual(asset_type_service.detect_type_from_extension('https://example.com/data.xlsx?query=param'), 'spreadsheet')
        
        # Test unknown extensions
        self.assertEqual(asset_type_service.detect_type_from_extension('unknown.xyz'), 'unknown')
        self.assertEqual(asset_type_service.detect_type_from_extension('noextension'), 'unknown')
    
    def test_is_image_type(self):
        """Test the is_image_type method."""
        # Test string inputs
        self.assertTrue(asset_type_service.is_image_type('image'))
        self.assertTrue(asset_type_service.is_image_type('IMAGE'))
        self.assertTrue(asset_type_service.is_image_type('image/jpeg'))
        self.assertTrue(asset_type_service.is_image_type('image/png'))
        
        self.assertFalse(asset_type_service.is_image_type('video'))
        self.assertFalse(asset_type_service.is_image_type('document'))
        self.assertFalse(asset_type_service.is_image_type('pdf'))
        self.assertFalse(asset_type_service.is_image_type(''))
        self.assertFalse(asset_type_service.is_image_type(None))
        
        # Test object inputs
        self.assertTrue(asset_type_service.is_image_type({'type': 'image'}))
        self.assertTrue(asset_type_service.is_image_type({'content_type': 'image/png'}))
        self.assertTrue(asset_type_service.is_image_type({'url': 'https://example.com/image.jpg'}))
        
        self.assertFalse(asset_type_service.is_image_type({'type': 'video'}))
        self.assertFalse(asset_type_service.is_image_type({'url': 'https://example.com/document.pdf'}))
    
    def test_is_image_asset(self):
        """Test the is_image_asset method."""
        # Test image assets
        self.assertTrue(asset_type_service.is_image_asset({'type': 'image'}))
        self.assertTrue(asset_type_service.is_image_asset({'asset_type': 'image/jpeg'}))
        self.assertTrue(asset_type_service.is_image_asset({'content_type': 'image/png'}))
        self.assertTrue(asset_type_service.is_image_asset({'url': 'https://example.com/image.jpg'}))
        
        image_file = SimpleUploadedFile(
            "test_image.jpg", 
            b"file_content", 
            content_type="image/jpeg"
        )
        self.assertTrue(asset_type_service.is_image_asset(image_file))
        
        # Test non-image assets
        self.assertFalse(asset_type_service.is_image_asset({'type': 'video'}))
        self.assertFalse(asset_type_service.is_image_asset({'url': 'https://example.com/document.pdf'}))
        
        pdf_file = SimpleUploadedFile(
            "test_document.pdf", 
            b"file_content", 
            content_type="application/pdf"
        )
        self.assertFalse(asset_type_service.is_image_asset(pdf_file))
        
        self.assertFalse(asset_type_service.is_image_asset(None))


if __name__ == '__main__':
    unittest.main() 