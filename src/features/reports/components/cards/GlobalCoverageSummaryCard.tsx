import React, { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { ReportFiltersState } from '@/features/reports/components/filters/ReportFilters'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'

interface GlobalCoverageSummaryCardProps {
  filters?: ReportFiltersState
}

/**
 * Card component that displays global attribute coverage summary data
 */
const GlobalCoverageSummaryCard: React.FC<GlobalCoverageSummaryCardProps> = ({ filters }) => {
  const { data, loading, error, fetchAll } = useDashboardData()
  
  // Trigger initial data load
  useEffect(() => {
    fetchAll()
  }, [fetchAll])
  
  // Extract base data from API response
  const summaryData = data?.summary
  const totalProducts = summaryData?.total_products ?? 0
  const mandatoryAttributes = summaryData?.mandatory_attributes ?? []
  
  // Extract missing fields from incomplete products
  const incompleteProducts = data?.incompleteProducts ?? []
  const missingAttrsCount = incompleteProducts.reduce(
    (sum, prod) => sum + (prod.missing_fields?.length ?? 0),
    0
  )
  
  /**
   * Calculate completeness based on mandatory attributes across all products:
   * - Each product should have all mandatory attributes filled in
   * - Total expected attributes = (# of products) × (# of mandatory attributes)
   * - Missing attributes are counted from each product's missing_fields array
   * - Complete attributes = total expected - missing
   * - Percentage = (complete / total) × 100
   */
  const numFields = mandatoryAttributes.length
  const totalAttrs = numFields * totalProducts
  const completeAttrs = totalAttrs - missingAttrsCount
  const pct = totalAttrs > 0
    ? parseFloat(((completeAttrs / totalAttrs) * 100).toFixed(1))
    : 0
  
  if (loading.summary) {
    return (
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </CardContent>
      </Card>
    )
  }
  
  if (error.summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Global Coverage</CardTitle>
          <CardDescription>Overview of all attribute completeness</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading data</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>There was a problem fetching the coverage data.</p>
              {error.summary instanceof Error && (
                <p className="text-xs opacity-80">{error.summary.message}</p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-fit mt-2"
                onClick={() => fetchAll(true)}
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
  
  // Handle empty state
  if (totalAttrs === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Global Coverage</CardTitle>
          <CardDescription>Overview of all attribute completeness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
            <p>No attributes to display</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          Global Coverage
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Coverage is calculated as follows:</p>
                <ul className="list-disc pl-4 mt-1 text-xs">
                  <li>Total expected attributes = Number of products × Number of mandatory attributes</li>
                  <li>Missing attributes = Sum of missing fields across all products</li>
                  <li>Complete attributes = Total expected - Missing</li>
                  <li>Percentage = (Complete / Total expected) × 100</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>Overview of all attribute completeness</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center mb-4">
          <span className="text-4xl font-bold">{pct.toFixed(1)}%</span>
          <span className="text-sm text-muted-foreground mt-1">
            {completeAttrs.toLocaleString()} of {totalAttrs.toLocaleString()} attributes complete
          </span>
        </div>
        
        <div className="space-y-4">
          <Progress value={pct} className="h-2" />
          
          <div className="text-sm text-muted-foreground">
            {pct < 50 ? (
              <p>Your product data needs significant work. Focus on completing essential attributes first.</p>
            ) : pct < 80 ? (
              <p>Your product data is progressing well but has room for improvement.</p>
            ) : (
              <p>Your product data is largely complete. Great job!</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default GlobalCoverageSummaryCard 