import { useState, useCallback } from 'react'
import axiosInstance from '@/domains/core/lib/axiosInstance'
import { toast } from '@/domains/core/components/ui/use-toast'

export function useBulkDownload() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async (productId: number, assetIds: number[]) => {
    if (!assetIds.length) {
      toast({ variant: 'destructive', title: 'No assets selected' })
      return
    }
    setIsLoading(true)
    setError(null)
    let attempts = 0
    while (attempts < 3) {
      try {
        const res = await axiosInstance.post(`/api/products/${productId}/assets/bulk-download/`,
          { assetIds },
          { responseType: 'blob' }
        )
        const contentDisposition = res.headers['content-disposition'] || ''
        const match = contentDisposition.match(/filename="(.+)"/)
        const filename = match ? match[1] : `assets-bulk.zip`
        const url = window.URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)
        toast({ title: 'Download started', description: filename })
        setIsLoading(false)
        return
      } catch (err: any) {
        attempts++
        if (attempts >= 3) {
          setError('Failed to download assets')
          toast({ variant: 'destructive', title: 'Bulk download failed', description: err?.message || 'Network error' })
          setIsLoading(false)
          return
        }
      }
    }
  }, [])

  return { download, isLoading, error }
} 