import { assetTypeService } from '../../services/assetTypeService'

describe('AssetTypeService Image Detection', () => {
  test('correctly identifies image assets from ProductAsset objects', () => {
    // Test with various product asset formats
    const imageAsset1 = { 
      id: 1, 
      type: 'image', 
      url: 'https://example.com/image.jpg',
      name: 'test-image.jpg'
    }
    
    const imageAsset2 = { 
      id: 2, 
      content_type: 'image/png', 
      file_url: 'https://example.com/image.png',
      name: 'test-image.png'
    }
    
    const imageAsset3 = { 
      id: 3, 
      asset_type: 'image/jpeg', 
      file: 'https://example.com/image.jpeg',
      name: 'test-image.jpeg'
    }
    
    // Asset with image extension but no type
    const imageAsset4 = { 
      id: 4, 
      url: 'https://example.com/image-no-type.jpg',
      name: 'image-no-type.jpg'
    }
    
    // Non-image assets
    const pdfAsset = { 
      id: 5, 
      type: 'pdf', 
      url: 'https://example.com/document.pdf',
      name: 'test-document.pdf'
    }
    
    const videoAsset = { 
      id: 6, 
      content_type: 'video/mp4', 
      file_url: 'https://example.com/video.mp4',
      name: 'test-video.mp4'
    }
    
    // Test image assets are correctly identified
    expect(assetTypeService.isImageAsset(imageAsset1)).toBe(true)
    expect(assetTypeService.isImageAsset(imageAsset2)).toBe(true)
    expect(assetTypeService.isImageAsset(imageAsset3)).toBe(true)
    expect(assetTypeService.isImageAsset(imageAsset4)).toBe(true)
    
    // Test non-image assets are correctly identified
    expect(assetTypeService.isImageAsset(pdfAsset)).toBe(false)
    expect(assetTypeService.isImageAsset(videoAsset)).toBe(false)
    
    // Test edge cases
    expect(assetTypeService.isImageAsset(null as any)).toBe(false)
    expect(assetTypeService.isImageAsset(undefined as any)).toBe(false)
    expect(assetTypeService.isImageAsset({} as any)).toBe(false)
  })

  test('detects image types from strings', () => {
    // MIME types
    expect(assetTypeService.isImageType('image')).toBe(true)
    expect(assetTypeService.isImageType('image/jpeg')).toBe(true)
    expect(assetTypeService.isImageType('image/png')).toBe(true)
    
    // Case insensitivity
    expect(assetTypeService.isImageType('IMAGE')).toBe(true)
    expect(assetTypeService.isImageType('Image/PNG')).toBe(true)
    
    // Non-image types
    expect(assetTypeService.isImageType('video')).toBe(false)
    expect(assetTypeService.isImageType('application/pdf')).toBe(false)
    expect(assetTypeService.isImageType('text/plain')).toBe(false)
    
    // Edge cases
    expect(assetTypeService.isImageType('')).toBe(false)
    expect(assetTypeService.isImageType(null as any)).toBe(false)
  })

  test('detects correct asset types from file extensions', () => {
    // Image file extensions
    expect(assetTypeService.detectTypeFromExtension('test.jpg')).toBe('image')
    expect(assetTypeService.detectTypeFromExtension('test.png')).toBe('image')
    expect(assetTypeService.detectTypeFromExtension('test.gif')).toBe('image')
    expect(assetTypeService.detectTypeFromExtension('test.svg')).toBe('image')
    expect(assetTypeService.detectTypeFromExtension('test.webp')).toBe('image')
    
    // Image URLs
    expect(assetTypeService.detectTypeFromExtension('https://example.com/image.jpg')).toBe('image')
    expect(assetTypeService.detectTypeFromExtension('https://example.com/path/to/image.png?width=100')).toBe('image')
    
    // Other file types
    expect(assetTypeService.detectTypeFromExtension('document.pdf')).toBe('pdf')
    expect(assetTypeService.detectTypeFromExtension('video.mp4')).toBe('video')
    expect(assetTypeService.detectTypeFromExtension('audio.mp3')).toBe('audio')
    expect(assetTypeService.detectTypeFromExtension('spreadsheet.xlsx')).toBe('spreadsheet')
    expect(assetTypeService.detectTypeFromExtension('model.obj')).toBe('model')
    
    // Unknown extensions
    expect(assetTypeService.detectTypeFromExtension('unknown.xyz')).toBe('unknown')
    expect(assetTypeService.detectTypeFromExtension('noextension')).toBe('unknown')
  })
}) 