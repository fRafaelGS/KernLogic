import React, { ReactNode } from 'react';
import { Button } from '@/domains/core/components/ui/button';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  buttonText: string;
  buttonIcon?: ReactNode;
  onButtonClick: () => void;
  icon?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  buttonText,
  buttonIcon,
  onButtonClick,
  icon = <Inbox className="h-12 w-12 text-gray-400" />,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-20">
    <div className="mb-6">
      {icon}
    </div>
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-gray-600 mb-6">{description}</p>
    <Button onClick={onButtonClick} className="flex items-center">
      {buttonIcon}
      {buttonText}
    </Button>
  </div>
); 