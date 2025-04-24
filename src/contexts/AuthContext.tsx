import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { API_URL, API_AUTH_URL, API_ENDPOINTS } from '@/config';

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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

/* ──────────────────── axios instance ──────────────────── */
const api = axios.create({
  baseURL: API_AUTH_URL,
  headers: { 'Content-Type': 'application/json' },
});

/* ───── token-refresh interceptor ───── */
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as any;
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');

        console.log('Attempting to refresh token...');
        
        // Fix URL construction to avoid duplicate /auth path
        const refreshUrl = `${API_URL}/auth${API_ENDPOINTS.auth.refresh}`;
        console.log('Using refresh URL:', refreshUrl);
        
        // Use fetch instead of axios to avoid sending CSRF token
        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh,
          }),
        });
        
        if (!response.ok) {
          console.error('Token refresh failed:', response.status);
          throw new Error(`Token refresh failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Token refresh successful');
        
        localStorage.setItem('access_token', data.access);

        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

/* ───── auth-header interceptor ───── */
api.interceptors.request.use((cfg) => {
  const tk = localStorage.getItem('access_token');
  if (tk) cfg.headers.Authorization = `Bearer ${tk}`;
  return cfg;
});

/* ──────────────────── React context ──────────────────── */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const navigate = useNavigate();

  /* ─── on mount: validate token ─── */
  useEffect(() => {
    console.log('AuthContext mounted, checking authentication');
    
    // First check for an existing token
    const existingToken = localStorage.getItem('access_token');
    if (existingToken) {
      console.log('Found existing token, validating...');
      // Attempt to validate the token by fetching user data
      fetch(`${API_URL}/auth/user/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${existingToken}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          console.log('Token invalid, attempting test login instead');
          throw new Error('Token validation failed');
        }
      })
      .then(userData => {
        console.log('Token valid, user data:', userData);
        setUser(userData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error validating token:', error);
        // Token validation failed, try test login as fallback
        tryTestLogin();
      });
    } else {
      // No token, try test login
      tryTestLogin();
    }
    
    function tryTestLogin() {
      // Use test-login endpoint as a fallback
      console.log('Attempting test login');
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

  /* ─── login ─── */
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Login attempt for:', email);
      
      // Fix URL construction to avoid duplicate /auth path
      const loginUrl = `${API_URL}/auth${API_ENDPOINTS.auth.login}`;
      console.log('Fixed login URL:', loginUrl);
      
      // Make login request with fetch instead of axios
      const loginData = { email, password };
      console.log('Sending login data:', JSON.stringify(loginData));
      
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
      const { data } = await api.post(API_ENDPOINTS.auth.register, { email, password, name });
      const { access, refresh, user: userData } = data;

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
    console.log('Logout called - authentication bypass is active');
    // Original logout functionality (commented out)
    /*
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/login');
    */
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ───────── custom hook ───────── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
