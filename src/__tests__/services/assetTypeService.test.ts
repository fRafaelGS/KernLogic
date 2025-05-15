import { assetTypeService, AssetType } from '../../services/assetTypeService';

describe('assetTypeService', () => {
  describe('detectType', () => {
    // Test null/undefined handling
    test('handles null and undefined inputs', () => {
      expect(assetTypeService.detectType(null)).toBe('unknown');
      expect(assetTypeService.detectType(undefined)).toBe('unknown');
    });

    // Test MIME type string inputs
    test('detects correct type from MIME type strings', () => {
      // Image types
      expect(assetTypeService.detectType('image/jpeg')).toBe('image');
      expect(assetTypeService.detectType('image/png')).toBe('image');
      expect(assetTypeService.detectType('image/svg+xml')).toBe('image');
      
      // Video types
      expect(assetTypeService.detectType('video/mp4')).toBe('video');
      expect(assetTypeService.detectType('video/webm')).toBe('video');
      
      // Audio types
      expect(assetTypeService.detectType('audio/mpeg')).toBe('audio');
      expect(assetTypeService.detectType('audio/wav')).toBe('audio');
      
      // PDF type
      expect(assetTypeService.detectType('application/pdf')).toBe('pdf');
      
      // Document types
      expect(assetTypeService.detectType('application/msword')).toBe('document');
      expect(assetTypeService.detectType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
      expect(assetTypeService.detectType('text/plain')).toBe('document');
      
      // Spreadsheet types
      expect(assetTypeService.detectType('application/vnd.ms-excel')).toBe('spreadsheet');
      expect(assetTypeService.detectType('application/excel')).toBe('spreadsheet');
      expect(assetTypeService.detectType('text/csv')).toBe('spreadsheet');
      
      // 3D model types
      expect(assetTypeService.detectType('model/gltf-binary')).toBe('model');
      expect(assetTypeService.detectType('model/obj')).toBe('model');
      
      // Unknown types
      expect(assetTypeService.detectType('application/octet-stream')).toBe('unknown');
    });
    
    // Test File object inputs
    test('detects correct type from File objects', () => {
      const imageFile = new File([''], 'image.jpg', { type: 'image/jpeg' });
      const pdfFile = new File([''], 'document.pdf', { type: 'application/pdf' });
      const docFile = new File([''], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      expect(assetTypeService.detectType(imageFile)).toBe('image');
      expect(assetTypeService.detectType(pdfFile)).toBe('pdf');
      expect(assetTypeService.detectType(docFile)).toBe('document');
    });
    
    // Test asset object inputs with type field
    test('detects correct type from asset objects with type field', () => {
      expect(assetTypeService.detectType({ type: 'image/jpeg' })).toBe('image');
      expect(assetTypeService.detectType({ asset_type: 'video' })).toBe('video');
      expect(assetTypeService.detectType({ content_type: 'audio/mp3' })).toBe('audio');
      expect(assetTypeService.detectType({ mime_type: 'application/pdf' })).toBe('pdf');
    });
    
    // Test nested File objects
    test('detects correct type from objects with nested file', () => {
      const assetWithNestedFile = {
        name: 'test.jpg',
        file: new File([''], 'image.jpg', { type: 'image/jpeg' })
      };
      
      expect(assetTypeService.detectType(assetWithNestedFile)).toBe('image');
    });
    
    // Test URL detection fallback
    test('detects correct type from objects with URL but no type', () => {
      expect(assetTypeService.detectType({ url: 'https://example.com/image.jpg' })).toBe('image');
      expect(assetTypeService.detectType({ file_url: 'https://example.com/video.mp4' })).toBe('video');
      expect(assetTypeService.detectType({ file: '/path/to/document.pdf' })).toBe('pdf');
    });
  });
  
  describe('detectTypeFromExtension', () => {
    // Test null/undefined handling
    test('handles null and undefined inputs', () => {
      expect(assetTypeService.detectTypeFromExtension(null as unknown as string)).toBe('unknown');
      expect(assetTypeService.detectTypeFromExtension(undefined as unknown as string)).toBe('unknown');
      expect(assetTypeService.detectTypeFromExtension('')).toBe('unknown');
    });
    
    // Test image extensions
    test('detects image extensions correctly', () => {
      expect(assetTypeService.detectTypeFromExtension('image.jpg')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('image.jpeg')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('image.png')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('image.gif')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('image.svg')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('image.webp')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('image.bmp')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('image.tiff')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('image.ico')).toBe('image');
    });
    
    // Test video extensions
    test('detects video extensions correctly', () => {
      expect(assetTypeService.detectTypeFromExtension('video.mp4')).toBe('video');
      expect(assetTypeService.detectTypeFromExtension('video.webm')).toBe('video');
      expect(assetTypeService.detectTypeFromExtension('video.mov')).toBe('video');
      expect(assetTypeService.detectTypeFromExtension('video.avi')).toBe('video');
      expect(assetTypeService.detectTypeFromExtension('video.wmv')).toBe('video');
      expect(assetTypeService.detectTypeFromExtension('video.mkv')).toBe('video');
    });
    
    // Test audio extensions
    test('detects audio extensions correctly', () => {
      expect(assetTypeService.detectTypeFromExtension('audio.mp3')).toBe('audio');
      expect(assetTypeService.detectTypeFromExtension('audio.wav')).toBe('audio');
      expect(assetTypeService.detectTypeFromExtension('audio.ogg')).toBe('audio');
      expect(assetTypeService.detectTypeFromExtension('audio.flac')).toBe('audio');
      expect(assetTypeService.detectTypeFromExtension('audio.aac')).toBe('audio');
    });
    
    // Test PDF extension
    test('detects PDF extension correctly', () => {
      expect(assetTypeService.detectTypeFromExtension('document.pdf')).toBe('pdf');
    });
    
    // Test 3D model extensions
    test('detects 3D model extensions correctly', () => {
      expect(assetTypeService.detectTypeFromExtension('model.obj')).toBe('model');
      expect(assetTypeService.detectTypeFromExtension('model.stl')).toBe('model');
      expect(assetTypeService.detectTypeFromExtension('model.glb')).toBe('model');
      expect(assetTypeService.detectTypeFromExtension('model.gltf')).toBe('model');
      expect(assetTypeService.detectTypeFromExtension('model.fbx')).toBe('model');
    });
    
    // Test spreadsheet extensions
    test('detects spreadsheet extensions correctly', () => {
      expect(assetTypeService.detectTypeFromExtension('data.xlsx')).toBe('spreadsheet');
      expect(assetTypeService.detectTypeFromExtension('data.xls')).toBe('spreadsheet');
      expect(assetTypeService.detectTypeFromExtension('data.csv')).toBe('spreadsheet');
      expect(assetTypeService.detectTypeFromExtension('data.numbers')).toBe('spreadsheet');
      expect(assetTypeService.detectTypeFromExtension('data.ods')).toBe('spreadsheet');
    });
    
    // Test document extensions
    test('detects document extensions correctly', () => {
      expect(assetTypeService.detectTypeFromExtension('document.docx')).toBe('document');
      expect(assetTypeService.detectTypeFromExtension('document.doc')).toBe('document');
      expect(assetTypeService.detectTypeFromExtension('document.rtf')).toBe('document');
      expect(assetTypeService.detectTypeFromExtension('document.txt')).toBe('document');
      expect(assetTypeService.detectTypeFromExtension('document.md')).toBe('document');
      expect(assetTypeService.detectTypeFromExtension('presentation.pptx')).toBe('document');
      expect(assetTypeService.detectTypeFromExtension('presentation.ppt')).toBe('document');
    });
    
    // Test URLs
    test('detects extensions from URLs correctly', () => {
      expect(assetTypeService.detectTypeFromExtension('https://example.com/image.jpg')).toBe('image');
      expect(assetTypeService.detectTypeFromExtension('https://example.com/path/to/document.pdf')).toBe('pdf');
      expect(assetTypeService.detectTypeFromExtension('https://example.com/data.xlsx?query=param')).toBe('spreadsheet');
    });
    
    // Test unknown extensions
    test('returns unknown for unrecognized extensions', () => {
      expect(assetTypeService.detectTypeFromExtension('unknown.xyz')).toBe('unknown');
      expect(assetTypeService.detectTypeFromExtension('noextension')).toBe('unknown');
    });
  });
  
  describe('isImageType', () => {
    test('correctly identifies image types', () => {
      expect(assetTypeService.isImageType('image')).toBe(true);
      expect(assetTypeService.isImageType('IMAGE')).toBe(true);
      expect(assetTypeService.isImageType('image/jpeg')).toBe(true);
      expect(assetTypeService.isImageType('image/png')).toBe(true);
      
      expect(assetTypeService.isImageType('video')).toBe(false);
      expect(assetTypeService.isImageType('document')).toBe(false);
      expect(assetTypeService.isImageType('pdf')).toBe(false);
      expect(assetTypeService.isImageType('')).toBe(false);
      expect(assetTypeService.isImageType(null as unknown as string)).toBe(false);
    });
    
    test('correctly identifies image types from objects', () => {
      expect(assetTypeService.isImageType({ type: 'image' })).toBe(true);
      expect(assetTypeService.isImageType({ content_type: 'image/png' })).toBe(true);
      expect(assetTypeService.isImageType({ url: 'https://example.com/image.jpg' })).toBe(true);
      
      expect(assetTypeService.isImageType({ type: 'video' })).toBe(false);
      expect(assetTypeService.isImageType({ url: 'https://example.com/document.pdf' })).toBe(false);
    });
  });
  
  describe('isImageAsset', () => {
    test('correctly identifies image assets', () => {
      // Image assets
      expect(assetTypeService.isImageAsset({ type: 'image' })).toBe(true);
      expect(assetTypeService.isImageAsset({ asset_type: 'image/jpeg' })).toBe(true);
      expect(assetTypeService.isImageAsset({ content_type: 'image/png' })).toBe(true);
      expect(assetTypeService.isImageAsset({ url: 'https://example.com/image.jpg' })).toBe(true);
      expect(assetTypeService.isImageAsset(new File([''], 'image.jpg', { type: 'image/jpeg' }))).toBe(true);
      
      // Non-image assets
      expect(assetTypeService.isImageAsset({ type: 'video' })).toBe(false);
      expect(assetTypeService.isImageAsset({ url: 'https://example.com/document.pdf' })).toBe(false);
      expect(assetTypeService.isImageAsset(new File([''], 'document.pdf', { type: 'application/pdf' }))).toBe(false);
      expect(assetTypeService.isImageAsset(null)).toBe(false);
    });
  });
}); 