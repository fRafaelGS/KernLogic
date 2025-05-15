import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, ListChecks } from 'lucide-react'

interface RequiredAttributesCardProps {
  mandatoryAttributes: string[]
  attributesMissingCount: number
  loading: boolean
}

export function RequiredAttributesCard({ mandatoryAttributes, attributesMissingCount, loading }: RequiredAttributesCardProps) {
  const navigate = useNavigate()
  const requiredCount = mandatoryAttributes?.length || 0

  return (
    <Card className='bg-white border-enterprise-200 shadow-sm hover:shadow-md transition-all h-full'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200'>Required Attributes</CardTitle>
      </CardHeader>
      <CardContent className='pt-2'>
        {loading ? (
          <div className='space-y-3'>
            <Skeleton className='h-6 w-2/3 rounded' />
            <Skeleton className='h-6 w-1/2 rounded' />
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-2 text-enterprise-800 text-base font-medium'>
              <ListChecks className='h-5 w-5 text-primary-600' />
              {requiredCount} required fields
            </div>
            <div className='flex items-center gap-2 text-enterprise-700 text-base'>
              <AlertTriangle className='h-5 w-5 text-warning-500' />
              {attributesMissingCount} products incomplete
            </div>
            <Button
              variant='link'
              className='p-0 text-primary-600 text-sm font-medium w-fit mt-1'
              onClick={() => navigate('/app/products?completeness_lt=100')}
              tabIndex={0}
              aria-label='View incomplete products'
            >
              View incomplete products
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 