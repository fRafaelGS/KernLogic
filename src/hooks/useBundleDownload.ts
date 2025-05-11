import { useState, useCallback } from 'react'
import axiosInstance from '@/lib/axiosInstance'
import { toast } from '@/components/ui/use-toast'

export function useBundleDownload(productId: number, bundleId: number) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    let attempts = 0
    while (attempts < 3) {
      try {
        const res = await axiosInstance.get(`/api/products/${productId}/asset-bundles/${bundleId}/download/`, {
          responseType: 'blob'
        })
        const contentDisposition = res.headers['content-disposition'] || ''
        const match = contentDisposition.match(/filename="(.+)"/)
        const filename = match ? match[1] : `bundle-${bundleId}.zip`
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
          setError('Failed to download bundle')
          toast({ variant: 'destructive', title: 'Bundle download failed', description: err?.message || 'Network error' })
          setIsLoading(false)
          return
        }
      }
    }
  }, [productId, bundleId])

  return { download, isLoading, error }
} 