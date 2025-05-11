import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from '@/components/ui/use-toast'

interface BulkDownloadToolbarProps {
  productId: number
  selectedIds: number[]
  disabled?: boolean
  onDownload: () => void
}

export function BulkDownloadToolbar({ productId, selectedIds, disabled, onDownload }: BulkDownloadToolbarProps) {
  const handleClick = useCallback(() => {
    if (selectedIds.length > 100) {
      toast({
        variant: 'default',
        title: 'Large download',
        description: 'You are downloading more than 100 files. This may take a while.'
      })
    }
    if (!disabled) onDownload()
  }, [onDownload, disabled, selectedIds])

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={handleClick}
      disabled={disabled || !selectedIds.length}
      title='Download selected assets as ZIP'
      aria-label='Bulk download assets'
    >
      <Download className='h-4 w-4' />
      <span className='ml-2'>Download ZIP</span>
    </Button>
  )
} 