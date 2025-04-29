import React from 'react';
import { cn } from '@/lib/utils';

type TimelineDotProps = {
  type: string;
  className?: string;
};

const TimelineDot: React.FC<TimelineDotProps> = ({ type, className }) => {
  // Map event types to color classes
  const getColorClass = (eventType: string): string => {
    const typeMap: Record<string, string> = {
      // Creation events
      created: 'bg-green-500 dark:bg-green-600',
      
      // Modification events
      updated: 'bg-blue-500 dark:bg-blue-600',
      edited: 'bg-blue-500 dark:bg-blue-600',
      price_changed: 'bg-blue-500 dark:bg-blue-600',
      stock_changed: 'bg-blue-500 dark:bg-blue-600',
      category_changed: 'bg-blue-500 dark:bg-blue-600',
      description_changed: 'bg-blue-500 dark:bg-blue-600',
      
      // Status changes
      activated: 'bg-green-500 dark:bg-green-600',
      deactivated: 'bg-amber-500 dark:bg-amber-600',
      
      // Asset events
      asset_added: 'bg-purple-500 dark:bg-purple-600',
      asset_removed: 'bg-purple-500 dark:bg-purple-600',
      
      // Deletion events
      deleted: 'bg-red-500 dark:bg-red-600',
    };
    
    // Default to gray if type is not recognized
    return typeMap[eventType.toLowerCase()] || 'bg-gray-500 dark:bg-gray-600';
  };

  return (
    <div 
      className={cn(
        "w-4 h-4 rounded-full flex-shrink-0 mt-1",
        getColorClass(type),
        className
      )}
      aria-hidden="true"
    />
  );
};

export default TimelineDot; 