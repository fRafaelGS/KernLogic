import React from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  buttonText,
  onButtonClick,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-20">
    <img
      src="/images/empty-team-illustration.svg"
      alt="No team members"
      className="w-48 h-48 mb-6"
    />
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-gray-600 mb-6">{description}</p>
    <Button onClick={onButtonClick}>{buttonText}</Button>
  </div>
); 