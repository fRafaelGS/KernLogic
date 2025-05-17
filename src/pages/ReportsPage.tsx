import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { qkReportThemes, qkCompleteness } from '@/lib/queryKeys';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { Tooltip as UITooltip } from '@/components/ui/tooltip';
import { TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import report components
import LocalizationCoverageReport from '@/features/reports/LocalizationCoverageReport';
import ChangeHistoryReport from '@/features/reports/ChangeHistoryReport';
import AttributeInsightsReport from '@/features/reports/AttributeInsightsReport';
import ReportFilters from '@/features/reports/components/filters/ReportFilters';
import ReportExportButton from '@/features/reports/components/ReportExportButton';

// Import types
import type { ReportFiltersState } from '@/features/reports/components/filters/ReportFilters';

// Dashboard summary service for completeness integration
import { useQuery as useDashboardQuery } from '@tanstack/react-query';

// Helper to fetch dashboard summary (overall completeness & missing fields)
const fetchDashboardSummary = () =>
  axiosInstance.get(paths.dashboard() + 'summary/').then(res => res.data);

interface Theme {
  slug: string;
  name: string;
  description: string;
}

// Define attribute and category data types
interface AttributeData {
  name: string;
  completed: number;
  total: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface CompletenessAPIResponse {
  overall: number;
  byAttribute: AttributeData[];
  byCategory: CategoryData[];
}

interface Category {
  id: number;
  name: string;
  parent: number | null;
  children?: Category[];
}

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#8884D8'];

interface CompletenessReportProps {
  data?: {
    overall: number;
    byAttribute: Array<{ name: string; completed: number; total: number }>;
    byCategory: Array<{ name: string; value: number }>;
  };
}

const CompletenessReport: React.FC = () => {
  const [filters, setFilters] = useState<ReportFiltersState>({});
  const [showAllAttributes, setShowAllAttributes] = useState(false);
  
  /* --------------------------------------------------
   * Dashboard summary (overall completeness & missing)
   * -------------------------------------------------- */
  const { data: dashboardSummary } = useDashboardQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 5 * 60 * 1000, // 5 min – dashboard KPIs don't change that fast
  });

  // Fetch categories to resolve IDs to names
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => axiosInstance.get<Category[]>(paths.categories.root() + '?as_tree=false').then(res => res.data),
  });

  // Define fallback data structure that fully matches the expected API response
  const fallbackData: CompletenessAPIResponse = {
    overall: 0,
    byAttribute: [
      {name: 'Name', completed: 0, total: 0},
      {name: 'Description', completed: 0, total: 0},
      {name: 'Price', completed: 0, total: 0}
    ],
    byCategory: [
      {name: 'Default', value: 0}
    ]
  };

  const { data: apiData, isLoading, error } = useQuery<CompletenessAPIResponse>({
    queryKey: [...qkCompleteness(), filters],
    queryFn: () => {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.locale) queryParams.append('locale', filters.locale);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.channel) queryParams.append('channel', filters.channel);
      if (filters.family) queryParams.append('family_id', filters.family);
      if (filters.from) queryParams.append('date_from', filters.from);
      if (filters.to) queryParams.append('date_to', filters.to);
      
      const queryString = queryParams.toString();
      const url = queryString 
        ? `${paths.analytics.completeness()}?${queryString}`
        : paths.analytics.completeness();
      
      console.log('Fetching completeness data with URL:', url);  
      return axiosInstance.get<CompletenessAPIResponse>(url).then(res => res.data);
    }
  });

  // Process the data to ensure it matches the expected structure
  const data = useMemo(() => {
    // If no data, return the fallback
    if (!apiData) return fallbackData;
    
    // Use the analytics endpoint's calculation directly, as it now matches the dashboard
    const overall = typeof apiData.overall === 'number' ? apiData.overall : 0;
    
    // Ensure all expected properties exist with proper fallbacks
    return {
      overall,
      byAttribute: Array.isArray(apiData.byAttribute) && apiData.byAttribute.length > 0 
        ? apiData.byAttribute.map((attr: AttributeData) => ({
            name: attr.name || 'Unknown',
            completed: typeof attr.completed === 'number' ? attr.completed : 0,
            total: typeof attr.total === 'number' ? attr.total : 0
          }))
        : fallbackData.byAttribute,
      byCategory: Array.isArray(apiData.byCategory) && apiData.byCategory.length > 0
        ? apiData.byCategory.map((cat: CategoryData) => ({
            name: cat.name || 'Unknown',
            value: typeof cat.value === 'number' ? cat.value : 0
          }))
        : fallbackData.byCategory
    };
  }, [apiData]);

  // Create a lookup map for category IDs to names
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    
    if (categories) {
      categories.forEach(category => {
        map.set(category.id.toString(), category.name);
      });
    }
    
    return map;
  }, [categories]);

  // Process the data for displaying categories with proper names
  const categoryData = useMemo(() => {
    if (!data?.byCategory || data.byCategory.length === 0) return [];
    
    return data.byCategory.map((cat: CategoryData) => {
      // If the name is a number (likely a category ID), try to replace it with the actual name
      const name = cat.name;
      let displayName = name;
      
      // Check if it's a numeric string (likely a category ID)
      if (/^\d+$/.test(name) && categoryMap.has(name)) {
        displayName = categoryMap.get(name) || 'Unknown Category';
      } else if (name === 'Uncategorized') {
        displayName = 'Uncategorized';
      }
      
      return {
        ...cat,
        name: displayName,
        originalId: name
      };
    });
  }, [data, categoryMap]);

  // Calculate completion counts for the stats
  const completionStats = useMemo(() => {
    // Get total counts from byAttribute data
    const totalCount = data.byAttribute.reduce((sum: number, attr: AttributeData) => sum + (attr.total || 0), 0);
    const completedCount = data.byAttribute.reduce((sum: number, attr: AttributeData) => sum + (attr.completed || 0), 0);
    const missingCount = totalCount - completedCount;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Find top 3 most completed and most missing attributes
    const attributesWithPercentage = data.byAttribute.map((attr: AttributeData) => {
      const total = attr.total || 0;
      const completed = attr.completed || 0;
      const completionRate = total > 0 ? completed / total : 0;
      return {
        name: attr.name || 'Unknown',
        completionRate,
        missingRate: 1 - completionRate,
        completed,
        missing: total - completed,
        total
      };
    });
    
    // Sort by completion rate (highest first) and missing rate (highest first)
    const topCompleted = [...attributesWithPercentage]
      .filter(attr => attr.total > 0)
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 3);
      
    const topMissing = [...attributesWithPercentage]
      .filter(attr => attr.total > 0)
      .sort((a, b) => b.missingRate - a.missingRate)
      .slice(0, 3);
    
    return {
      totalCount,
      completedCount,
      missingCount,
      percent,
      topCompleted,
      topMissing
    };
  }, [data]);

  // Process the data for attribute chart
  const attributeChartData = useMemo(() => {
    if (!data || !data.byAttribute) return [];

    // Sort attributes by completion percentage (lowest first)
    const sorted = [...data.byAttribute].sort((a, b) => {
      const aPct = a.total ? a.completed / a.total : 0;
      const bPct = b.total ? b.completed / b.total : 0;
      return aPct - bPct; // sort by lowest completeness
    });

    // Only show top 10 if not showing all
    const filteredData = showAllAttributes ? sorted : sorted.slice(0, 10);

    // Format data for the chart
    return filteredData.map((attr) => ({
      name: attr.name || 'Unknown',
      pct: attr.total ? Math.round((attr.completed / attr.total) * 100) : 0,
      completed: attr.completed || 0,
      total: attr.total || 0,
    }));
  }, [data, showAllAttributes]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border rounded">
        <h3 className="font-semibold mb-2">Error loading completeness data</h3>
        <p>The analytics data may not be available yet after the database migration.</p>
        <p className="text-sm mt-2">Please run the analytics data population commands to fix this issue or try running them with the --reset flag.</p>
        <p className="text-sm mt-2">Command: python manage.py populate_facts --reset</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Data Completeness</h2>
        <ReportExportButton reportType="completeness" filters={filters} />
      </div>
      
      <ReportFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        availableFilters={['date', 'category', 'channel', 'locale', 'family']} 
      />
      
      {/* Row with Overall Completeness and Top Missing Fields */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Overall Completeness */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">Overall Completeness</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            {completionStats.totalCount === 0 ? (
              <p className="text-muted-foreground">No data available for the selected filters.</p>
            ) : (
              <>
                <div className="relative w-full max-w-md mt-8">
                  {/* % label centered */}
                  <div className="absolute top-[-2rem] left-1/2 transform -translate-x-1/2 text-2xl font-bold text-gray-900">
                    {completionStats.percent}%
                  </div>

                  {/* Progress bar wrapper */}
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full h-6 bg-red-200 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-green-500 transition-all duration-700"
                            style={{ width: `${completionStats.percent}%` }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {completionStats.completedCount} of {completionStats.totalCount} fields complete
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>

                {/* Stats */}
                <div className="flex justify-around w-full max-w-md text-base font-medium text-gray-700 mt-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 text-lg">✅</span>
                    <span><strong className="text-lg">{completionStats.completedCount}</strong> complete</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-red-600 text-lg">❌</span>
                    <span><strong className="text-lg">{completionStats.missingCount}</strong> missing</span>
                  </div>
                </div>
                
                {/* Top completed and missing attributes */}
                <div className="w-full max-w-md grid grid-cols-2 gap-6 mt-2">
                  {/* Top completed attributes */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-green-700 border-b pb-1">Top Completed</h4>
                    <ul className="space-y-2">
                      {completionStats.topCompleted.map((attr, idx) => (
                        <li key={`complete-${idx}`} className="flex justify-between items-center">
                          <span className="text-sm truncate">{attr.name}</span>
                          <span className="text-green-600 text-sm font-medium ml-2">
                            {Math.round(attr.completionRate * 100)}%
                          </span>
                        </li>
                      ))}
                      {completionStats.topCompleted.length === 0 && (
                        <li className="text-sm text-gray-500">No data available</li>
                      )}
                    </ul>
                  </div>
                  
                  {/* Top missing attributes */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-red-700 border-b pb-1">Top Missing</h4>
                    <ul className="space-y-2">
                      {completionStats.topMissing.map((attr, idx) => (
                        <li key={`missing-${idx}`} className="flex justify-between items-center">
                          <span className="text-sm truncate">{attr.name}</span>
                          <span className="text-red-600 text-sm font-medium ml-2">
                            {Math.round(attr.missingRate * 100)}%
                          </span>
                        </li>
                      ))}
                      {completionStats.topMissing.length === 0 && (
                        <li className="text-sm text-gray-500">No data available</li>
                      )}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Missing Fields */}
        {dashboardSummary?.most_missing_fields?.length ? (
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-lg">Top Missing Fields</CardTitle>
              <CardDescription>Fields most frequently incomplete across your catalogue</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dashboardSummary.most_missing_fields.map((mf: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center">
                    <span>{mf.field}</span>
                    <Badge variant="destructive">{mf.count} missing</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Completeness by Attribute */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Completeness by Attribute</CardTitle>
            <CardDescription>Attributes sorted by lowest completion rate</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setShowAllAttributes(!showAllAttributes)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            {showAllAttributes ? 'Show Top 10' : 'Show All'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-auto" style={{ minHeight: '300px' }}>
            {attributeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, attributeChartData.length * 40)}>
                <BarChart
                  data={attributeChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 50, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]} 
                    unit="%" 
                    tickCount={6} 
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tickFormatter={(value) => value.length > 25 ? `${value.substring(0, 22)}...` : value}
                  />
                  <Tooltip 
                    formatter={(value) => {
                      return [`${value}% complete`, ''];
                    }}
                    labelFormatter={(name) => {
                      const item = attributeChartData.find(i => i.name === name);
                      return `${name} (${item?.completed} of ${item?.total})`;
                    }}
                  />
                  <Bar 
                    dataKey="pct" 
                    fill="#3b82f6" 
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                    name="Completion Rate"
                  >
                    <LabelList 
                      dataKey="pct" 
                      position="right" 
                      formatter={(value: number) => `${value}%`} 
                      style={{ fill: '#6b7280', fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                No attribute data available
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-3 text-center">
            {attributeChartData.length > 0 && !showAllAttributes && data.byAttribute.length > 10 && (
              <p>{data.byAttribute.length - 10} more attributes not shown</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completeness by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completeness by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(value) => [`${value}%`, 'Completeness']} />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Define all available reports with their slug, name, and component
const REPORTS = [
  {
    slug: 'completeness',
    name: 'Data Completeness',
    description: 'Analyze the completeness of your product data across all fields and categories.',
    component: CompletenessReport
  },
  {
    slug: 'localization', 
    name: 'Localization Coverage',
    description: 'Monitor the translation coverage and quality across different locales.',
    component: LocalizationCoverageReport
  },
  {
    slug: 'history',
    name: 'Change History',
    description: 'View the history of changes to products and their attributes over time.',
    component: ChangeHistoryReport
  },
  {
    slug: 'attributes',
    name: 'Attribute Insights',
    description: 'Analyze attribute usage patterns and distribution across your product catalog.',
    component: AttributeInsightsReport
  }
];

const ReportsPage: React.FC = () => {
  // Active report tab
  const [activeReport, setActiveReport] = useState<string>('completeness');
  
  // Fetch report themes from API
  const { data: fetchedThemes = [], isLoading, error } = useQuery({
    queryKey: qkReportThemes(),
    queryFn: () =>
      axiosInstance.get<Theme[]>(paths.reports.themes()).then(res => res.data),
    // Use our local reports definition without relying on placeholderData
    // as we'll explicitly use the static REPORTS array if API returns empty data
  });

  // Always use the static REPORTS array since it's now the source of truth
  // and we don't need to rely on the API for the report definitions
  const themes = REPORTS.map(r => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
  }));

  if (isLoading) return <div className="flex justify-center p-8">Loading reports...</div>;
  
  if (error) return (
    <div className="text-red-500 p-4">
      Error loading reports. The reports module may still be in development.
    </div>
  );
  
  // Find the active report component
  const ActiveReportComponent = REPORTS.find(r => r.slug === activeReport)?.component || 
    (() => <div>Report not found</div>);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-enterprise-900">Reports & Analytics</h1>
      <p className="text-enterprise-600 mb-6">
        Gain insights into your product data quality and enrichment progress.
      </p>
      <Card>
        <CardContent>
          {themes.length > 0 ? (
            <Tabs 
              value={activeReport} 
              onValueChange={setActiveReport}
              className="w-full"
            >
              <TabsList className="mb-4 mt-4">
                {themes.map(theme => (
                  <TabsTrigger key={theme.slug} value={theme.slug}>
                    {theme.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {themes.map(theme => (
                <TabsContent key={theme.slug} value={theme.slug} className="space-y-4">
                  <div>
                    <ActiveReportComponent />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center p-8 border rounded-lg bg-gray-50">
              <p className="text-gray-600 mb-2">No report themes configured yet.</p>
              <p className="text-sm text-gray-500">
                Report themes will be available in an upcoming release.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;