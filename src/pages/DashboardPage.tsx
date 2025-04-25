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
import { AreaChart, DonutChart } from '@tremor/react';
import { AnimatedValue } from '@/components/ui/animated-value';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { IncompleteProductsList } from '@/components/dashboard/IncompleteProductsList';
import { DataCompletenessCard } from '@/components/dashboard/DataCompletenessCard';
import { ProductStatusChart } from '@/components/dashboard/ProductStatusChart';
import { InventoryTrendChart } from '@/components/dashboard/InventoryTrendChart';
import { QuickActions } from '@/components/dashboard/QuickActions';
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
  Info
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

// Replace motion.div with a simple div since framer-motion might not be available
const AnimatedDiv = ({ children, delay = 0, className = '' }) => {
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
    data: { summary, inventoryTrend, activity, incompleteProducts },
    loading,
    error,
    fetchAll,
    fetchInventoryTrend
  } = useDashboardData();

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch inventory trend with specific range
  const fetchInventoryTrendHandler = useCallback((range: 30 | 60 | 90, forceRefresh = false) => {
    if (typeof fetchInventoryTrend === 'function') {
      fetchInventoryTrend(range, forceRefresh);
    } else {
      console.warn("fetchInventoryTrend is not available in useDashboardData");
    }
  }, [fetchInventoryTrend]);

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
    <div className="space-y-8">
      {/* Header with welcome message and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-enterprise-900">Welcome back, Admin</h1>
          <p className="text-enterprise-500 mt-1">Here's an overview of your inventory data</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="border-enterprise-200 text-enterprise-700 hover:bg-enterprise-50"
            onClick={handleRefresh}
            disabled={loading.summary || loading.inventoryTrend || loading.activity || loading.incompleteProducts}
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

      {/* KPI Cards */}
      <div 
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
        aria-live="polite"
      >
        {/* Total Products */}
        <AnimatedDiv delay={0}>
          <Card 
            className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer"
            onClick={() => handleKpiClick('view=all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Total Products</CardTitle>
              <Package className="h-4 w-4 text-primary-600" />
            </CardHeader>
            <CardContent>
              {loading.summary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-enterprise-900">
                  <AnimatedValue value={summary?.total_products || 0} />
                </div>
              )}
              <div className="flex items-center pt-1">
                <span className="text-xs text-success-600 font-medium flex items-center mr-2">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  12%
                </span>
                <span className="text-xs text-enterprise-500">from last month</span>
              </div>
            </CardContent>
          </Card>
        </AnimatedDiv>

        {/* Inventory Value */}
        <AnimatedDiv delay={50}>
          <Card 
            className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer"
            onClick={() => handleKpiClick('view=all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-success-600" />
            </CardHeader>
            <CardContent>
              {loading.summary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-enterprise-900">
                  {formatCurrency(summary?.inventory_value || 0)}
                </div>
              )}
              <div className="flex items-center pt-1">
                <span className="text-xs text-success-600 font-medium flex items-center mr-2">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  8.2%
                </span>
                <span className="text-xs text-enterprise-500">from last month</span>
              </div>
            </CardContent>
          </Card>
        </AnimatedDiv>

        {/* Low Stock Items */}
        <AnimatedDiv delay={100}>
          <Card 
            className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer"
            onClick={() => handleKpiClick('stock=low')}
            title="Click to view all low stock products"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {loading.summary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-enterprise-900">
                  <AnimatedValue value={summary?.low_stock_count || 0} />
                </div>
              )}
              <div className="flex items-center pt-1">
                <span className="text-xs text-danger-600 font-medium flex items-center mr-2">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  4
                </span>
                <span className="text-xs text-enterprise-500">items below threshold</span>
              </div>
            </CardContent>
          </Card>
        </AnimatedDiv>

        {/* Team Members */}
        <AnimatedDiv delay={150}>
          <Card 
            className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer"
            onClick={() => navigate('/app/team')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Team Members</CardTitle>
              <Users className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              {loading.summary ? (
                <Skeleton className="h-8 w-8" />
              ) : (
                <div className="text-2xl font-bold text-enterprise-900">
                  <AnimatedValue value={summary?.team_members || 0} />
                </div>
              )}
              <div className="flex items-center pt-1">
                <span className="text-xs text-success-600 font-medium flex items-center mr-2">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  1
                </span>
                <span className="text-xs text-enterprise-500">active user</span>
              </div>
            </CardContent>
          </Card>
        </AnimatedDiv>
      </div>

      {/* Charts and summary data */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Data Completeness */}
        <AnimatedDiv delay={200} className="col-span-1">
          <DataCompletenessCard 
            completeness={summary?.data_completeness || 0}
            mostMissingFields={summary?.most_missing_fields || []}
            loading={loading.summary}
          />
        </AnimatedDiv>

        {/* Product Status */}
        <AnimatedDiv delay={250} className="col-span-1">
          <ProductStatusChart
            activeProducts={summary?.active_products || 0}
            inactiveProducts={summary?.inactive_products || 0}
            loading={loading.summary}
          />
        </AnimatedDiv>

        {/* Inventory Value Trend */}
        <AnimatedDiv delay={300} className="md:col-span-2 lg:col-span-1">
          <InventoryTrendChart
            data={inventoryTrend}
            loading={loading.inventoryTrend}
            onRangeChange={(range) => fetchInventoryTrendHandler(range, true)}
          />
        </AnimatedDiv>
      </div>

      {/* Activity and Incomplete Products */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Recent Activity */}
        <AnimatedDiv delay={350}>
          <ActivityFeed
            activities={activity}
            loading={loading.activity}
            error={error.activity}
            title="Recent Activity"
            maxItems={10}
          />
        </AnimatedDiv>

        {/* Incomplete Products */}
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

      {/* Quick Actions */}
      <AnimatedDiv delay={450}>
        <QuickActions />
      </AnimatedDiv>

      {/* Help & Support */}
      <AnimatedDiv delay={500}>
        <Card className="bg-white border-enterprise-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Help & Support</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="flex items-center" onClick={() => window.open('https://docs.kernlogic.com', '_blank', 'noopener noreferrer')}>
              <FileText className="h-4 w-4 mr-2" />
              Documentation
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
            <Button variant="outline" className="flex items-center" onClick={() => window.open('https://help.kernlogic.com', '_blank', 'noopener noreferrer')}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Help Center
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
            <Button variant="outline" className="flex items-center" onClick={() => window.open('https://support.kernlogic.com', '_blank', 'noopener noreferrer')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Support
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </AnimatedDiv>
    </div>
  );
}; 