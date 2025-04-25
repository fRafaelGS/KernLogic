import React from 'react';
import { Activity } from '@/services/dashboardService';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCcw, AlertTriangle, Package, CalendarClock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityFeedProps {
  activities: Activity[] | null;
  loading: boolean;
  maxItems?: number;
  title?: string;
  showViewAll?: boolean;
}

/**
 * Gets time ago in human readable format
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
const getActivityIcon = (action: Activity['action']) => {
  switch (action) {
    case 'create':
      return <Plus className="h-4 w-4 text-success-600" />;
    case 'update':
      return <RefreshCcw className="h-4 w-4 text-primary-600" />;
    case 'delete':
      return <AlertTriangle className="h-4 w-4 text-danger-600" />;
    default:
      return <Package className="h-4 w-4 text-primary-600" />;
  }
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  loading,
  maxItems = 5,
  title = "Recent Activity",
  showViewAll = true
}) => {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-white border-enterprise-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-enterprise-900">{title}</CardTitle>
        </div>
        {showViewAll && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-enterprise-600 hover:text-enterprise-900"
            onClick={() => navigate('/app/activity')}
          >
            <Eye className="h-4 w-4 mr-1" />
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="divide-y divide-enterprise-100">
            {activities.slice(0, maxItems).map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 px-6 py-3 hover:bg-enterprise-50 cursor-pointer"
                onClick={() => navigate(`/app/products/${item.entity_id}`)}
              >
                <div className="h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center">
                  {getActivityIcon(item.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-enterprise-800 truncate">
                    {item.message}
                  </p>
                  <p className="text-xs text-enterprise-500 truncate">
                    by {item.user_name || 'Admin'}
                  </p>
                </div>
                <div className="flex items-center text-xs text-enterprise-500">
                  <CalendarClock className="h-3.5 w-3.5 mr-1" />
                  {getTimeAgo(item.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-enterprise-500 text-sm">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 