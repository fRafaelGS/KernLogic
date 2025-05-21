import React, { useState } from 'react'
import { Alert, AlertTitle, AlertDescription } from '@/domains/core/components/ui/alert'
import { Button } from '@/domains/core/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { ReportFiltersState } from '@/features/reports/components/filters/ReportFilters'
import ReportFilters from '@/features/reports/components/filters/ReportFilters'
import GlobalCoverageSummaryCard from '@/features/reports/components/cards/GlobalCoverageSummaryCard'
import MissingAttributesHeatmapCard from '@/features/reports/components/cards/MissingAttributesHeatmapCard'
import useLocalizationQuality from '@/hooks/useLocalizationQuality'

const LocalizationCoverageReport: React.FC = () => {
  // State for report filters
  const [filters, setFilters] = useState<ReportFiltersState>({})
  
  // Fetch data using our custom hook for overall report state
  const { isLoading, isError, error, refetch } = useLocalizationQuality(filters)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Localization Coverage</h2>
      </div>
      
      {/* Filters */}
      <ReportFilters 
        filters={filters}
        onFiltersChange={setFilters}
        availableFilters={['locale', 'category', 'channel', 'date']}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Loading skeleton placeholders will be handled by each card component */}
          <div className="col-span-1"><GlobalCoverageSummaryCard filters={filters} /></div>
          <div className="col-span-1"><MissingAttributesHeatmapCard filters={filters} /></div>
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading localization data</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>There was a problem fetching the localization coverage data.</p>
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
      ) : (
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Card components will handle their own loading/error states */}
          <div className="col-span-1"><GlobalCoverageSummaryCard filters={filters} /></div>
          <div className="col-span-1"><MissingAttributesHeatmapCard filters={filters} /></div>
        </div>
      )}
    </div>
  )
}

export default LocalizationCoverageReport 