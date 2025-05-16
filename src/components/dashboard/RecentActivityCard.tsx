import React from 'react'
import { Activity } from '@/services/dashboardService'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarClock } from 'lucide-react'

interface RecentActivityCardProps {
  activities: Activity[] | null
  loading: boolean
  maxItems?: number
}

// formatActivityMessage and getProductName helpers moved here since ActivityFeed.tsx is deleted

const getProductName = (activity: Activity): string => {
  const patterns = [
    /Created product '([^']+)'/,  // Created product '44411'
    /Updated product '([^']+)'/,  // Updated product '44411'
    /Deleted product '([^']+)'/,  // Deleted product '44411'
    /Archived product '([^']+)'/,  // Archived product '44411'
    /product "([^"]+)",?/,        // product "Name"
    /Product "([^"]+)",?/,        // Product "Name"
    /added product ([^"]+)/,      // added product Name
    /updated product ([^"]+)/,    // updated product Name
    /deleted product ([^"]+)/,    // deleted product Name
    /archived product ([^"]+)/,   // archived product Name
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

const formatActivityMessage = (activity: Activity): string => {
  const userName = activity.user_name || 'A user';
  const actionText = {
    'create': 'created',
    'update': 'updated',
    'delete': 'archived',
    'archived': 'archived'
  }[activity.action] || 'modified';
  return `${userName} ${actionText} this product`;
};

export function RecentActivityCard({ activities, loading, maxItems = 10 }: RecentActivityCardProps) {
  const isValidActivities = Array.isArray(activities)

  // Helper for time ago
  const getTimeAgo = (date: string) => {
    const now = new Date()
    const pastDate = new Date(date)
    const diff = now.getTime() - pastDate.getTime()
    const minutes = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  return (
    <Card className='bg-white border-enterprise-200 shadow-sm h-full'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200'>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        {loading ? (
          <div className='space-y-3 p-6'>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className='flex items-center gap-3'>
                <Skeleton className='h-9 w-9 rounded-full' />
                <div className='space-y-2 flex-1'>
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-3 w-4/5' />
                </div>
              </div>
            ))}
          </div>
        ) : isValidActivities && activities.length > 0 ? (
          <div className='divide-y divide-enterprise-100'>
            {activities.slice(0, maxItems).map(item => (
              <div
                key={item?.id || Math.random()}
                className='flex items-center gap-3 px-6 py-3'
              >
                <div className='flex-1 min-w-0'>
                  <span
                    className='text-sm font-medium text-enterprise-800 truncate block'
                    aria-label={`Product ${getProductName(item)}`}
                  >
                    {getProductName(item)}
                  </span>
                  <div className='text-xs text-enterprise-500 truncate'>
                    {formatActivityMessage(item)}
                  </div>
                </div>
                <div className='flex items-center text-xs text-enterprise-500 whitespace-nowrap'>
                  <CalendarClock className='h-3.5 w-3.5 mr-1' />
                  {item?.created_at ? getTimeAgo(item.created_at) : 'Unknown time'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-8'>
            <p className='text-enterprise-700 font-medium'>No recent activity found.</p>
            <p className='text-enterprise-500 text-sm'>No events to display</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 