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
import { API_URL } from '@/config/config';
import { API_ENDPOINTS } from '@/config';
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
  rolePermissions?: string[];
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string, orgId?: string, token?: string) => Promise<void>;
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

  // Update the normalizeUserData function to fetch role permissions
  const normalizeUserData = (data: any): ExtendedUser => {
    let role: 'admin' | 'editor' | 'viewer' | undefined = undefined
    let rolePermissions: string[] | undefined = undefined

    // Use role from backend if present
    if (data.role) {
      role = data.role
    } else if (data.memberships && data.memberships.length > 0) {
      const membership = data.memberships[0]
      if (membership.role) {
        if (membership.role.name === 'Admin') role = 'admin'
        else if (membership.role.name === 'Editor') role = 'editor'
        else if (membership.role.name === 'Viewer') role = 'viewer'
        if (membership.role.permissions && Array.isArray(membership.role.permissions)) {
          rolePermissions = membership.role.permissions
        }
      }
    }
    // Fallback: if no membership role, use is_staff or is_superuser
    if (!role && (data.is_staff || data.is_superuser)) {
      role = 'admin'
      rolePermissions = rolePermissions || ['product.view', 'product.edit', 'product.revert', 'product.delete']
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name || data.username,
      avatar_url: data.avatar_url,
      is_staff: Boolean(data.is_staff),
      role,
      rolePermissions,
      organization_id: data.organization_id 
        ?? data.organization?.id 
        ?? data.profile?.organization?.id 
        ?? (data.organizations && data.organizations.length > 0 ? data.organizations[0].id : null)
        ?? (data.memberships && data.memberships.length > 0 && data.memberships[0].organization 
            ? data.memberships[0].organization.id : null)
        ?? null,
    }
  };

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
        
        if (process.env.NODE_ENV === 'development') {
          console.log('All keys on user data:', Object.keys(meRes.data));
          console.log('Data.organizations:', meRes.data.organizations);
          console.log('Data.memberships:', meRes.data.memberships);
        }
        
        if (!meRes.data || (Array.isArray(meRes.data) && meRes.data.length === 0)) {
          console.error('Empty user profile response');
          throw new Error('Failed to retrieve user profile');
        }
        
        // 3) Normalize user data
        const me = normalizeUserData(meRes.data);
        console.log('Normalized user data:', me);

        // Set the user with available data
        setUser(me);

      } catch (err: any) {
        console.error('Auth init error', err);
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          // Only remove the access token on 401, but keep the refresh token
          // The axios interceptor will attempt to refresh the token on subsequent requests
          localStorage.removeItem('access_token');
          delete axiosInstance.defaults.headers.common['Authorization'];
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Add logging for user state changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('User state changed:', {
        isAuthenticated: Boolean(user),
        user: user ? {
          ...user,
          organization_id: user.organization_id || 'Not set'
        } : null,
        loading
      });
    }
  }, [user, loading]);

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
      console.log('API_URL:', API_URL);
      console.log('API_ENDPOINTS.auth.login:', API_ENDPOINTS.auth.login);
      // Fix the double API path by using the token endpoint directly
      // API_ENDPOINTS.auth.login already includes '/api/token/', so we shouldn't prepend API_URL
      const loginUrl = `${API_URL}${API_ENDPOINTS.auth.login}`;
      // Log the URL for debugging
      console.log('loginUrl:', loginUrl);
      console.log('Login attempt for:', email);
      
      // Try both email and username formats to handle different backend configurations
      const loginData = { 
        email, 
        username: email, // Some backends might expect username instead
        password 
      };
      console.log('Sending login request with data:', JSON.stringify(loginData));
      
      // Use axiosInstance instead of fetch to benefit from its baseURL configuration
      // This prevents the double '/api' problem
      const response = await axiosInstance.post(API_ENDPOINTS.auth.login, loginData);
      console.log('Login response:', response);
      
      if (response.status === 200) {
        const data = response.data;
        console.log('Login successful, received data:', data);

        // Update this to handle standard JWT token response
        if (data.access && data.refresh) {
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          
          // Immediately set the Authorization header
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
          
          try {
            // Check if the login response contains user data with organization and role
            if (data.user && typeof data.user === 'object') {
              console.log('Login response includes user data:', data.user);
              
              // If the login response has organization_id and role, use them directly
              if (data.user.organization_id && data.user.role) {
                console.log('Using organization_id and role directly from login response');
                
                const userData = normalizeUserData(data.user);
                setUser({
                  ...userData,
                  organization_id: data.user.organization_id,
                  role: data.user.role.toLowerCase()
                });
                
                toast.success('Logged in successfully!');
                navigate('/app');
                return;
              }
            }
          
            // If user data is not in the login response or is incomplete, fetch the profile
            const userEndpoint = `${API_ENDPOINTS.auth.user}`;
            console.log('Fetching user profile from:', userEndpoint);
            
            const userResponse = await axiosInstance.get(userEndpoint);
            console.log('User profile data:', userResponse.data);
            
            if (process.env.NODE_ENV === 'development') {
              console.log('All keys on user data (login):', Object.keys(userResponse.data));
              console.log('Data.organizations (login):', userResponse.data.organizations);
              console.log('Data.memberships (login):', userResponse.data.memberships);
            }
            
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
                  ? memRes.data.find((m: any) => {
                      // More robust logic to find the user's membership
                      const userIdMatch = m.user?.id === me.id || m.user === me.id;
                      const userEmailMatch = m.user_email === me.email;
                      return userIdMatch || userEmailMatch;
                    })
                  : null;
                
                if (membership) {
                  console.log('Found membership:', membership);
                  
                  // Ensure the organization ID is preserved from the membership
                  const orgId = membership.organization?.id || 
                                (typeof membership.organization === 'string' ? membership.organization : null) ||
                                me.organization_id;
                  
                  // Set user with organization ID and role from membership
                  setUser({
                    ...me,
                    organization_id: orgId,
                    role: membership.role?.name?.toLowerCase() || 'viewer' // Default to viewer if role name is missing
                  });
                } else {
                  console.warn('No matching membership found for user');
                  // Still keep the organization_id we already found
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
      } else {
        throw new Error('Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Enhanced error logging for axios errors
      if (axios.isAxiosError(err)) {
        console.error('Login error status:', err.response?.status);
        console.error('Login error details:', err.response?.data);
        
        const errorData = err.response?.data;
        
        // Handle specific error fields from DRF response
        if (errorData) {
          if (errorData.email) {
            setError({ message: errorData.email, field: 'email' });
          } else if (errorData.password) {
            setError({ message: errorData.password, field: 'password' });
          } else if (errorData.detail) {
            setError({ message: errorData.detail });
          } else if (errorData.error) {
            setError({ message: errorData.error });
          } else if (errorData.non_field_errors) {
            setError({ message: errorData.non_field_errors });
          } else {
            setError({ message: `Login failed with status ${err.response?.status}` });
          }
        } else {
          setError({ message: 'Login failed. Please try again.' });
        }
      } else {
        // Handle non-axios errors
        setError({ message: err.message || 'Login failed' });
      }
      
      toast.error(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ─── register ─── */
  const register = async (email: string, password: string, name: string, orgId?: string, token?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Prepare the registration data
      const registrationData: any = { email, password, name, password_confirm: password };
      
      // Include organization ID and token if provided (for invited users)
      if (orgId) {
        console.log(`Registering with organization ID: ${orgId}`);
        registrationData.organization_id = orgId;
      }
      
      if (token) {
        registrationData.invitation_token = token;
      }
      
      // Log the registration data before sending
      console.log("Sending registration data:", JSON.stringify(registrationData));
      
      // Use axiosInstance with the correct endpoint to avoid double API path
      console.log("Register endpoint:", API_ENDPOINTS.auth.register);
      
      const response = await axiosInstance.post(API_ENDPOINTS.auth.register, registrationData);
      
      console.log("Registration response:", response.data);
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
      console.error('Registration error:', err);
      
      // Enhanced error logging for API validation errors
      if (axios.isAxiosError(err) && err.response) {
        console.error('Server response status:', err.response.status);
        console.error('Server response data:', err.response.data);
        
        // Display specific field errors if available
        if (err.response.data && typeof err.response.data === 'object') {
          const errorData = err.response.data;
          let errorMessage = 'Registration failed: ';
          
          // Handle nested error objects or arrays
          Object.keys(errorData).forEach(key => {
            const value = errorData[key];
            if (Array.isArray(value)) {
              errorMessage += `${key}: ${value.join(', ')}. `;
            } else if (typeof value === 'object' && value !== null) {
              errorMessage += `${key}: ${JSON.stringify(value)}. `;
            } else {
              errorMessage += `${key}: ${value}. `;
            }
          });
          
          setError({ message: errorMessage });
          toast.error(errorMessage);
          throw err;
        }
      }
      
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

  // Check if user has permission
  const checkPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin or staff always has all permissions
    if (user.is_staff) return true;
    
    // Check direct permissions array if available
    if (user.rolePermissions && Array.isArray(user.rolePermissions)) {
      return user.rolePermissions.includes(permission);
    }
    
    // Fallback to role-based checking if permissions array not available
    if (user.role === 'admin') return true;
    
    if (user.role === 'editor') {
      return ['product.view', 'product.add', 'product.change', 'dashboard.view'].includes(permission);
    }
    
    if (user.role === 'viewer') {
      return ['product.view', 'team.view', 'dashboard.view'].includes(permission);
    }
    
    return false;
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
          window.location.href = `/accept-invite/${pendingInvite.membershipId}`;
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
