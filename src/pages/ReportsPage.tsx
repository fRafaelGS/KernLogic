import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { qkReportThemes, qkCompleteness, qkReadiness } from '@/lib/queryKeys';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
  Cell
} from 'recharts';

// Import report components
import EnrichmentVelocityReport from '@/features/reports/EnrichmentVelocityReport';
import LocalizationQualityReport from '@/features/reports/LocalizationQualityReport';
import ChangeHistoryReport from '@/features/reports/ChangeHistoryReport';
import ReportFilters from '@/features/reports/components/filters/ReportFilters';
import ReportExportButton from '@/features/reports/components/ReportExportButton';

// Import types
import type { ReportFiltersState } from '@/features/reports/components/filters/ReportFilters';

interface Theme {
  slug: string;
  name: string;
  description: string;
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

interface ReadinessReportProps {
  data?: {
    overall: number;
    byChannel: Array<{ name: string; value: number }>;
    byRequiredField: Array<{ name: string; completed: number; missing: number }>;
  };
}

const CompletenessReport: React.FC = () => {
  const [filters, setFilters] = useState<ReportFiltersState>({});
  
  const { data, isLoading, error } = useQuery({
    queryKey: [...qkCompleteness(), filters],
    queryFn: () => {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.locale) queryParams.append('locale', filters.locale);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.channel) queryParams.append('channel', filters.channel);
      if (filters.from) queryParams.append('date_from', filters.from);
      if (filters.to) queryParams.append('date_to', filters.to);
      
      const queryString = queryParams.toString();
      const url = queryString 
        ? `${paths.analytics.completeness()}?${queryString}`
        : paths.analytics.completeness();
        
      return axiosInstance.get(url).then(res => res.data);
    }
  });

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
        Error loading completeness data. Please try again later.
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
        availableFilters={['date', 'category', 'channel']} 
      />
      
      {/* Overall Completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Completeness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-700">Completeness</span>
                <span className="text-sm font-medium">{data.overall}%</span>
              </div>
              <Progress value={data.overall} className="h-2 w-full" />
              <div className="mt-4 text-sm text-gray-600">
                {data.overall < 50 ? (
                  <p>Your product data needs significant improvement to be complete.</p>
                ) : data.overall < 80 ? (
                  <p>Your product data is progressing well but has room for improvement.</p>
                ) : (
                  <p>Your product data is largely complete. Great job!</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completeness by Attribute */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completeness by Attribute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.byAttribute}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => [`${value}%`, 'Completed']} />
                <Bar dataKey="completed" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Completeness by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completeness by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-around">
            <div className="h-[300px] w-full max-w-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {data.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Completeness']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full max-w-xs mt-4 md:mt-0">
              <h3 className="text-md font-medium mb-2">Category Breakdown</h3>
              <ul className="space-y-2">
                {data.byCategory.map((category, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm">{category.name}</span>
                    <Badge variant={category.value >= 70 ? "success" : category.value >= 50 ? "outline" : "destructive"}>
                      {category.value}%
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const ReadinessReport: React.FC = () => {
  const [filters, setFilters] = useState<ReportFiltersState>({});
  
  const { data, isLoading, error } = useQuery({
    queryKey: [...qkReadiness(), filters],
    queryFn: () => {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.locale) queryParams.append('locale', filters.locale);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.channel) queryParams.append('channel', filters.channel);
      if (filters.from) queryParams.append('date_from', filters.from);
      if (filters.to) queryParams.append('date_to', filters.to);
      
      const queryString = queryParams.toString();
      const url = queryString 
        ? `${paths.analytics.readiness()}?${queryString}`
        : paths.analytics.readiness();
        
      return axiosInstance.get(url).then(res => res.data);
    }
  });

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
        Error loading readiness data. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Marketplace Readiness</h2>
        <ReportExportButton reportType="readiness" filters={filters} />
      </div>
      
      <ReportFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        availableFilters={['date', 'channel']} 
      />
      
      {/* Overall Readiness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Marketplace Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-700">Overall Readiness</span>
                <span className="text-sm font-medium">{data.overall}%</span>
              </div>
              <Progress value={data.overall} className="h-2 w-full" />
              <div className="mt-4 text-sm text-gray-600">
                {data.overall < 50 ? (
                  <p>Your products need significant improvement to be ready for marketplace selling.</p>
                ) : data.overall < 80 ? (
                  <p>Your products are getting closer to being marketplace-ready.</p>
                ) : (
                  <p>Your products are well-prepared for marketplace distribution.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness by Channel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Readiness by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.byChannel}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value) => [`${value}%`, 'Readiness']} />
                <Bar dataKey="value" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Readiness by Required Field */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Required Fields Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.byRequiredField}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                stackOffset="sign"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                <Bar dataKey="completed" stackId="stack" fill="#0088FE" name="Completed" />
                <Bar dataKey="missing" stackId="stack" fill="#FF8042" name="Missing" />
              </BarChart>
            </ResponsiveContainer>
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
    description: 'Analyze the completeness of your product data across all fields.',
    component: CompletenessReport
  },
  {
    slug: 'readiness',
    name: 'Marketplace Readiness',
    description: 'Check if your products meet the criteria for different sales channels.',
    component: ReadinessReport
  },
  {
    slug: 'velocity',
    name: 'Enrichment Velocity',
    description: 'Track how quickly products are being enriched over time.',
    component: EnrichmentVelocityReport
  },
  {
    slug: 'localization', 
    name: 'Localization Quality',
    description: 'Monitor the quality and coverage of translations.',
    component: LocalizationQualityReport
  },
  {
    slug: 'history',
    name: 'Change History',
    description: 'View the history of changes to products and attributes.',
    component: ChangeHistoryReport
  }
];

const ReportsPage: React.FC = () => {
  // Active report tab
  const [activeReport, setActiveReport] = useState<string>('completeness');
  
  // Fetch report themes from API
  const { data: themes = [], isLoading, error } = useQuery({
    queryKey: qkReportThemes(),
    queryFn: () =>
      axiosInstance.get<Theme[]>(paths.reports.themes()).then(res => res.data),
    // Use our local reports definition instead of fetching from the API for now
    placeholderData: REPORTS.map(report => ({
      slug: report.slug,
      name: report.name,
      description: report.description
    }))
  });

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
        Gain insights into your product performance and inventory health.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Reports Dashboard</CardTitle>
          <CardDescription>Select a report type to view detailed analytics</CardDescription>
        </CardHeader>
        <CardContent>
          {themes.length > 0 ? (
            <Tabs 
              value={activeReport} 
              onValueChange={setActiveReport}
              className="w-full"
            >
              <TabsList className="mb-4">
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