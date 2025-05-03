import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A component that conditionally renders its children based on user permissions.
 * 
 * @param permission - The permission string required to view the content
 * @param children - The content to render if the user has the permission
 * @param fallback - Optional content to render if the user doesn't have the permission
 */
export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
  const { checkPermission } = useAuth();
  
  const hasPermission = checkPermission(permission);
  
  if (!hasPermission) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}

/**
 * A higher-order component (HOC) that wraps a component with permission checking.
 * 
 * @param Component - The component to wrap
 * @param permission - The permission string required to render the component
 * @param fallback - Optional component to render if the user doesn't have the permission
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  FallbackComponent?: React.ComponentType<P>
) {
  return function PermissionWrapped(props: P) {
    return (
      <PermissionGuard
        permission={permission}
        fallback={FallbackComponent ? <FallbackComponent {...props} /> : null}
      >
        <Component {...props} />
      </PermissionGuard>
    );
  };
} 