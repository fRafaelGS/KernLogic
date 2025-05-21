import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/domains/core/components/ui/card'
import { Progress } from '@/domains/core/components/ui/progress'
import { Skeleton } from '@/domains/core/components/ui/skeleton'
import { BarChart2, RefreshCcw } from 'lucide-react'
import { toast } from '@/domains/core/components/ui/use-toast'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useFamilyCompleteness } from '@/hooks/useFamilyCompleteness'

interface MissingField {
  field: string
  count: number
}

interface DataCompletenessCardProps {
  className?: string
  completeness?: number
  mostMissingFields?: MissingField[]
  loading?: boolean
  attributesMissingCount?: number
  mandatoryAttributes?: string[]
}

export function DataCompletenessCard({ 
  className,
  completeness,
  mostMissingFields,
  loading,
  attributesMissingCount,
  mandatoryAttributes
}: DataCompletenessCardProps) {
  const {
    data: familyCompleteness,
    isLoading,
    isError,
    refetch,
    isFetching,
    error
  } = useFamilyCompleteness()

  React.useEffect(() => {
    if (isError && error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load completeness data',
        description: 'Could not fetch family completeness. Please try again.'
      })
    }
  }, [isError, error])

  const hasData = Array.isArray(familyCompleteness) && familyCompleteness.length > 0
  const overall = hasData
    ? Math.round(familyCompleteness.reduce((sum, f) => sum + f.percentage, 0) / familyCompleteness.length)
    : completeness || 0

  const isLoadingData = loading || isLoading || isFetching

  return (
    <Card className={`h-full ${className || ''}`}>
      <CardHeader>
        <CardTitle className='text-base font-semibold'>Data Completeness</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-76px)] overflow-auto">
        <div className='mb-2'>
          <div className='flex items-center justify-between mb-1'>
            <span className='text-sm text-muted-foreground'>Completeness</span>
            <span className='text-sm font-medium'>{overall}%</span>
          </div>
          {isLoadingData ? (
            <Skeleton className='h-3 w-full rounded' />
          ) : (
            <Progress value={overall} className='h-3' />
          )}
        </div>
        <div className='mt-6'>
          <div className='flex items-center gap-2 mb-2'>
            <BarChart2 className='w-4 h-4 text-primary-600' />
            <span className='text-xs font-semibold text-muted-foreground'>Completeness by Family</span>
          </div>
          {isLoadingData ? (
            <div className='h-48 flex items-center justify-center'>
              <Skeleton className='h-40 w-full rounded' />
            </div>
          ) : isError ? (
            <div className='flex flex-col items-center justify-center py-8'>
              <span className='text-destructive mb-2'>Failed to load completeness data</span>
              <button
                className='inline-flex items-center gap-1 px-3 py-1.5 rounded bg-destructive text-white text-xs font-medium hover:bg-destructive/90 transition'
                onClick={() => refetch()}
              >
                <RefreshCcw className='w-4 h-4 mr-1' />
                Retry
              </button>
            </div>
          ) : !hasData ? (
            <div className='flex items-center justify-center h-40 text-muted-foreground text-sm'>
              No data available
            </div>
          ) : (
            <div
              className='h-56 w-full'
              role='img'
              aria-label='Family completeness chart'
            >
              <ResponsiveContainer width='100%' height={220}>
                <BarChart
                  data={familyCompleteness}
                  layout='vertical'
                  margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
                  barCategoryGap={familyCompleteness.length === 1 ? '10%' : 12}
                >
                  <CartesianGrid strokeDasharray='3 3' vertical={false} />
                  <XAxis
                    type='number'
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={v => `${v}%`}
                  />
                  <YAxis
                    dataKey='familyName'
                    type='category'
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f3f4f6' }}
                    formatter={(value: number) => [`${value}% complete`, '']}
                    labelFormatter={label => `Family: ${label}`}
                  />
                  <Bar
                    dataKey='percentage'
                    fill='#2563eb'
                    radius={[4, 4, 4, 4]}
                    isAnimationActive={false}
                    barSize={familyCompleteness.length === 1 ? 40 : undefined}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 