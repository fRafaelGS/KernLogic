import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw } from 'lucide-react'
import type { ReportFiltersState } from '@/features/reports/components/filters/ReportFilters'
import { useMissingAttributesHeatmap } from '@/hooks'
import logger from '@/lib/logger'

interface MissingAttributesHeatmapCardProps {
  filters: ReportFiltersState
}

/**
 * Card that displays a heatmap of missing attributes by attribute group and locale
 */
const MissingAttributesHeatmapCard: React.FC<MissingAttributesHeatmapCardProps> = ({ filters }) => {
  // Fetch data using our custom hook
  const { data, isLoading, isError, error, refetch } = useMissingAttributesHeatmap(filters)

  // Helper to get locale display name
  const getLocaleName = (localeCode: string) => {
    const localeMap: Record<string, string> = {
      'fr_FR': 'French',
      'es_ES': 'Spanish',
      'de_DE': 'German',
      'it_IT': 'Italian',
      'nl_NL': 'Dutch',
      'pt_BR': 'Portuguese',
      'ja_JP': 'Japanese',
      'zh_CN': 'Chinese',
      'ru_RU': 'Russian'
    }
    return localeMap[localeCode] || localeCode
  }

  // Extract unique attribute groups and locales for the grid
  const { groups, locales } = useMemo(() => {
    // Make sure data exists and is an array before trying to use array methods
    if (!data || !Array.isArray(data) || data.length === 0) {
      if (data && !Array.isArray(data)) {
        logger.error('Heatmap data is not an array:', data)
      }
      return { groups: [], locales: [] }
    }
    
    try {
      const uniqueGroups = Array.from(new Set(data.map(item => item.attribute_group)))
        .sort((a, b) => a.localeCompare(b))
      
      const uniqueLocales = Array.from(new Set(data.map(item => item.locale)))
        .sort((a, b) => a.localeCompare(b))
        
      return { 
        groups: uniqueGroups,
        locales: uniqueLocales
      }
    } catch (err) {
      logger.error('Error processing heatmap data:', err)
      return { groups: [], locales: [] }
    }
  }, [data])

  // Calculate the number of placeholders for the loading state
  const placeholderCount = 15 // Show a reasonable number of placeholders while loading

  // Check if we have valid data to display
  const hasValidData = Array.isArray(data) && data.length > 0 && groups.length > 0 && locales.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Missing Attributes by Group and Locale</CardTitle>
        <CardDescription>
          Heatmap showing translation completion rates by attribute group and locale
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Loading state - Grid of skeletons
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: placeholderCount }).map((_, index) => (
              <Skeleton 
                key={index} 
                className="h-[120px] rounded-md"
                data-testid="skeleton"
              />
            ))}
          </div>
        ) : isError ? (
          // Error state
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading heatmap data</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>There was a problem fetching the missing attributes data.</p>
              {error instanceof Error && (
                <p className="text-xs opacity-80">{error.message}</p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-fit mt-2"
                onClick={() => refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : hasValidData ? (
          // Heatmap grid
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group} className="mb-4">
                <div className="text-sm font-medium mb-2">{group}</div>
                <div 
                  className="grid gap-1" 
                  style={{
                    gridTemplateColumns: `repeat(${locales.length || 1}, minmax(120px, 1fr))`
                  }}
                >
                  {locales.map(loc => {
                    const cell = data.find(d => 
                      d.attribute_group === group && d.locale === loc
                    )
                    
                    const pct = cell?.translated_pct ?? 0
                    const color = pct > 80 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : pct > 50 
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                    
                    return (
                      <div
                        key={loc}
                        className={`${color} h-14 flex flex-col items-center justify-center p-2 border rounded-sm`}
                        title={`${getLocaleName(loc)}: ${pct.toFixed(1)}% (${cell?.translated}/${cell?.total})`}
                      >
                        <div className="text-xs mb-1">{getLocaleName(loc)}</div>
                        <div className="font-medium">{pct.toFixed(0)}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // No data state
          <div className="text-center p-8 text-gray-500">
            No heatmap data available. Try adjusting your filters.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MissingAttributesHeatmapCard 