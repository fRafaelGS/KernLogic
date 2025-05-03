import React from 'react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { RoleBadge } from './RoleBadge';

interface RoleDescriptionTooltipProps {
  roleName: string;
  description: string;
}

export const RoleDescriptionTooltip: React.FC<RoleDescriptionTooltipProps> = ({ 
  roleName, 
  description 
}) => {
  // If no description, just render the badge without tooltip
  if (!description) {
    return <RoleBadge role={roleName} />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <RoleBadge role={roleName} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm max-w-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RoleDescriptionTooltip; 