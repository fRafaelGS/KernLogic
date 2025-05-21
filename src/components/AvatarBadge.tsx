import React, { forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/domains/core/components/ui/avatar';
import { nameToInitials } from '@/lib/utils';

export interface AvatarBadgeProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

// Generate a consistent color based on the user's name
const getColorFromName = (name: string): string => {
  // Color options - tailwind colors
  const colors = [
    'bg-red-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 
    'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-green-500', 
    'bg-yellow-500', 'bg-orange-500', 'bg-amber-500'
  ];
  
  // Calculate a hash value from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const AvatarBadge = forwardRef<HTMLDivElement, AvatarBadgeProps>(({ 
  src, 
  name, 
  size = 'md',
  status 
}, ref) => {
  // Determine avatar size
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14'
  };

  // Determine status indicator color
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };

  // Get initials if no image
  const initials = nameToInitials(name);
  
  // Get background color for user without avatar
  const bgColor = getColorFromName(name);
  const textColor = 'text-white'; // White text on colored backgrounds

  return (
    <div className="relative" ref={ref}>
      <Avatar className={`${sizeClasses[size]} rounded-full bg-primary/10`}>
        {src ? (
          <AvatarImage src={src} alt={name} />
        ) : null}
        <AvatarFallback className={`${src ? 'bg-primary/10 text-primary' : `${bgColor} ${textColor}`} font-medium`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {status && (
        <span 
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${statusColors[status]}`}
          style={{ 
            width: size === 'lg' ? '12px' : '8px', 
            height: size === 'lg' ? '12px' : '8px'
          }}
        />
      )}
    </div>
  );
});

AvatarBadge.displayName = 'AvatarBadge';

export default AvatarBadge; 