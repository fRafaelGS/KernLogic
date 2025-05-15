import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity } from '@/services/dashboardService';
import { AnimatedValue } from '@/components/ui/animated-value';
import { IncompleteProductsList } from '@/components/dashboard/IncompleteProductsList';
import { DataCompletenessCard } from '@/components/dashboard/DataCompletenessCard';
import { ProductStatusChart } from '@/components/dashboard/ProductStatusChart';
import { MostMissingAttributesCard } from '@/components/dashboard/MostMissingAttributesCard';
import { RequiredAttributesCard } from '@/components/dashboard/RequiredAttributesCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { 
  Plus, 
  Package, 
  BarChart3, 
  DollarSign, 
  AlertTriangle, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  RefreshCcw,
  Eye,
  CalendarClock,
  DownloadCloud,
  UserPlus,
  FileText,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Activity as ActivityIcon,
  Info,
  X
} from 'lucide-react';

/**
 * Format currency in USD
 */
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Calculate the time difference in a readable format
 */
const getTimeAgo = (date: string) => {
  const now = new Date();
  const pastDate = new Date(date);
  const diff = now.getTime() - pastDate.getTime();
  
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
};

/**
 * Map activity action to an icon
 */
const getActivityIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case 'create':
      return <Plus className="h-4 w-4 text-green-500" />;
    case 'update':
      return <RefreshCcw className="h-4 w-4 text-blue-500" />;
    case 'delete':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <ActivityIcon className="h-4 w-4 text-gray-500" />;
  }
};

interface AnimatedDivProps {
  delay?: number
  className?: string
  children: React.ReactNode
}

const AnimatedDiv = ({ children, delay = 0, className = '' }: AnimatedDivProps) => {
  return (
    <div 
      className={`animate-fadeIn ${className}`}
      style={{ 
        animationDelay: `${delay}ms`,
        animationFillMode: 'both' 
      }}
    >
      {children}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    data: { summary, activity, incompleteProducts },
    loading,
    error,
    fetchAll
  } = useDashboardData();

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Handle KPI card click (navigate to filtered products)
  const handleKpiClick = (filter: string) => {
    navigate(`/app/products?${filter}`);
  };

  // Refresh dashboard data
  const handleRefresh = () => {
    fetchAll(true); // Force refresh
  };

  // Get selected inventory trend range
  const [trendRange, setTrendRange] = React.useState<30 | 60 | 90>(30);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
      {/* Header with welcome message and actions */}
      <div className="col-span-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-enterprise-900">Welcome back, Admin</h1>
          <p className="text-enterprise-500 mt-1">Here's an overview of your inventory data</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50"
            onClick={handleRefresh}
            disabled={loading.summary || loading.activity || loading.incompleteProducts}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button 
            onClick={() => navigate('/app/products/new')}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </div>
      </div>

      {/* Top KPIs Row */}
      <div className="col-span-1">
        <AnimatedDiv delay={0}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer min-h-[220px]"
                  tabIndex={0}
                  aria-label="View all products"
                  onClick={() => navigate('/app/products')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/app/products') }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Total Products</CardTitle>
                    <Package className="h-4 w-4 text-primary-600" />
                  </CardHeader>
                  <CardContent>
                    {loading.summary ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-enterprise-900">
                          <AnimatedValue value={summary?.total_products || 0} />
                        </div>
                        <hr className="my-2 border-gray-200" />
                        {summary?.recent_products?.length ? (
                          <div className="mt-2 mb-1 text-xs text-gray-400 font-medium">Last 3 products added</div>
                        ) : null}
                        {summary?.recent_products?.length ? (
                          <div className="space-y-2 mt-3 text-sm text-gray-700 max-h-[120px] overflow-auto">
                            {summary.recent_products.map((p, i) => (
                              <div
                                key={p.id}
                                className="flex justify-between gap-2 items-center px-2 py-1 rounded hover:bg-gray-50 transition cursor-pointer border-b last:border-b-0 border-gray-100 focus:outline-none"
                                tabIndex={0}
                                role="button"
                                aria-label={`Product ${p.name || p.sku}`}
                                onClick={e => {
                                  e.stopPropagation()
                                  navigate(`/app/products/${p.id}`)
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation()
                                    navigate(`/app/products/${p.id}`)
                                  }
                                }}
                              >
                                <div className="truncate font-medium w-[40%] flex items-center" title={p.name}>
                                  {p.name || 'Unnamed'}
                                </div>
                                <div className="text-gray-500 truncate w-[30%] flex items-center" title={p.sku}>
                                  <span className="mr-1 text-gray-400">#</span>{p.sku}
                                </div>
                                <div className="italic text-gray-400 text-xs w-[30%] truncate flex items-center" title={p.family?.name}>
                                  <span className="mr-1">🏷</span>{p.family?.name || '–'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic mt-2">No recent products found.</p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="top">
                The total number of products in your organization.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </AnimatedDiv>
      </div>
      <div className="col-span-1">
        <AnimatedDiv delay={100}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  role="button"
                  aria-label="Show incomplete products"
                  onClick={() => navigate('/app/products?completeness_lt=100')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/app/products?completeness_lt=100') }}
                  style={{ outline: 'none' }}
                >
                  <DataCompletenessCard 
                    completeness={summary?.data_completeness || 0}
                    mostMissingFields={summary?.most_missing_fields || []}
                    loading={loading.summary}
                    attributesMissingCount={summary?.attributes_missing_count || 0}
                    mandatoryAttributes={summary?.mandatory_attributes || []}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                % of products that have all required attribute fields filled.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </AnimatedDiv>
      </div>
      <div className="col-span-1">
        <AnimatedDiv delay={200}>
          <ProductStatusChart
            activeProducts={summary?.active_products || 0}
            inactiveProducts={summary?.inactive_products || 0}
            loading={loading.summary}
          />
        </AnimatedDiv>
      </div>

      {/* Row 2: Most Missing Attributes and Required Attributes */}
      <div className="col-span-1 min-h-[280px]">
        <AnimatedDiv delay={300}>
          <MostMissingAttributesCard
            mostMissingFields={summary?.most_missing_fields || []}
            loading={loading.summary}
          />
        </AnimatedDiv>
      </div>
      <div className="col-span-1 min-h-[280px]">
        <AnimatedDiv delay={350}>
          <RequiredAttributesCard
            mandatoryAttributes={summary?.mandatory_attributes || []}
            attributesMissingCount={summary?.attributes_missing_count || 0}
            loading={loading.summary}
          />
        </AnimatedDiv>
      </div>

      {/* Row 3: Incomplete Products and Recent Activity side by side */}
      <div className="col-span-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-h-[300px]">
            <AnimatedDiv delay={400}>
              <IncompleteProductsList
                products={incompleteProducts}
                loading={loading.incompleteProducts}
                title="Incomplete Products"
                description="Products missing required information"
                maxItems={5}
              />
            </AnimatedDiv>
          </div>
          <div className="min-h-[300px]">
            <AnimatedDiv delay={450}>
              <RecentActivityCard
                activities={activity}
                loading={loading.activity}
                maxItems={10}
              />
            </AnimatedDiv>
          </div>
        </div>
      </div>
    </div>
  );
}; 