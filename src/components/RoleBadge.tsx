import React from 'react';

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-blue-100 text-blue-800',
  Editor: 'bg-green-100 text-green-800',
  Viewer: 'bg-gray-100 text-gray-800',
  // add more roles here
};

interface RoleBadgeProps {
  role: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const classes = ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';
  return (
    <span
      className={`${classes} px-2 py-1 rounded-full text-sm font-medium`}
    >
      {role}
    </span>
  );
}; 