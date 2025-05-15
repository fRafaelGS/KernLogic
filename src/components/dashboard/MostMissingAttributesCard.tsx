import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle } from 'lucide-react'

interface MostMissingAttributesCardProps {
  mostMissingFields: { field: string; count: number }[]
  loading: boolean
}

export function MostMissingAttributesCard({ mostMissingFields, loading }: MostMissingAttributesCardProps) {
  // Limit to top 5
  const topFields = (mostMissingFields || []).slice(0, 5)
  const hasData = topFields.length > 0

  return (
    <Card className='bg-white border-enterprise-200 shadow-sm hover:shadow-md transition-all h-full'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200'>Most Missing Attributes</CardTitle>
      </CardHeader>
      <CardContent className='pt-2'>
        {loading ? (
          <div className='space-y-3'>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className='h-6 w-full rounded' />
            ))}
          </div>
        ) : hasData ? (
          <ul className='space-y-2'>
            {topFields.map((item, idx) => (
              <TooltipProvider key={item.field}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <li className='flex items-center gap-2 cursor-pointer text-enterprise-800 text-sm font-medium'>
                      <AlertTriangle className='h-4 w-4 text-warning-500' />
                      <span>{item.field} <span className='text-enterprise-500 font-normal'>({item.count})</span></span>
                    </li>
                  </TooltipTrigger>
                  <TooltipContent side='right'>
                    {item.count} products are missing this field
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </ul>
        ) : (
          <div className='text-enterprise-500 text-sm flex items-center gap-2'>
            <AlertTriangle className='h-4 w-4' />
            All required attributes are filled for your products.
          </div>
        )}
      </CardContent>
    </Card>
  )
} 