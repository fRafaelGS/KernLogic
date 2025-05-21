import { useBundleDownload } from '@/domains/products/components/hooks/useBundleDownload'
import { Button } from '@/domains/core/components/ui/button'
import { Card } from '@/domains/core/components/ui/card'
import { CardHeader } from '@/domains/core/components/ui/card'
import { CardTitle } from '@/domains/core/components/ui/card'
import { CardContent } from '@/domains/core/components/ui/card'
import { CardDescription } from '@/domains/core/components/ui/card'
import { Download, Trash2 } from 'lucide-react'
import type { AssetBundle, ProductAsset } from '@/services/productService'
import React from 'react'
import { config } from '@/config/config'

interface BundleCardProps {
  bundle: AssetBundle
  productId: number
  assets: ProductAsset[]
  onDelete: (bundleId: number) => void
  isImageAsset: (asset: ProductAsset) => boolean
  getAssetIcon: (type: string) => JSX.Element
  formatDate: (date: string) => string
}

export function BundleCard({ bundle, productId, assets, onDelete, isImageAsset, getAssetIcon, formatDate }: BundleCardProps) {
  const { download: downloadBundle } = useBundleDownload(productId, bundle.id)
  const bundleAssets = assets.filter(asset => bundle.asset_ids.includes(asset.id))
  const bundleConfig = config.productDetailTabs.assets.bundleCard
  
  return (
    <Card key={bundle.id} className="overflow-hidden rounded-lg shadow min-w-0">
      <CardHeader className="p-6 pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium">{bundle.name}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={downloadBundle}
              title={bundleConfig.download_title}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(bundle.id)}
              title={bundleConfig.delete_title}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(bundle.created_at)}
          </span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {bundleConfig.assets_count.replace('{{count}}', bundle.asset_ids.length.toString())}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-2">
        <div className="flex flex-wrap gap-1">
          {bundleAssets.slice(0, 5).map(asset => (
            <div 
              key={asset.id} 
              className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden"
              title={asset.name}
            >
              {isImageAsset(asset) ? (
                <img 
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                getAssetIcon(asset.type)
              )}
            </div>
          ))}
          {bundle.asset_ids.length > 5 && (
            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs font-medium">
              +{bundle.asset_ids.length - 5}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 