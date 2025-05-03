import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { API_URL, API_ENDPOINTS } from '@/config';
import { v4 as uuidv4 } from 'uuid';
import axiosInstance from '@/lib/axiosInstance';
import { User, InvitationToken } from '@/types/team';

/* ──────────────────── types ──────────────────── */
interface AuthError {
  message: string;
  field?: string;
}

// --- Notification Types ---
export interface Notification {
  id: string;
  message: string;
  description?: string;
  timestamp: Date;
  read: boolean;
  type: 'info' | 'success' | 'error' | 'warning';
}

// Define an extended user type that includes role
interface ExtendedUser extends User {
  role?: 'admin' | 'editor' | 'viewer';
  is_staff?: boolean;
  organization_id?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  // --- Notification State and Functions ---
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllAsRead: () => void;
  updateUserContext: (updatedUserData: Partial<ExtendedUser>) => void;
  checkPermission: (permission: string) => boolean;
  checkPendingInvitation: () => void;
}

/* ──────────────────── React context ──────────────────── */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permission mappings based on roles
const rolePermissions = {
  admin: ['product.view', 'product.edit', 'product.revert', 'product.delete'],
  editor: ['product.view', 'product.edit'],
  viewer: ['product.view']
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  // --- Notification State ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const navigate = useNavigate();

  // Update the normalizeUserData function to not use default org ID
  const normalizeUserData = (data: any): ExtendedUser => ({
    id: data.id,
    email: data.email,
    name: data.name || data.username,
    avatar_url: data.avatar_url,
    is_staff: Boolean(data.is_staff),
    // Extract organization ID from the response - this path may need adjustment
    organization_id: data.profile?.organization?.id,
  });

  // Update auth flow to use async IIFE and proper token handling
  useEffect(() => {
    (async () => {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // 1) Set Authorization header
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      try {
        console.log('Fetching user profile from:', `${API_URL}${API_ENDPOINTS.auth.user}`);
        
        // 2) Fetch user profile
        const meRes = await axiosInstance.get(API_ENDPOINTS.auth.user);
        console.log('User profile response:', meRes.data);
        
        if (!meRes.data || (Array.isArray(meRes.data) && meRes.data.length === 0)) {
          console.error('Empty user profile response');
          throw new Error('Failed to retrieve user profile');
        }
        
        const me = normalizeUserData(meRes.data);
        console.log('Normalized user data:', me);

        // 3) If we have an org ID, fetch memberships to determine role
        if (me.id && me.organization_id) {
          try {
            console.log(`Fetching memberships from: ${API_URL}${API_ENDPOINTS.orgs.memberships(me.organization_id)}`);
            
            const memRes = await axiosInstance.get(
              API_ENDPOINTS.orgs.memberships(me.organization_id)
            );
            console.log('Memberships response:', memRes.data);
            
            const membership = Array.isArray(memRes.data) 
              ? memRes.data.find((m: any) => m.user?.id === me.id || m.user === me.id)
              : null;
            
            if (membership) {
              console.log('Found membership with role:', membership.role);
              
              // 4) Set user with role from membership
              setUser({
                ...me,
                role: membership.role?.name?.toLowerCase(),
              });
            } else {
              console.warn('No matching membership found for user');
              setUser(me);
            }
          } catch (membershipError) {
            console.error('Error fetching memberships:', membershipError);
            setUser(me);
          }
        } else {
          console.warn('No organization ID found in user profile');
          setUser(me);
        }
      } catch (err: any) {
        console.error('Auth init error', err);
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          delete axiosInstance.defaults.headers.common['Authorization'];
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- Notification Functions ---
  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: uuidv4(), // Generate unique ID
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Add to start, limit to 50
    setUnreadCount(prev => prev + 1);
    
    // Optionally show a toast as well
    // toast[newNotification.type](newNotification.message, { description: newNotification.description });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Function to update user state locally
  const updateUserContext = useCallback((updatedUserData: Partial<ExtendedUser>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, ...updatedUserData };
    });
  }, []);

  /* ─── login ─── */
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Login attempt for:', email);
      
      // Use the full URL for login - no proxy
      const loginUrl = `${API_URL}${API_ENDPOINTS.auth.login}`; 
      console.log('Login URL:', loginUrl);
      
      // Try both email and username formats to handle different backend configurations
      const loginData = { 
        email, 
        username: email, // Some backends might expect username instead
        password 
      };
      console.log('Sending login request with data:', JSON.stringify(loginData));
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });
      
      console.log('Login response status:', response.status);
      console.log('Login response headers:', JSON.stringify([...response.headers.entries()]));
      
      // Clone the response for potential error handling
      const responseClone = response.clone();
      
      if (!response.ok) {
        let errorData;
        try {
          // Try to parse as JSON first
          errorData = await responseClone.json();
          console.error('Login response error:', errorData);
        } catch (e) {
          // If the response isn't JSON, try text
          console.error('Error parsing response as JSON:', e);
          try {
            const errorText = await response.text();
            console.error('Login response error text:', errorText);
          } catch (textError) {
            console.error('Could not read response text either:', textError);
          }
          throw new Error(`Login failed with status ${response.status}`);
        }
        
        // Handle specific error fields
        if (errorData.email) {
          throw new Error(errorData.email);
        } else if (errorData.password) {
          throw new Error(errorData.password);
        } else if (errorData.detail) {
          throw new Error(errorData.detail);
        } else if (errorData.error) {
          throw new Error(errorData.error);
        } else if (errorData.non_field_errors) {
          throw new Error(errorData.non_field_errors);
        }
        
        throw new Error(`Login failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Login successful, received data:', data);

      // Update this to handle standard JWT token response
      if (data.access && data.refresh) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        
        // Immediately set the Authorization header
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
        
        try {
          // Fetch user profile after successful login
          const userEndpoint = `${API_ENDPOINTS.auth.user}`;
          console.log('Fetching user profile from:', userEndpoint);
          
          const userResponse = await axiosInstance.get(userEndpoint);
          console.log('User profile data:', userResponse.data);
          
          if (!userResponse.data || (Array.isArray(userResponse.data) && userResponse.data.length === 0)) {
            throw new Error('Empty user profile response');
          }
          
          // Normalize user data
          const me = normalizeUserData(userResponse.data);
          console.log('Normalized user data:', me);
          
          // If we have an org ID, fetch memberships to determine role
          if (me.id && me.organization_id) {
            try {
              const membershipsEndpoint = API_ENDPOINTS.orgs.memberships(me.organization_id);
              console.log('Fetching memberships from:', membershipsEndpoint);
              
              const memRes = await axiosInstance.get(membershipsEndpoint);
              console.log('Memberships response:', memRes.data);
              
              const membership = Array.isArray(memRes.data) 
                ? memRes.data.find((m: any) => m.user?.id === me.id || m.user === me.id)
                : null;
              
              if (membership) {
                console.log('Found membership with role:', membership.role);
                
                // Set user with role
                setUser({
                  ...me,
                  role: membership.role?.name?.toLowerCase(),
                });
              } else {
                console.warn('No matching membership found for user');
                setUser(me);
              }
            } catch (membershipError) {
              console.error('Error fetching memberships:', membershipError);
              setUser(me);
            }
          } else {
            console.warn('No organization ID found in user profile');
            setUser(me);
          }
          
          // Check for pending invitations after successful login
          checkPendingInvitation();
          
          toast.success('Logged in successfully!');
          navigate('/app');
        } catch (profileError) {
          console.error('Failed to fetch user profile:', profileError);
          toast.error('Logged in but failed to load user profile');
          // Clear tokens if we can't load the profile
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          delete axiosInstance.defaults.headers.common['Authorization'];
          setUser(null);
          throw new Error('Failed to load user profile');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Enhanced error logging
      if (err.response) {
        console.error('Login error status:', err.response.status);
        console.error('Login error details:', err.response);
      }
      
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Login failed';
      setError({ message: msg });
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ─── register ─── */
  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      // Use shared axiosInstance for registration
      // Path is relative to axiosInstance baseURL ('/api')
      const response = await axiosInstance.post('/accounts/register/', { email, password, name });
      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Immediately set the Authorization header
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      // Normalize user data
      const normalizedUser = normalizeUserData(userData);
      setUser(normalizedUser);
      
      toast.success('Registered!');
      navigate('/app');
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Registration failed';
      setError({ message: msg });
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ─── logout ─── */
  const logout = () => {
    console.log('Logout called');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    // Clear Axios header
    delete axiosInstance.defaults.headers.common['Authorization']; 
    navigate('/login');
    toast.info("You have been logged out.");
  };

  // Check if user has permission - simplified
  const checkPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin or staff always has all permissions
    if (user.is_staff || user.role === 'admin') return true;
    
    // Get permissions based on role
    const userRole = user.role;
    if (!userRole) return false;
    
    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(permission);
  };
  
  // Check for pending invitations
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

  const value = {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user), // Simplified isAuthenticated
    login,
    logout,
    register,
    // --- Provide notification state and functions ---
    notifications,
    unreadCount,
    addNotification,
    markAllAsRead,
    updateUserContext,
    checkPermission,
    checkPendingInvitation
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ───────── custom hook ───────── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
