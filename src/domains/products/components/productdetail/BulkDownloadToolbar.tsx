import { Button } from '@/domains/core/components/ui/button'
import { Download } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from '@/domains/core/components/ui/use-toast'
import { config } from '@/config/config'

interface BulkDownloadToolbarProps {
  productId: number
  selectedIds: number[]
  disabled?: boolean
  onDownload: () => void
}

export function BulkDownloadToolbar({ productId, selectedIds, disabled, onDownload }: BulkDownloadToolbarProps) {
  const assetConfig = config.productDetailTabs.assets.bulkDownload
  
  const handleClick = useCallback(() => {
    if (selectedIds.length > 100) {
      toast({
        variant: 'default',
        title: assetConfig.large_download.title,
        description: assetConfig.large_download.description
      })
    }
    if (!disabled) onDownload()
  }, [onDownload, disabled, selectedIds, assetConfig])

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={handleClick}
      disabled={disabled || !selectedIds.length}
      title={assetConfig.title}
      aria-label={assetConfig.aria_label}
    >
      <Download className='h-4 w-4' />
      <span className='ml-2'>{assetConfig.button_text}</span>
    </Button>
  )
} 