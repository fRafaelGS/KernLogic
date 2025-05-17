import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton' 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { ReportFiltersState } from '@/features/reports/components/filters/ReportFilters'
import { IncompleteProduct } from '@/services/dashboardService'
import { useIncompleteProducts } from '@/hooks/useIncompleteProducts'

interface MissingAttributesHeatmapCardProps {
  filters?: ReportFiltersState
}

/**
 * Card component that displays a heatmap of missing attributes by family 
 */
const MissingAttributesHeatmapCard: React.FC<MissingAttributesHeatmapCardProps> = ({ filters }) => {
  const { data = [], isLoading, isError, error, refetch } = useIncompleteProducts(filters)
  
  // Process incomplete products data to build heatmap data structure
  const heatmapData = useMemo(() => {
    const families = new Set<string>()
    const attributes = new Set<string>()
    const counts: Record<string, Record<string, number>> = {}
    
    // Log the first product to debug its structure
    if (data.length > 0) {
      console.log('Product object structure:', {
        product: data[0],
        hasFamily: !!data[0].family,
        familyType: data[0].family ? typeof data[0].family : 'N/A',
        familyName: data[0].family?.name,
        keys: Object.keys(data[0])
      })
    }
    
    // Extract all unique families and attributes
    data.forEach(product => {
      // Extract family name with fallbacks
      let familyName = 'Unknown'
      let familySource = 'fallback'
      
      // Approach 1: Try to get from family object if available
      if (product.family && typeof product.family === 'object' && product.family.name) {
        familyName = product.family.name
        familySource = 'family.name'
      } 
      // Try to get from family if it's a string directly
      else if (product.family && typeof product.family === 'string') {
        familyName = product.family as unknown as string
        familySource = 'family(string)'
      }
      // Approach 2: Check if there's a family-related property on the product using type assertion
      else if ('familyName' in product && typeof (product as any).familyName === 'string') {
        familyName = (product as any).familyName
        familySource = 'familyName'
      }
      // Look for family_name
      else if ('family_name' in product && typeof (product as any).family_name === 'string') {
        familyName = (product as any).family_name
        familySource = 'family_name'
      }
      // Approach 3: Extract from SKU if it follows a pattern
      else if (product.sku && product.sku.includes('-')) {
        familyName = product.sku.split('-')[0]
        familySource = 'sku'
      }
      // Approach 4: Use product name if all else fails and it's better than 'Unknown'
      else if (product.name && familyName === 'Unknown') {
        // Try to extract a meaningful name from the product name
        const nameParts = product.name.split(' ')
        if (nameParts.length > 0) {
          familyName = nameParts[0]
          familySource = 'name'
        }
      }
      
      // Add source to name for debugging if it's not from family.name
      if (familySource !== 'family.name' && familyName !== 'Unknown') {
        familyName = `${familyName} (${familySource})`
      }
      
      families.add(familyName)
      
      // Initialize family in counts if not present
      if (!counts[familyName]) {
        counts[familyName] = {}
      }
      
      // Count occurrences of missing attributes per family
      product.missing_fields?.forEach(field => {
        if (!field.field) return
        
        const attrName = field.field
        attributes.add(attrName)
        
        if (!counts[familyName][attrName]) {
          counts[familyName][attrName] = 0
        }
        
        counts[familyName][attrName]++
      })
    })
    
    return {
      families: Array.from(families),
      attributes: Array.from(attributes),
      counts
    }
  }, [data])
  
  // Define color intensity based on count
  const getColor = (count: number, max: number) => {
    if (count === 0) return '#f8f9fa' // Light gray for zero
    
    // Calculate intensity (0.2 to 1.0)
    const intensity = 0.2 + (0.8 * Math.min(count / max, 1))
    
    // Return color with calculated intensity
    return `rgba(220, 53, 69, ${intensity})`
  }
  
  // Find maximum count for color scaling
  const maxCount = useMemo(() => {
    let max = 0
    
    Object.values(heatmapData.counts).forEach(familyCounts => {
      Object.values(familyCounts).forEach(count => {
        if (count > max) max = count
      })
    })
    
    return max || 1 // Avoid division by zero
  }, [heatmapData.counts])
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }
  
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missing-Attributes Heatmap</CardTitle>
          <CardDescription>Attribute coverage gaps by product family</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading data</AlertTitle>
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
        </CardContent>
      </Card>
    )
  }
  
  // Display a message if no data is available
  if (heatmapData.families.length === 0 || heatmapData.attributes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missing-Attributes Heatmap</CardTitle>
          <CardDescription>Attribute coverage gaps by product family</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <p>No missing attributes data available</p>
            {filters && Object.keys(filters).length > 0 && (
              <p className="text-sm mt-2">Try adjusting your filter criteria</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Missing-Attributes Heatmap</CardTitle>
        <CardDescription>Attribute coverage gaps by product family</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `auto ${heatmapData.attributes.map(() => '1fr').join(' ')}`,
            gridGap: '2px',
            minWidth: heatmapData.attributes.length * 80
          }}>
            {/* Header row with attribute names */}
            <div className="font-medium p-2 bg-muted">Family</div>
            {heatmapData.attributes.map(attr => (
              <div 
                key={attr} 
                className="font-medium p-2 bg-muted text-center overflow-hidden text-ellipsis"
                style={{ maxWidth: '120px' }}
                title={attr}
              >
                {attr}
              </div>
            ))}
            
            {/* Data rows */}
            {heatmapData.families.map(family => (
              <React.Fragment key={family}>
                <div className="font-medium p-2 bg-muted overflow-hidden text-ellipsis" title={family}>
                  {family}
                </div>
                {heatmapData.attributes.map(attr => {
                  const count = heatmapData.counts[family]?.[attr] || 0
                  return (
                    <div 
                      key={`${family}-${attr}`}
                      className="p-2 text-center text-sm transition-colors" 
                      style={{ 
                        backgroundColor: getColor(count, maxCount),
                        color: count > maxCount / 2 ? 'white' : 'black'
                      }}
                      title={`${family} missing ${count} for ${attr}`}
                    >
                      {count > 0 ? count : '-'}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-end">
          <div className="flex items-center text-xs text-muted-foreground">
            <span>Fewer</span>
            <div className="flex mx-2">
              {[0.2, 0.4, 0.6, 0.8, 1].map(intensity => (
                <div 
                  key={intensity}
                  className="w-4 h-4"
                  style={{ backgroundColor: `rgba(220, 53, 69, ${intensity})` }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MissingAttributesHeatmapCard 