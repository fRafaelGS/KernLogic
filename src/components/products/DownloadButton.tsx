import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useDownloadAsset } from '@/hooks/useDownloadAsset'
import { useCallback } from 'react'

interface DownloadButtonProps {
  productId: number
  assetId: number
  disabled?: boolean
}

export function DownloadButton({ productId, assetId, disabled }: DownloadButtonProps) {
  const { download, isLoading } = useDownloadAsset(productId, assetId)

  const handleClick = useCallback(() => {
    if (!disabled) download()
  }, [download, disabled])

  return (
    <Button
      variant='ghost'
      size='icon'
      onClick={handleClick}
      disabled={isLoading || disabled}
      title='Download asset'
      aria-label='Download asset'
    >
      {isLoading ? (
        <span className='animate-spin h-4 w-4'>
          <Download className='h-4 w-4 opacity-50' />
        </span>
      ) : (
        <Download className='h-4 w-4' />
      )}
    </Button>
  )
} 