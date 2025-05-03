import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarBadgeProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({ 
  src, 
  name = 'User',
  size = 'md' 
}) => {
  // Get initials safely - handle null/undefined
  const getInitials = (name: string) => {
    if (!name) return 'U';
    
    // Split the name by spaces and get the first letter of each part
    const parts = name.split(' ');
    if (parts.length === 1) {
      return name.charAt(0).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Determine size class
  const sizeClass = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  }[size];

  return (
    <Avatar className={sizeClass}>
      {src && <AvatarImage src={src} alt={name || 'User avatar'} />}
      <AvatarFallback>
        {getInitials(name || '')}
      </AvatarFallback>
    </Avatar>
  );
};

export default AvatarBadge; 