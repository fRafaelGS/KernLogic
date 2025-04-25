import React, { useEffect } from 'react';
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

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    data: { summary, inventoryTrend, activity, incompleteProducts },
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
        <Card 
          className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer"
          onClick={() => handleKpiClick('view=all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-enterprise-600">Total Products</CardTitle>
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

        {/* Inventory Value */}
        <Card 
          className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer"
          onClick={() => handleKpiClick('view=all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-enterprise-600">Inventory Value</CardTitle>
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

        {/* Low Stock Items */}
        <Card 
          className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer"
          onClick={() => handleKpiClick('low_stock=true')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-enterprise-600">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning-500" />
          </CardHeader>
          <CardContent>
            {loading.summary ? (
              <Skeleton className="h-8 w-10" />
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

        {/* Team Members */}
        <Card 
          className="bg-white border-enterprise-200 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer"
          onClick={() => navigate('/app/team')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-enterprise-600">Team Members</CardTitle>
            <Users className="h-4 w-4 text-info-500" />
          </CardHeader>
          <CardContent>
            {loading.summary ? (
              <Skeleton className="h-8 w-10" />
            ) : (
              <div className="text-2xl font-bold text-enterprise-900">
                <AnimatedValue value={summary?.team_members || 0} />
              </div>
            )}
            <div className="flex items-center pt-1">
              <span className="text-xs text-success-600 font-medium flex items-center mr-2">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                2
              </span>
              <span className="text-xs text-enterprise-500">new this month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Data Completeness & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Data Completeness Card */}
        <Card className="bg-white border-enterprise-200 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-enterprise-900">Data Completeness</CardTitle>
              <CardDescription className="text-enterprise-500">
                {loading.summary ? (
                  <span className="inline-block"><Skeleton className="h-4 w-40" /></span>
                ) : (
                  `${summary?.data_completeness || 0}% of catalog has all required fields filled`
                )}
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-enterprise-600">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">About data completeness</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="w-80 p-4">
                  <p className="text-sm font-medium mb-2">Required fields:</p>
                  <ul className="text-xs text-enterprise-600 list-disc pl-4 space-y-1">
                    <li>Name</li>
                    <li>SKU</li>
                    <li>Description</li>
                    <li>Price</li>
                    <li>Stock</li>
                    <li>Category</li>
                    <li>Images</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            {loading.summary ? (
              <div className="space-y-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs text-enterprise-500 mb-1.5">
                  <span>Completeness</span>
                  <span>{summary?.data_completeness || 0}%</span>
                </div>
                <Progress 
                  value={summary?.data_completeness || 0} 
                  className="h-2.5 bg-enterprise-100"
                />
                
                <div className="mt-6">
                  <div className="text-sm font-medium text-enterprise-800 mb-3">Most missing fields</div>
                  {summary?.most_missing_fields && summary.most_missing_fields.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {summary.most_missing_fields.map((item) => (
                        <Tooltip key={item.field}>
                          <TooltipTrigger asChild>
                            <Badge className="bg-enterprise-100 text-enterprise-700 hover:bg-enterprise-200">
                              {item.field} ({item.count})
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">{item.count} products missing {item.field}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-enterprise-500">No missing fields detected</div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Product Status Card */}
        <Card className="bg-white border-enterprise-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-enterprise-900">Product Status</CardTitle>
            <CardDescription className="text-enterprise-500">
              {loading.summary ? (
                <span className="inline-block"><Skeleton className="h-4 w-36" /></span>
              ) : (
                `${summary?.active_products || 0} active products`
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading.summary ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Skeleton className="h-40 w-40 rounded-full" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative h-44 w-44">
                  <DonutChart
                    data={[
                      { name: 'Active', value: summary?.active_products || 0, color: 'rgb(34, 197, 94)' },
                      { name: 'Inactive', value: summary?.inactive_products || 0, color: 'rgb(242, 242, 242)' },
                    ]}
                    className="h-44 w-44"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-enterprise-900">
                      {summary ? Math.round((summary.active_products / (summary.active_products + summary.inactive_products || 1)) * 100) : 0}%
                    </div>
                    <div className="text-xs text-enterprise-500">Active</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center text-xs h-auto py-2"
                    onClick={() => handleKpiClick('is_active=true')}
                  >
                    <div className="h-2 w-2 bg-success-500 rounded-full mr-2"></div>
                    Active: {summary?.active_products || 0}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center text-xs h-auto py-2"
                    onClick={() => handleKpiClick('is_active=false')}
                  >
                    <div className="h-2 w-2 bg-enterprise-200 rounded-full mr-2"></div>
                    Inactive: {summary?.inactive_products || 0}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Charts & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inventory Trend Chart */}
        <Card className="bg-white border-enterprise-200 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-enterprise-900">Inventory Value Trend</CardTitle>
              <CardDescription className="text-enterprise-500">
                {loading.inventoryTrend ? (
                  <span className="inline-block"><Skeleton className="h-4 w-36" /></span>
                ) : (
                  `Last ${trendRange} days`
                )}
              </CardDescription>
            </div>
            <Tabs 
              value={trendRange.toString()} 
              onValueChange={(value) => setTrendRange(parseInt(value) as 30 | 60 | 90)}
              className="mr-2"
            >
              <TabsList className="grid grid-cols-3 h-8 w-32">
                <TabsTrigger value="30" className="text-xs">30d</TabsTrigger>
                <TabsTrigger value="60" className="text-xs">60d</TabsTrigger>
                <TabsTrigger value="90" className="text-xs">90d</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading.inventoryTrend ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : (
              <div className="h-[200px]">
                {inventoryTrend && inventoryTrend.dates && inventoryTrend.values && (
                  <AreaChart
                    data={inventoryTrend.dates.map((date, i) => ({
                      date: new Date(date),
                      value: inventoryTrend.values[i],
                    }))}
                    categories={['value']}
                    index="date"
                    yAxisWidth={60}
                    showLegend={false}
                    showGridLines={false}
                    showAnimation={true}
                    className="h-[200px]"
                    valueFormatter={(value) => formatCurrency(value as number)}
                    colors={['#0891b2']}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white border-enterprise-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-enterprise-900">Recent Activity</CardTitle>
            <Button 
              variant="ghost"
              size="sm"
              className="text-enterprise-600 hover:text-enterprise-900 h-8"
              onClick={() => navigate('/app/activity')}
            >
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading.activity ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start">
                    <Skeleton className="h-8 w-8 rounded-full mr-3" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity && Array.isArray(activity) && activity.length > 0 ? (
              <div className="divide-y divide-enterprise-100">
                {activity.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-start hover:bg-enterprise-50">
                    <div className="h-8 w-8 rounded-full bg-enterprise-100 flex items-center justify-center mr-3 text-enterprise-600">
                      {getActivityIcon(item.action)}
                    </div>
                    <div>
                      <p className="text-sm text-enterprise-800">
                        <span className="font-medium">{item.user_name}</span> {item.message}
                      </p>
                      <p className="text-xs text-enterprise-500 mt-1">
                        {getTimeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <ActivityIcon className="h-8 w-8 text-enterprise-300 mb-2" />
                <p className="text-enterprise-700 font-medium">No recent activity</p>
                <p className="text-enterprise-500 text-sm">Activities will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row grid: Incomplete Products and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Incomplete Products */}
        <Card className="bg-white border-enterprise-200 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-enterprise-900">Incomplete Products</CardTitle>
              <CardDescription className="text-enterprise-500">
                Products with missing information
              </CardDescription>
            </div>
            <Button 
              variant="ghost"
              size="sm"
              className="text-enterprise-600 hover:text-enterprise-900 h-8"
              onClick={() => navigate('/app/products?completeness=incomplete')}
            >
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading.incompleteProducts ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : incompleteProducts && Array.isArray(incompleteProducts) && incompleteProducts.length > 0 ? (
              <div className="divide-y divide-enterprise-100">
                {incompleteProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="px-6 py-4 hover:bg-enterprise-50 cursor-pointer"
                    onClick={() => navigate(`/app/products/${product.id}/edit`)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-enterprise-800">{product.name}</h4>
                      <Badge variant="outline" className="bg-enterprise-50">
                        {product.completeness}% complete
                      </Badge>
                    </div>
                    <div className="text-xs text-enterprise-500 mb-3">SKU: {product.sku}</div>
                    <div className="flex flex-wrap gap-2">
                      {product.missing_fields && Array.isArray(product.missing_fields) && product.missing_fields.map((field) => (
                        <Badge 
                          key={field} 
                          variant="outline"
                          className="bg-danger-50 text-danger-700 border-danger-200"
                        >
                          Missing: {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-8 w-8 text-success-500 mb-2" />
                <p className="text-enterprise-700 font-medium">All products are complete!</p>
                <p className="text-enterprise-500 text-sm">No incomplete products found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Docs */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <Card className="bg-white border-enterprise-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-enterprise-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              <Button 
                variant="outline"
                className="flex justify-start items-center h-auto py-3 border-enterprise-200"
                onClick={() => navigate('/app/upload')}
              >
                <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center mr-3">
                  <DownloadCloud className="h-4 w-4 text-primary-600" />
                </div>
                <span className="text-enterprise-800 font-medium">Import CSV</span>
              </Button>
              
              <Button 
                variant="outline"
                className="flex justify-start items-center h-auto py-3 border-enterprise-200"
                onClick={() => navigate('/app/team/invite')}
              >
                <div className="h-8 w-8 rounded-full bg-success-50 flex items-center justify-center mr-3">
                  <UserPlus className="h-4 w-4 text-success-600" />
                </div>
                <span className="text-enterprise-800 font-medium">Invite Teammate</span>
              </Button>
              
              <Button 
                variant="outline"
                className="flex justify-start items-center h-auto py-3 border-enterprise-200"
                onClick={() => navigate('/app/documentation')}
              >
                <div className="h-8 w-8 rounded-full bg-info-50 flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-info-600" />
                </div>
                <span className="text-enterprise-800 font-medium">View Docs</span>
              </Button>
            </CardContent>
          </Card>

          {/* Docs & Support */}
          <Card className="bg-white border-enterprise-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-enterprise-900">Help & Support</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <Button 
                variant="ghost" 
                className="flex justify-start items-center w-full h-auto py-2 hover:bg-enterprise-50 hover:text-enterprise-900"
                onClick={() => window.open('https://docs.kernlogic.com', '_blank')}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                <span>Knowledge Base</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
              
              <Button 
                variant="ghost"
                className="flex justify-start items-center w-full h-auto py-2 hover:bg-enterprise-50 hover:text-enterprise-900"
                onClick={() => window.open('https://support.kernlogic.com', '_blank')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <span>Contact Support</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 