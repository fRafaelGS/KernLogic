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
  // Add markAsRead if needed later
}

/* ──────────────────── React context ──────────────────── */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      // Path is relative to axiosInstance baseURL ('/api')
      axiosInstance.get('/auth/user/') 
        .then(response => {
          console.log('Token valid, user data:', response.data);
          setUser(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error validating token:', error);
          // Attempting refresh is handled by the interceptor, 
          // but if it ultimately fails, it redirects. 
          // If the request fails for non-401 reasons, try test login?
          if (!axios.isAxiosError(error) || error.response?.status !== 401) {
             console.log('Non-401 error validating token, trying test login.');
             tryTestLogin(); 
          } else {
             // Let the interceptor handle redirect on final 401
             setLoading(false); // Stop loading if validation fails and redirect happens
          }
        });
    } else {
      // No token, try test login
      console.log('No existing token, attempting test login.');
      tryTestLogin();
    }
    
    function tryTestLogin() {
      // Use test-login endpoint as a fallback
      // Use fetch as it doesn't need auth header
      const testLoginUrl = `${API_URL}/auth/test-login/`;
      console.log('Using test login URL:', testLoginUrl);
      
      fetch(testLoginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => {
        if (!response.ok) {
          console.error('Test login failed:', response.status);
          throw new Error(`Test login failed: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Test login successful:', data);
        
        if (data.access && data.refresh && data.user) {
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          setUser(data.user);
          console.log('Test login successful, token saved');
        }
      })
      .catch(error => {
        console.error('Error during test login:', error);
      })
      .finally(() => {
        setLoading(false);
      });
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
      // URL needs full path from domain root
      const loginUrl = `${API_URL}/auth/login/`; 
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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login response error:', errorText);
        throw new Error(`Login failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Login successful, received data:', data);

      if (!data?.user) throw new Error('Malformed response');
      const { access, refresh, user: userData } = data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(userData);
      toast.success('Logged in!');
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
      const response = await axiosInstance.post('/auth/register/', { email, password, name });
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ───────── custom hook ───────── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
