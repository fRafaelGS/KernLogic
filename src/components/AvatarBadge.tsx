import React, { forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { nameToInitials } from '@/lib/utils';

export interface AvatarBadgeProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

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

  return (
    <div className="relative" ref={ref}>
      <Avatar className={`${sizeClasses[size]} rounded-full bg-primary/10`}>
        {src ? (
          <AvatarImage src={src} alt={name} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
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