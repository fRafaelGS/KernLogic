import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/services/api';
import { User, InvitationToken } from '@/types/team';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkPendingInvitation: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        try {
          // Verify token and get user data
          const response = await api.get('/api/users/me/');
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          // Token might be invalid
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const response = await api.post('/api/token/', { email, password });
      
      const { access, refresh } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Get user details
      const userResponse = await api.get('/api/users/me/');
      setUser(userResponse.data);
      setIsAuthenticated(true);
      
      // Check for pending invitations
      checkPendingInvitation();
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };
  
  const checkPendingInvitation = () => {
    const pendingInviteStr = sessionStorage.getItem('pendingInvitation');
    
    if (pendingInviteStr) {
      try {
        const pendingInvite: InvitationToken = JSON.parse(pendingInviteStr);
        
        // Clear the stored invitation
        sessionStorage.removeItem('pendingInvitation');
        
        // Redirect to the accept invitation page
        if (pendingInvite.membershipId && pendingInvite.token) {
          window.location.href = `/accept-invite/${pendingInvite.membershipId}/${pendingInvite.token}`;
        }
      } catch (error) {
        console.error('Error processing pending invitation:', error);
      }
    }
  };
  
  // Check for pending invitation on initial load
  useEffect(() => {
    if (isAuthenticated) {
      checkPendingInvitation();
    }
  }, [isAuthenticated]);

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    checkPendingInvitation
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 