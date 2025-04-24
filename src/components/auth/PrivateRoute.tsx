import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PrivateRouteProps {
    children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    // Authentication check temporarily disabled
    // if (!isAuthenticated) {
    //     return <Navigate to="/login" replace />;
    // }

    // Always render children regardless of authentication status
    return <>{children}</>;
}; 