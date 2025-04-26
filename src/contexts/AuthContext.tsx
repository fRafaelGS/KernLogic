import {
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
import { API_URL, API_AUTH_URL, API_ENDPOINTS } from '@/config';
import { v4 as uuidv4 } from 'uuid';
import axiosInstance from '@/lib/axiosInstance';

/* ──────────────────── types ──────────────────── */
interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role: 'admin' | 'editor' | 'viewer';
}

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

interface AuthContextType {
  user: User | null;
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
  updateUserContext: (updatedUserData: Partial<User>) => void;
  checkPermission: (permission: string) => boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  // --- Notification State ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const navigate = useNavigate();

  /* ─── on mount: validate token ─── */
  useEffect(() => {
    console.log('AuthContext mounted, checking authentication');
    const existingToken = localStorage.getItem('access_token');
    
    if (existingToken) {
      console.log('Found existing token, validating...');
      // Use shared axiosInstance for the user validation call
      axiosInstance.get('/auth/user/') 
        .then(response => {
          console.log('Token valid, user data:', response.data);
          setUser(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error validating token:', error);
          // Just set loading to false to allow manual login
          setLoading(false);
          // Clear tokens if we got a 401 Unauthorized
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            console.log('Token invalid (401), clearing local storage');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        });
    } else {
      // No token, just set loading to false
      console.log('No existing token, user needs to log in manually');
      setLoading(false);
    }
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
  const updateUserContext = useCallback((updatedUserData: Partial<User>) => {
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
      
      // Use fetch for login as it doesn't need prior auth
      const loginUrl = `/api/auth/login/`; 
      console.log('Login URL:', loginUrl);
      
      const loginData = { email, password };
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });
      
      console.log('Login response status:', response.status);
      
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
        } else if (errorData.error) {
          throw new Error(errorData.error);
        } else if (errorData.non_field_errors) {
          throw new Error(errorData.non_field_errors);
        }
        
        throw new Error(`Login failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Login successful, received data:', data);

      if (!data?.user) throw new Error('Malformed response: missing user data');
      const { access, refresh } = data.tokens;
      const userData = data.user;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(userData);
      toast.success('Logged in successfully!');
      navigate('/app');
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
      setUser(userData);
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
    // Clear Axios default headers if they were ever set (though we removed the explicit setting)
    delete axiosInstance.defaults.headers.common['Authorization']; 
    navigate('/login');
    toast.info("You have been logged out.");
  };

  // Check if user has permission
  const checkPermission = (permission: string): boolean => {
    if (!user) return false;
    
    const userRole = user.role;
    const permissions = rolePermissions[userRole] || [];
    
    return permissions.includes(permission);
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ───────── custom hook ───────── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
