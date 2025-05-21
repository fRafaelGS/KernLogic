import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
} from '@/domains/core/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/domains/core/components/ui/table'
import { Button } from '@/domains/core/components/ui/button'
import { Progress } from '@/domains/core/components/ui/progress'
import { Skeleton } from '@/domains/core/components/ui/skeleton'
import { AlertCircle, ArrowUpRight, RefreshCcw } from 'lucide-react'
import { useTopIncompleteProducts } from '@/hooks/useTopIncompleteProducts'

interface TopIncompleteProductsCardProps {
  className?: string
}

export function TopIncompleteProductsCard({ className }: TopIncompleteProductsCardProps) {
  const navigate = useNavigate()
  const { data: products, isLoading, isError, refetch } = useTopIncompleteProducts()

  // Generate skeletons for loading state
  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
        <TableCell>
          <Skeleton className="h-5 w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-14" />
        </TableCell>
        <TableCell className="w-[140px]">
          <Skeleton className="h-5 w-full" />
        </TableCell>
      </TableRow>
    ))
  }

  const handleRowClick = (productId: number) => {
    navigate(`/app/products/${productId}`)
  }

  return (
    <Card className={`h-full ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base uppercase tracking-wider">Top Incomplete Products</CardTitle>
          <CardDescription className="text-muted-foreground">
            Products with missing required information
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="h-[calc(100%-76px)] overflow-auto">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="text-destructive mb-2 h-8 w-8" />
            <p className="text-destructive mb-4">Failed to load incomplete products</p>
            <Button 
              variant="destructive" 
              onClick={() => refetch()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Completeness</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderSkeletons()}
            </TableBody>
          </Table>
        ) : products?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            All products have complete information 👍
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Completeness</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow 
                  key={product.id}
                  onClick={() => handleRowClick(product.id)}
                  className="cursor-pointer hover:bg-muted"
                >
                  <TableCell className="font-medium truncate max-w-[180px]">
                    {product.name || 'Unnamed Product'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.sku}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full max-w-[100px]">
                        <Progress value={product.completeness} className="h-2" />
                      </div>
                      <span className="text-sm min-w-[40px]">{product.completeness}%</span>
                      <span className="text-xs text-muted-foreground">
                        Missing: {product.missingCount}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Example usage in a dashboard layout:
/*
import { TopIncompleteProductsCard } from '@/components/dashboard/TopIncompleteProductsCard'

export function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-2">
        <TopIncompleteProductsCard />
      </div>
      {/* Other dashboard cards *//*}
    </div>
  )
}
*/ 