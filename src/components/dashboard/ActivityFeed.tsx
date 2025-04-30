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
import { APP_VERSION } from '@/constants';

interface ActivityFeedProps {
  activities: Activity[] | null;
  loading: boolean;
  error?: Error | null;
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
const getActivityIcon = (action: Activity['action'] | 'default') => {
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

/**
 * Extract product name from activity message or use fallback
 */
const getProductName = (activity: Activity): string => {
  // Try to extract product name from message using multiple patterns
  const patterns = [
    /product "([^"]+)"/,          // product "Name"
    /Product "([^"]+)"/,          // Product "Name"
    /added product ([^"]+)/,      // added product Name
    /updated product ([^"]+)/,    // updated product Name
    /deleted product ([^"]+)/,    // deleted product Name
    /product: ([^,]+)/,           // product: Name
    /Product: ([^,]+)/            // Product: Name
  ];
  
  for (const pattern of patterns) {
    const match = activity.message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return "Unnamed product";
};

/**
 * Format the activity message to be more concise and meaningful
 */
const formatActivityMessage = (activity: Activity): string => {
  // Extract user and action for a more meaningful message
  const userName = activity.user_name || 'A user';
  const actionText = {
    'create': 'created',
    'update': 'updated',
    'delete': 'deleted'
  }[activity.action] || 'modified';

  return `${userName} ${actionText} this product`;
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  loading,
  error,
  maxItems = 10,
  title = "Recent Activity",
  showViewAll = true
}) => {
  const navigate = useNavigate();
  
  // Check if activities is an array before using array methods
  const isValidActivities = Array.isArray(activities);
  
  const renderActivity = (item: Activity) => {
    const handleClick = () => {
      if (item.entity_type === 'product' && item.entity_id) {
        navigate(`${APP_VERSION.ROUTES.PRODUCTS}/${item.entity_id}`);
      }
    };

    return (
      <div 
        key={item?.id || Math.random()} 
        className="flex items-center gap-3 px-6 py-3 hover:bg-enterprise-50 cursor-pointer transition-colors"
        onClick={handleClick}
      >
        <div className="h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center">
          {getActivityIcon(item?.action || 'default')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-enterprise-800 truncate">
            {item ? getProductName(item) : "Unknown product"}
          </p>
          <p className="text-xs text-enterprise-500 truncate">
            {item ? formatActivityMessage(item) : "Activity details not available"}
          </p>
        </div>
        <div className="flex items-center text-xs text-enterprise-500 whitespace-nowrap">
          <CalendarClock className="h-3.5 w-3.5 mr-1" />
          {item?.created_at ? getTimeAgo(item.created_at) : "Unknown time"}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white border-enterprise-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm uppercase tracking-wider text-gray-700 dark:text-gray-200">{title}</CardTitle>
        </div>
        {showViewAll && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-enterprise-600 hover:text-enterprise-900"
            disabled={true} // Disable for now
            title="Coming soon"
          >
            <Eye className="h-4 w-4 mr-1" />
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="bg-red-50 p-4 rounded-md mx-4 my-3 border border-red-200">
            <p className="text-red-700 text-sm">Unable to load activity data. Please try again later.</p>
          </div>
        ) : loading ? (
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
        ) : isValidActivities && activities.length > 0 ? (
          <div className="divide-y divide-enterprise-100">
            {activities.slice(0, maxItems).map(renderActivity)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Package className="h-8 w-8 text-enterprise-300 mb-3" />
            <p className="text-enterprise-600 text-sm font-medium">No activity yet – make your first change to see history here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 