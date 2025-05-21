import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/domains/core/components/ui/card'
import { Skeleton } from '@/domains/core/components/ui/skeleton'
import { AlertTriangle, Info } from 'lucide-react'

interface MissingField {
  field: string
  count: number
}

interface MostMissingAttributesCardProps {
  mostMissingFields: MissingField[]
  loading: boolean
  className?: string
}

export function MostMissingAttributesCard({ 
  mostMissingFields, 
  loading, 
  className 
}: MostMissingAttributesCardProps) {
  // Prepare top 10, split into two columns
  const topFields = (mostMissingFields || []).slice(0, 10)
  const col1 = topFields.slice(0, Math.ceil(topFields.length / 2))
  const col2 = topFields.slice(Math.ceil(topFields.length / 2))

  return (
    <Card className={`h-full ${className || ''}`}>
      <CardHeader>
        <CardTitle className='text-base font-semibold'>Most Missing Attributes</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-76px)] overflow-auto">
              {loading ? (
          <ul
            role="list"
            className="grid grid-cols-2 gap-x-4 gap-y-3"
          >
            {Array.from({ length: topFields.length || 10 }).map((_, idx) => (
              <li
                key={idx}
                role="listitem"
                className="h-full flex items-center gap-2"
              >
                <Skeleton className="h-5 w-full rounded" />
              </li>
            ))}
          </ul>
        ) : topFields.length === 0 ? (
          <div className='flex items-center gap-2 text-muted-foreground py-4'>
            <Info className='w-5 h-5' />
            <span>All attributes are filled</span>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-8' role='list'>
            {[col1, col2].map((col, colIdx) => (
              <ul key={colIdx} className='space-y-16'>
                {col.map((f: MissingField, i: number) => (
                  <li
                    key={f.field}
                    role='listitem'
                    tabIndex={0}
                    className='flex items-center gap-2 rounded px-2 py-1 bg-yellow-50 border border-yellow-200 text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-400'
                  >
                    <AlertTriangle className='w-4 h-4 text-yellow-500 shrink-0' />
                    <span className='truncate font-medium'>{f.field}</span>
                    <span className='ml-auto text-xs text-yellow-700 font-semibold'>({f.count})</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 