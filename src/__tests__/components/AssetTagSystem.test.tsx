import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AssetCard } from '@/components/products/AssetCard'
import { ProductAsset, productService } from '@/services/productService'

// Mock the productService
jest.mock('@/services/productService', () => ({
  productService: {
    updateAssetTags: jest.fn().mockResolvedValue({
      id: 1,
      name: 'test-asset.jpg',
      tags: ['updated', 'tags']
    })
  }
}))

describe('Asset Tag System', () => {
  const mockAsset: ProductAsset = {
    id: 1,
    name: 'test-asset.jpg',
    type: 'image',
    url: 'https://example.com/test.jpg',
    size: '1024',
    uploaded_by: 'Test User',
    uploaded_at: '2023-01-01T00:00:00Z',
    tags: ['test', 'image']
  }

  const mockProductId = 123
  const mockOnAssetUpdated = jest.fn()
  const mockOnMakePrimary = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnArchive = jest.fn()
  const mockOnDownload = jest.fn()
  const mockIsImageAsset = jest.fn().mockReturnValue(true)
  const mockGetAssetIcon = jest.fn().mockReturnValue(<span>Icon</span>)
  const mockGetFileType = jest.fn().mockReturnValue('image')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders asset with tags', () => {
    render(
      <AssetCard
        asset={mockAsset}
        productId={mockProductId}
        onAssetUpdated={mockOnAssetUpdated}
        onMakePrimary={mockOnMakePrimary}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
        onDownload={mockOnDownload}
        isImageAsset={mockIsImageAsset}
        getAssetIcon={mockGetAssetIcon}
        getFileType={mockGetFileType}
      />
    )

    // Check if tags are displayed
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('image')).toBeInTheDocument()
  })

  test('opens tag editor when Edit Tags is clicked', async () => {
    render(
      <AssetCard
        asset={mockAsset}
        productId={mockProductId}
        onAssetUpdated={mockOnAssetUpdated}
        onMakePrimary={mockOnMakePrimary}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
        onDownload={mockOnDownload}
        isImageAsset={mockIsImageAsset}
        getAssetIcon={mockGetAssetIcon}
        getFileType={mockGetFileType}
      />
    )

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /asset menu/i })
    fireEvent.click(menuButton)
    
    // Click on Edit Tags option
    const editTagsOption = await screen.findByText('Edit Tags')
    fireEvent.click(editTagsOption)
    
    // Check if TagInput is displayed (by finding the input element)
    const tagInput = await screen.findByPlaceholderText('Add tags...')
    expect(tagInput).toBeInTheDocument()
    
    // Check if Save button is displayed
    const saveButton = screen.getByText('Save')
    expect(saveButton).toBeInTheDocument()
  })

  test('updates tags when saving the tag editor', async () => {
    render(
      <AssetCard
        asset={mockAsset}
        productId={mockProductId}
        onAssetUpdated={mockOnAssetUpdated}
        onMakePrimary={mockOnMakePrimary}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
        onDownload={mockOnDownload}
        isImageAsset={mockIsImageAsset}
        getAssetIcon={mockGetAssetIcon}
        getFileType={mockGetFileType}
      />
    )

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /asset menu/i })
    fireEvent.click(menuButton)
    
    // Click on Edit Tags option
    const editTagsOption = await screen.findByText('Edit Tags')
    fireEvent.click(editTagsOption)
    
    // Find the Save button and click it
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    // Verify that productService.updateAssetTags was called with correct parameters
    await waitFor(() => {
      expect(productService.updateAssetTags).toHaveBeenCalledWith(
        mockProductId,
        mockAsset.id,
        mockAsset.tags
      )
    })
    
    // Verify that onAssetUpdated callback was called
    await waitFor(() => {
      expect(mockOnAssetUpdated).toHaveBeenCalled()
    })
  })

  test('cancels editing tags when Cancel is clicked', async () => {
    render(
      <AssetCard
        asset={mockAsset}
        productId={mockProductId}
        onAssetUpdated={mockOnAssetUpdated}
        onMakePrimary={mockOnMakePrimary}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
        onDownload={mockOnDownload}
        isImageAsset={mockIsImageAsset}
        getAssetIcon={mockGetAssetIcon}
        getFileType={mockGetFileType}
      />
    )

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /asset menu/i })
    fireEvent.click(menuButton)
    
    // Click on Edit Tags option
    const editTagsOption = await screen.findByText('Edit Tags')
    fireEvent.click(editTagsOption)
    
    // Find the Cancel button and click it
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    // Verify that we're back to viewing mode (tags are visible)
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('image')).toBeInTheDocument()
    
    // Verify that updateAssetTags was not called
    expect(productService.updateAssetTags).not.toHaveBeenCalled()
  })
}) 