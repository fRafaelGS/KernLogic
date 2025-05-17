import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ReportFiltersState } from './components/filters/ReportFilters'
import { AlertCircle, RefreshCw } from 'lucide-react'
import useLocalizationQuality from '@/hooks/useLocalizationQuality'
import ReportFilters from './components/filters/ReportFilters'
import MissingAttributesHeatmapCard from '@/components/reports/cards/MissingAttributesHeatmapCard'

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#8884D8']

const LocalizationCoverageReport: React.FC = () => {
  // State for report filters
  const [filters, setFilters] = useState<ReportFiltersState>({})
  
  // Fetch data using our custom hook
  const { data, isLoading, isError, error, refetch } = useLocalizationQuality(filters)

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

  // Calculate overall translation rate from the API response
  const overallTranslationRate = data?.overall?.translated_pct ?? 0

  // Sort and get locales needing most work (lowest translation %)
  const mostNeededLocales = data 
    ? [...data.locale_stats].sort((a, b) => a.translated_pct - b.translated_pct)
    : []

  // Check if we have any data to display
  const hasData = data && data.locale_stats.length > 0

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
        <>
          {/* Loading State - Each card's skeleton */}
          <Skeleton className="h-[200px] w-full mb-6" />
          <Skeleton className="h-[350px] w-full mb-6" />
          <Skeleton className="h-[300px] w-full" />
        </>
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
      ) : !hasData ? (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No data available</AlertTitle>
          <AlertDescription>
            No localization data available for the selected filters. Try adjusting your filter criteria.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Main content cards in a 3-column grid for larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Overall Progress */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Overall Translation Progress</CardTitle>
                <CardDescription>Percentage of all attributes translated across all locales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="w-full">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-700">Translation Progress</span>
                      <span className="text-sm font-medium">{overallTranslationRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={overallTranslationRate} className="h-2 w-full" />
                    <div className="mt-4 text-sm text-gray-600">
                      {overallTranslationRate < 50 ? (
                        <p>Your localization efforts need significant work. Focus on key languages first.</p>
                      ) : overallTranslationRate < 80 ? (
                        <p>Your localization is progressing well but has room for improvement.</p>
                      ) : (
                        <p>Your localization is largely complete. Great job!</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 2-3: Translation by Locale (span 2 columns) */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Translation by Locale</CardTitle>
                <CardDescription>Percentage of attributes translated for each language</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data?.locale_stats || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis 
                        dataKey="locale" 
                        type="category" 
                        width={80} 
                        tickFormatter={(value) => getLocaleName(value)}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Translated']}
                        labelFormatter={(value) => getLocaleName(value)}
                      />
                      <Bar dataKey="translated_pct" name="Translated">
                        {data?.locale_stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Full-width table card */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Locales Needing Attention</CardTitle>
                <CardDescription>Prioritized list of locales with lowest translation rates</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Locale</TableHead>
                      <TableHead>Translated</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostNeededLocales.length > 0 ? (
                      mostNeededLocales.slice(0, 5).map((locale) => (
                        <TableRow key={locale.locale}>
                          <TableCell className="font-medium">{getLocaleName(locale.locale)}</TableCell>
                          <TableCell>{locale.translated_attributes} / {locale.total_attributes}</TableCell>
                          <TableCell>{locale.translated_pct.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={
                              locale.translated_pct >= 80 ? "success" : 
                              locale.translated_pct >= 50 ? "outline" : 
                              "destructive"
                            }>
                              {locale.translated_pct >= 80 ? "Good" : 
                              locale.translated_pct >= 50 ? "Needs work" : 
                              "Critical"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                          No localization data available for the selected filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Missing Attributes Heatmap - Full Width */}
            <div className="md:col-span-3">
              <MissingAttributesHeatmapCard filters={filters} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default LocalizationCoverageReport 