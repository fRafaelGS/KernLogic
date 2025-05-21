import React, { useState } from 'react'
import { 
  Download, CheckCircle2, MoreHorizontal, Archive, Tag as TagIcon, X, Pencil
} from 'lucide-react'
import { format } from 'date-fns'
import { 
  Card, CardContent
} from '@/domains/core/components/ui/card'
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/domains/core/components/ui/dropdown-menu'
import { Button } from '@/domains/core/components/ui/button'
import { Badge } from '@/domains/core/components/ui/badge'
import { cn } from '@/lib/utils'
import { ProductAsset, productService } from '@/services/productService'
import { TagInput } from '@/domains/core/components/ui/tag-input'
import { Input } from '@/domains/core/components/ui/input'
import { formatFileSize } from '@/utils/formatFileSize'
import { config } from '@/config/config'


// Local implementation of asset type detection to avoid circular dependencies
const localAssetTypeService = {
  isImageAsset(asset: any): boolean {
    if (!asset) return false;
    
    // Check for content_type or type
    const type = asset.content_type || asset.type || '';
    if (type && type.toLowerCase().startsWith('image/')) {
      return true;
    }
    
    // Check URL extension if available
    const url = asset.url || '';
    if (url && typeof url === 'string') {
      const extension = url.split('.').pop()?.toLowerCase() || '';
      return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff', 'ico', 'heic', 'avif'].includes(extension);
    }
    
    return false;
  }
};

interface AssetCardProps {
  asset: ProductAsset
  productId: number
  onAssetUpdated: (updatedAsset: ProductAsset) => void
  onMakePrimary: (asset: ProductAsset) => void
  onDelete: (assetId: number) => void
  onArchive: (assetId: number) => void
  onDownload: (asset: ProductAsset) => void
  isImageAsset?: (asset?: ProductAsset) => boolean
  getAssetIcon: (type: string) => React.ReactNode
  getFileType: (asset: ProductAsset) => string
  onRename?: (asset: ProductAsset) => void
  isSelected?: boolean
  onSelect?: (assetId: number) => void
}

export function AssetCard({
  asset,
  productId,
  onAssetUpdated,
  onMakePrimary,
  onDelete,
  onArchive,
  onDownload,
  isImageAsset,
  getAssetIcon,
  getFileType,
  onRename,
  isSelected = false,
  onSelect
}: AssetCardProps) {
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [tags, setTags] = useState<string[]>(
    Array.isArray(asset.tags) ? [...asset.tags] : []
  )
  const [inputValue, setInputValue] = useState('')
  const assetConfig = config.productDetailTabs.assets.assetCard

  // Use the provided isImageAsset function or fall back to our local implementation
  const checkIsImageAsset = (asset?: ProductAsset): boolean => {
    if (!asset) return false;
    
    // If parent component provided this function, use it
    if (isImageAsset) {
      return isImageAsset(asset);
    }
    
    // Otherwise use our local implementation
    return localAssetTypeService.isImageAsset(asset);
  }

  const handleUpdateTags = async () => {
    try {
      // Only proceed if we have actual tags to update or if we're removing all tags
      console.log(`Updating tags for asset ${asset.id} to:`, tags)
      
      // Make a deep copy of the asset with updated tags to use for optimistic update
      const updatedAssetPreview = {
        ...asset,
        tags: [...tags] // Ensure we have a clean copy
      }
      
      // Immediately update the display (optimistic update)
      console.log('Sending optimistic update with:', updatedAssetPreview)
      onAssetUpdated(updatedAssetPreview)
      
      // Explicitly log the API call details
      console.log(`Calling updateAssetTags API for product ${productId}, asset ${asset.id}, with tags:`, [...tags])
      
      // Call the API
      const updatedAsset = await productService.updateAssetTags(productId, asset.id, [...tags])
      
      // Update again with the response from the server
      console.log('API response for updateAssetTags:', updatedAsset)
      onAssetUpdated(updatedAsset)
      
      // Exit edit mode
      setIsEditingTags(false)
      setInputValue('')
    } catch (error) {
      console.error('Failed to update tags:', error)
      // If there's an error, fall back to the original tags
      setTags(Array.isArray(asset.tags) ? [...asset.tags] : [])
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d yyyy')
    } catch (err) {
      return assetConfig.unknown_date
    }
  }

  // Ensure tags is always an array
  const assetTags = Array.isArray(asset.tags) ? asset.tags : []

  return (
    <Card 
      className={cn(
        'overflow-hidden group rounded-md shadow-sm min-w-0 relative',
        asset.is_primary && checkIsImageAsset(asset) && 'ring-1 ring-primary',
        isSelected && 'ring-2 ring-primary bg-primary/5 border-primary border-2'
      )}
    >
      {/* Multi-select checkbox */}
      {typeof isSelected === 'boolean' && onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(asset.id)}
            aria-label={isSelected ? 'Deselect asset' : 'Select asset'}
            className="h-4 w-4 rounded border border-primary focus:ring-2 focus:ring-primary"
          />
        </div>
      )}
      <div className="relative p-1 pb-0">
        {/* Asset preview */}
        <div className="aspect-[4/3] bg-muted flex items-center justify-center rounded-md overflow-hidden p-0 m-0">
          {checkIsImageAsset(asset) ? (
            <img 
              src={asset.url} 
              alt={asset.name || assetConfig.unnamed_asset}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error(`Image load error for ${asset.url}`)
                ;(e.target as HTMLImageElement).src = 'https://placehold.co/600x600?text=Image+Error'
              }}
            />
          ) : (
            <div className="text-center p-3 flex flex-col items-center justify-center h-full">
              {getAssetIcon(asset.type || 'unknown')}
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {getFileType(asset)?.toUpperCase() || assetConfig.unknown}
              </p>
              <p className="text-xs mt-1 max-w-full truncate px-2">
                {asset.name || assetConfig.unnamed}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <CardContent className="p-3 pt-2 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {getAssetIcon(asset.type || 'unknown')}
              <h3 className="text-xs font-medium truncate">{asset.name || assetConfig.unnamed}</h3>
            </div>
            
            {/* Tags display or editor */}
            <div className="mt-1">
              {isEditingTags ? (
                <div className="mb-2">
                  <TagInput
                    id={`asset-tag-editor-${asset.id}`}
                    tags={tags}
                    setTags={setTags}
                    placeholder={assetConfig.add_tags}
                    maxTags={10}
                  />
                  
                  {/* Add a dedicated Add Tag button */}
                  <div className="flex items-center mt-2 mb-1">
                    <Input
                      type="text"
                      placeholder={assetConfig.add_new_tag}
                      className="h-6 px-2 text-xs flex-1"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inputValue.trim()) {
                          e.preventDefault();
                          console.log('Adding tag from explicit input:', inputValue);
                          setTags([...tags, inputValue.trim()]);
                          setInputValue('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs ml-1"
                      onClick={() => {
                        if (inputValue.trim()) {
                          console.log('Adding tag from explicit button:', inputValue);
                          setTags([...tags, inputValue.trim()]);
                          setInputValue('');
                        }
                      }}
                      disabled={!inputValue.trim()}
                    >
                      {assetConfig.add_tag_button}
                    </Button>
                  </div>
                  
                  <div className="flex justify-end gap-1 mt-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        // Reset to original tags and exit edit mode
                        setTags(Array.isArray(asset.tags) ? [...asset.tags] : [])
                        setInputValue('');
                        setIsEditingTags(false)
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      {assetConfig.buttons.cancel}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="primary" 
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        console.log('Save button clicked. Tags to save:', tags);
                        handleUpdateTags();
                      }}
                    >
                      {assetConfig.buttons.save} {tags.length > 0 ? `(${tags.length})` : ''}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {assetTags.length > 0 ? (
                    assetTags.map((tag, index) => (
                      <Badge 
                        key={`${tag}-${index}`} 
                        variant="outline" 
                        className="text-[10px] h-4 px-1 bg-secondary/20"
                      >
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic" onClick={() => {
                      console.log('No tags clicked, entering edit mode');
                      setIsEditingTags(true);
                    }}>{assetConfig.no_tags}</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-1 text-xs text-muted-foreground space-y-1">
              <p className="text-[10px]">{assetConfig.size_label}: {formatFileSize(asset.size)}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px]">{asset.uploaded_at ? formatDate(asset.uploaded_at) : assetConfig.unknown_date}</span>
                <div className="flex-1 flex justify-end items-center">
                  {/* Primary image badge or button */}
                  {asset.is_primary && checkIsImageAsset(asset) ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 h-4 px-1 text-[10px]">
                      <CheckCircle2 className="h-2 w-2 mr-0.5" />
                      {assetConfig.primary_badge}
                    </Badge>
                  ) : checkIsImageAsset(asset) ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="px-1 py-0 h-4 text-[10px] hover:bg-primary/10 hover:text-primary ml-auto"
                      onClick={() => onMakePrimary(asset)}
                    >
                      {assetConfig.set_as_primary}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          
          {/* Asset dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
                <span className="sr-only">{assetConfig.asset_menu}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => onDownload(asset)} className="text-xs">
                <Download className="h-3 w-3 mr-2" />
                {assetConfig.buttons.download}
              </DropdownMenuItem>
              {/* Rename option */}
              {onRename && (
                <DropdownMenuItem onClick={() => onRename(asset)} className="text-xs">
                  <Pencil className="h-3 w-3 mr-2" />
                  {assetConfig.buttons.rename}
                </DropdownMenuItem>
              )}
              {/* Only show Set as Primary for images that aren't already primary */}
              {!asset.is_primary && checkIsImageAsset(asset) && (
                <DropdownMenuItem onClick={() => onMakePrimary(asset)} className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-2" />
                  {assetConfig.set_as_primary}
                </DropdownMenuItem>
              )}
              {/* Edit Tags option */}
              <DropdownMenuItem onClick={() => {
                setTags(Array.isArray(asset.tags) ? [...asset.tags] : [])
                setIsEditingTags(true)
              }} className="text-xs">
                <TagIcon className="h-3 w-3 mr-2" />
                {assetConfig.buttons.edit_tags}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(asset.id)} className="text-xs">
                <Archive className="h-3 w-3 mr-2" />
                {assetConfig.buttons.archive}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
} 