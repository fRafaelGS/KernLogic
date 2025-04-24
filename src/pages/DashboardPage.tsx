import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  CalendarClock
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

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
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
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
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-enterprise-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-enterprise-600">Total Products</CardTitle>
            <Package className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-enterprise-900">1,294</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-success-600 font-medium flex items-center mr-2">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                12%
              </span>
              <span className="text-xs text-enterprise-500">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-enterprise-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-enterprise-600">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-success-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-enterprise-900">$241,983</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-success-600 font-medium flex items-center mr-2">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                8.2%
              </span>
              <span className="text-xs text-enterprise-500">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-enterprise-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-enterprise-600">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-enterprise-900">24</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-danger-600 font-medium flex items-center mr-2">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                4
              </span>
              <span className="text-xs text-enterprise-500">items below threshold</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-enterprise-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-enterprise-600">Team Members</CardTitle>
            <Users className="h-4 w-4 text-info-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-enterprise-900">8</div>
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

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <Card className="bg-white border-enterprise-200 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-enterprise-900">Inventory Value Trend</CardTitle>
              <CardDescription className="text-enterprise-500">Last 30 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-enterprise-600 hover:text-enterprise-900">
              <LineChart className="h-4 w-4 mr-1" />
              View Report
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[240px] bg-enterprise-50 rounded-md flex items-center justify-center">
              <p className="text-enterprise-500 text-sm">Chart Placeholder</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white border-enterprise-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-enterprise-900">Recent Activity</CardTitle>
              <CardDescription className="text-enterprise-500">Last 24 hours</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-enterprise-600 hover:text-enterprise-900">
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-enterprise-100">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3 px-6 py-3">
                  <div className="h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-enterprise-800 truncate">
                      New product added
                    </p>
                    <p className="text-xs text-enterprise-500 truncate">
                      Wireless Mouse M310
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-enterprise-500">
                    <CalendarClock className="h-3.5 w-3.5 mr-1" />
                    2h ago
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 